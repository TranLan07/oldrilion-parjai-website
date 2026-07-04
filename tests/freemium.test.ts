import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, prismaMock } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  prismaMock: {
    clan: { findUnique: vi.fn() },
    user: { findMany: vi.fn() },
    channel: { findMany: vi.fn() },
    specialization: { findMany: vi.fn() },
  },
}));
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { GET as channelsGET } from "../src/app/api/clan/[slug]/channels/route";
import { GET as specsGET } from "../src/app/api/clan/[slug]/specializations/route";

const params = () => ({ params: Promise.resolve({ slug: "parjai" }) });
const clanBase = { id: "c1", slug: "parjai", suspended: false };

beforeEach(() => {
  mockAuth.mockReset();
  Object.values(prismaMock).forEach(m => Object.values(m).forEach(fn => fn.mockReset()));
  prismaMock.user.findMany.mockResolvedValue([]);
  prismaMock.channel.findMany.mockResolvedValue([]);
  prismaMock.specialization.findMany.mockResolvedValue([]);
  mockAuth.mockResolvedValue({ user: { id: "u1" } });
});

describe("Freemium — canaux (clan free limité à 1 canal)", () => {
  it("clan free : la requête channels est plafonnée à take: 1", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ ...clanBase, premium: false });
    await channelsGET(new NextRequest("http://localhost"), params());
    const arg = prismaMock.channel.findMany.mock.calls[0][0];
    expect(arg.take).toBe(1);
  });

  it("clan premium : aucune limite (pas de take)", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ ...clanBase, premium: true });
    await channelsGET(new NextRequest("http://localhost"), params());
    const arg = prismaMock.channel.findMany.mock.calls[0][0];
    expect(arg.take).toBeUndefined();
  });
});

describe("Freemium — spécialisations", () => {
  it("clan free : les spécialisations secrètes sont filtrées (secret: false)", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ ...clanBase, premium: false });
    await specsGET(new NextRequest("http://localhost"), params());
    const arg = prismaMock.specialization.findMany.mock.calls[0][0];
    expect(arg.where.secret).toBe(false);
  });

  it("clan premium : les spécialisations secrètes sont incluses", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ ...clanBase, premium: true });
    await specsGET(new NextRequest("http://localhost"), params());
    const arg = prismaMock.specialization.findMany.mock.calls[0][0];
    expect(arg.where.secret).toBeUndefined();
  });

  it("clan free : la couleur custom est masquée (null) sans être supprimée", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ ...clanBase, premium: false });
    prismaMock.specialization.findMany.mockResolvedValue([{ id: "s1", name: "Goran", color: "#ff0000", secret: false }]);
    const res = await specsGET(new NextRequest("http://localhost"), params());
    const data = await res.json();
    expect(data[0].color).toBeNull();
    expect(data[0].name).toBe("Goran"); // la donnée existe toujours
  });

  it("clan premium : la couleur custom est conservée", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ ...clanBase, premium: true });
    prismaMock.specialization.findMany.mockResolvedValue([{ id: "s1", name: "Goran", color: "#ff0000", secret: false }]);
    const res = await specsGET(new NextRequest("http://localhost"), params());
    const data = await res.json();
    expect(data[0].color).toBe("#ff0000");
  });
});

describe("Freemium — réversibilité au toggle premium", () => {
  it("le passage free → premium lève immédiatement la limite de canaux", async () => {
    // free
    prismaMock.clan.findUnique.mockResolvedValueOnce({ ...clanBase, premium: false });
    await channelsGET(new NextRequest("http://localhost"), params());
    expect(prismaMock.channel.findMany.mock.calls[0][0].take).toBe(1);
    // premium (même clan, toggle)
    prismaMock.clan.findUnique.mockResolvedValueOnce({ ...clanBase, premium: true });
    await channelsGET(new NextRequest("http://localhost"), params());
    expect(prismaMock.channel.findMany.mock.calls[1][0].take).toBeUndefined();
  });
});
