import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, prismaMock } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  prismaMock: {
    clan: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    recruitment: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    recruitmentField: { findMany: vi.fn() },
    specialization: { findMany: vi.fn() },
    channel: { findFirst: vi.fn() },
    channelMember: { create: vi.fn(), upsert: vi.fn() },
    notification: { create: vi.fn() },
  },
}));
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("../src/lib/public-id", () => ({ generatePublicId: async () => "ABCDEF" }));
vi.mock("bcryptjs", () => ({ hashSync: () => "hashed" }));

import { PUT as approvePUT } from "../src/app/api/clan/[slug]/admin/recruitment/route";
import { POST as submitPOST } from "../src/app/api/clan/[slug]/recruitment/route";
import { POST as leavePOST } from "../src/app/api/profil/leave-clan/route";

const params = () => ({ params: Promise.resolve({ slug: "parjai" }) });
function jsonReq(method: string, body: object) {
  return new NextRequest("http://localhost/x", { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  mockAuth.mockReset();
  Object.values(prismaMock).forEach(m => Object.values(m).forEach(fn => fn.mockReset()));
  prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", name: "Parjai", suspended: false, premium: false });
  prismaMock.user.update.mockImplementation(async (a: { where: object; data: object }) => ({ id: "u1", username: "vhon", ...a.data }));
  prismaMock.user.create.mockImplementation(async (a: { data: object }) => ({ id: "new1", ...a.data }));
  prismaMock.recruitment.update.mockResolvedValue({});
  prismaMock.channel.findFirst.mockResolvedValue({ id: "ch1" });
  prismaMock.channelMember.upsert.mockResolvedValue({});
  prismaMock.channelMember.create.mockResolvedValue({});
  prismaMock.notification.create.mockResolvedValue({});
  mockAuth.mockResolvedValue({ user: { id: "admin1" }, hubRole: "admin", clanSlug: "parjai", permissionLevel: 10 });
});

describe("Approbation — candidat avec compte existant (sans-clan)", () => {
  it("rattache le compte au clan sans en créer un nouveau, et le passe mandalorien", async () => {
    prismaMock.recruitment.findUnique.mockResolvedValue({ id: "r1", status: "pending", rpName: "Vhon", specialization: "Kyramud", applicantId: "u1" });
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", username: "vhon", displayName: "Vhon", clanId: null, mandalorien: false });

    const res = await approvePUT(jsonReq("PUT", { id: "r1", action: "approve" }), params());
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.existingAccount).toBe(true);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    const data = prismaMock.user.update.mock.calls[0][0].data;
    expect(data.clanId).toBe("c1");
    expect(data.mandalorien).toBe(true);
    expect(data.permissionLevel).toBe(1);
  });

  it("refuse d'accepter un candidat qui appartient déjà à un clan", async () => {
    prismaMock.recruitment.findUnique.mockResolvedValue({ id: "r1", status: "pending", rpName: "Vhon", specialization: "", applicantId: "u1" });
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", username: "vhon", clanId: "autre", mandalorien: true });

    const res = await approvePUT(jsonReq("PUT", { id: "r1", action: "approve" }), params());
    expect(res.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});

describe("Approbation — candidat sans compte", () => {
  it("crée un nouveau compte avec mot de passe temporaire", async () => {
    prismaMock.recruitment.findUnique.mockResolvedValue({ id: "r1", status: "pending", rpName: "Nouveau", specialization: "Goran", applicantId: null });

    const res = await approvePUT(jsonReq("PUT", { id: "r1", action: "approve" }), params());
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.tempPassword).toBeTruthy();
    expect(prismaMock.user.create).toHaveBeenCalled();
    expect(prismaMock.user.create.mock.calls[0][0].data.clanId).toBe("c1");
  });

  it("refuse une candidature déjà approuvée", async () => {
    prismaMock.recruitment.findUnique.mockResolvedValue({ id: "r1", status: "approved", applicantId: null });
    const res = await approvePUT(jsonReq("PUT", { id: "r1", action: "approve" }), params());
    expect(res.status).toBe(400);
  });
});

describe("Soumission publique — capture du compte", () => {
  const base = { rpName: "V", discord: "v#1", experience: "e", motivation: "m" };

  it("bloque un utilisateur connecté déjà membre d'un clan", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", clanId: "c9" });
    const res = await submitPOST(jsonReq("POST", base), params());
    expect(res.status).toBe(400);
    expect(prismaMock.recruitment.create).not.toHaveBeenCalled();
  });

  it("lie la candidature au compte d'un connecté sans-clan", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", clanId: null });
    prismaMock.recruitment.create.mockImplementation(async (a: { data: object }) => ({ id: "r1", ...a.data }));
    const res = await submitPOST(jsonReq("POST", base), params());
    expect(res.status).toBe(200);
    expect(prismaMock.recruitment.create.mock.calls[0][0].data.applicantId).toBe("u1");
  });

  it("candidature anonyme : applicantId null", async () => {
    mockAuth.mockResolvedValue(null);
    prismaMock.recruitment.create.mockImplementation(async (a: { data: object }) => ({ id: "r1", ...a.data }));
    const res = await submitPOST(jsonReq("POST", base), params());
    expect(res.status).toBe(200);
    expect(prismaMock.recruitment.create.mock.calls[0][0].data.applicantId).toBeNull();
  });
});

describe("Quitter le clan", () => {
  it("réinitialise les champs clan de l'utilisateur", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.user.findUnique.mockResolvedValue({ clanId: "c1" });
    const res = await leavePOST();
    expect(res.status).toBe(200);
    const data = prismaMock.user.update.mock.calls[0][0].data;
    expect(data.clanId).toBeNull();
    expect(data.mandalorien).toBe(false);
    expect(data.permissionLevel).toBe(1);
    expect(data.grade).toBe("Recrue");
  });

  it("refuse si l'utilisateur n'a pas de clan", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.user.findUnique.mockResolvedValue({ clanId: null });
    const res = await leavePOST();
    expect(res.status).toBe(400);
  });

  it("refuse un utilisateur non authentifié", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await leavePOST();
    expect(res.status).toBe(401);
  });
});
