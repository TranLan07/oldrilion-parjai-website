import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, prismaMock, getOrCreateMock } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  prismaMock: {
    channel: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
  getOrCreateMock: vi.fn(),
}));
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("../src/lib/dm", () => ({ getOrCreateDmChannel: getOrCreateMock }));

import { GET, POST } from "../src/app/api/dm/route";

function post(body: object) {
  return new NextRequest("http://localhost/api/dm", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  mockAuth.mockReset();
  Object.values(prismaMock).forEach(m => Object.values(m).forEach(fn => fn.mockReset()));
  getOrCreateMock.mockReset();
  mockAuth.mockResolvedValue({ user: { id: "me" } });
});

describe("POST /api/dm — ouvrir une conversation", () => {
  it("refuse sans authentification", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(post({ targetId: "u2" }));
    expect(res.status).toBe(401);
  });

  it("refuse de s'écrire à soi-même", async () => {
    const res = await POST(post({ targetId: "me" }));
    expect(res.status).toBe(400);
  });

  it("refuse un destinataire inexistant", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await POST(post({ targetId: "ghost" }));
    expect(res.status).toBe(404);
  });

  it("renvoie le channelId de la conversation (créée ou existante)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2" });
    getOrCreateMock.mockResolvedValue({ id: "chan1" });
    const res = await POST(post({ targetId: "u2" }));
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.channelId).toBe("chan1");
    expect(getOrCreateMock).toHaveBeenCalledWith("me", "u2");
  });
});

describe("GET /api/dm — liste des discussions", () => {
  it("résout l'autre participant et trie par dernier message", async () => {
    prismaMock.channel.findMany.mockResolvedValue([
      { id: "c1", accessUsers: JSON.stringify(["me", "u2"].sort()), messages: [{ content: "salut", createdAt: "2026-01-01T10:00:00Z", mandoa: false }], _count: { messages: 3 } },
      { id: "c2", accessUsers: JSON.stringify(["me", "u3"].sort()), messages: [{ content: "hey", createdAt: "2026-01-02T10:00:00Z", mandoa: false }], _count: { messages: 1 } },
    ]);
    prismaMock.user.findUnique.mockImplementation(async (a: { where: { id: string } }) => ({
      id: a.where.id, displayName: a.where.id === "u2" ? "Bo" : "Vhon", publicId: "PUB" + a.where.id, anonymous: false, clan: null,
    }));

    const res = await GET();
    const j = await res.json();
    expect(j).toHaveLength(2);
    // c2 (plus récent) en premier
    expect(j[0].channelId).toBe("c2");
    expect(j[0].other.displayName).toBe("Vhon");
    expect(j[1].other.displayName).toBe("Bo");
    expect(j[1].lastMessage.content).toBe("salut");
  });

  it("masque l'identité d'un interlocuteur anonyme", async () => {
    prismaMock.channel.findMany.mockResolvedValue([
      { id: "c1", accessUsers: JSON.stringify(["me", "u2"].sort()), messages: [], _count: { messages: 0 } },
    ]);
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", displayName: "Secret", publicId: "ABCDEF", anonymous: true, clan: null });
    const res = await GET();
    const j = await res.json();
    expect(j[0].other.displayName).toBe("Anonyme [ABCDEF]");
  });

  it("ne montre pas le contenu clair d'un dernier message Mando'a", async () => {
    prismaMock.channel.findMany.mockResolvedValue([
      { id: "c1", accessUsers: JSON.stringify(["me", "u2"].sort()), messages: [{ content: "traduit", createdAt: "2026-01-01T10:00:00Z", mandoa: true }], _count: { messages: 1 } },
    ]);
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", displayName: "Bo", publicId: "P", anonymous: false, clan: null });
    const res = await GET();
    const j = await res.json();
    expect(j[0].lastMessage.content).toContain("Mando'a");
  });
});
