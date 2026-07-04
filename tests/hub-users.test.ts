import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, prismaMock } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  prismaMock: {
    user: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    clan: { findUnique: vi.fn() },
  },
}));
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { PUT, DELETE } from "../src/app/api/hub/admin/users/route";

function req(method: string, body: object) {
  return new NextRequest("http://localhost/api/hub/admin/users", {
    method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
  });
}
const asAdmin = () => mockAuth.mockResolvedValue({ user: { id: "admin1" }, hubRole: "admin" });

beforeEach(() => {
  mockAuth.mockReset();
  Object.values(prismaMock).forEach(m => Object.values(m).forEach(fn => fn.mockReset()));
  prismaMock.user.findUnique.mockResolvedValue({ id: "u1", clanId: null });
  prismaMock.user.update.mockImplementation(async (a: { data: object }) => ({ id: "u1", ...a.data }));
  prismaMock.clan.findUnique.mockResolvedValue({ id: "c1" });
});

describe("PUT /api/hub/admin/users — autorisation", () => {
  it("refuse un modérateur (super admin requis)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "m1" }, hubRole: "moderator" });
    const res = await PUT(req("PUT", { id: "u1", displayName: "X" }));
    expect(res.status).toBe(403);
  });

  it("refuse un non authentifié", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(req("PUT", { id: "u1", displayName: "X" }));
    expect(res.status).toBe(403);
  });

  it("exige un id", async () => {
    asAdmin();
    const res = await PUT(req("PUT", { displayName: "X" }));
    expect(res.status).toBe(400);
  });
});

describe("PUT — modifications de champs", () => {
  beforeEach(asAdmin);

  it("change le nom affiché", async () => {
    await PUT(req("PUT", { id: "u1", displayName: "Nouveau Nom" }));
    expect(prismaMock.user.update.mock.calls[0][0].data.displayName).toBe("Nouveau Nom");
  });

  it("change le rôle hub global", async () => {
    await PUT(req("PUT", { id: "u1", hubRole: "moderator" }));
    expect(prismaMock.user.update.mock.calls[0][0].data.hubRole).toBe("moderator");
  });

  it("rejette un rôle hub invalide (non appliqué)", async () => {
    await PUT(req("PUT", { id: "u1", hubRole: "superuser", displayName: "Z" }));
    expect(prismaMock.user.update.mock.calls[0][0].data.hubRole).toBeUndefined();
  });

  it("change la permission clan", async () => {
    await PUT(req("PUT", { id: "u1", permissionLevel: 7 }));
    expect(prismaMock.user.update.mock.calls[0][0].data.permissionLevel).toBe(7);
  });

  it("empêche une permission négative", async () => {
    await PUT(req("PUT", { id: "u1", permissionLevel: -5 }));
    expect(prismaMock.user.update.mock.calls[0][0].data.permissionLevel).toBe(0);
  });
});

describe("PUT — changement de clan", () => {
  beforeEach(asAdmin);

  it("assigne à un clan : réinitialise grade/spé et rend Mandalorien", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", clanId: null });
    await PUT(req("PUT", { id: "u1", clanId: "c1" }));
    const d = prismaMock.user.update.mock.calls[0][0].data;
    expect(d.clanId).toBe("c1");
    expect(d.grade).toBe("Recrue");
    expect(d.gradeId).toBeNull();
    expect(d.specializationId).toBeNull();
    expect(d.mandalorien).toBe(true);
    expect(d.permissionLevel).toBe(1);
  });

  it("retire du clan : clanId null, non-mandalorien, rôle réinitialisé", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", clanId: "c1" });
    await PUT(req("PUT", { id: "u1", clanId: null }));
    const d = prismaMock.user.update.mock.calls[0][0].data;
    expect(d.clanId).toBeNull();
    expect(d.mandalorien).toBe(false);
    expect(d.role).toBe("membre");
  });

  it("rejette un clan inexistant (400)", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(null);
    const res = await PUT(req("PUT", { id: "u1", clanId: "inconnu" }));
    expect(res.status).toBe(400);
  });

  it("ne réinitialise rien si le clan ne change pas", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", clanId: "c1" });
    await PUT(req("PUT", { id: "u1", clanId: "c1", permissionLevel: 5 }));
    const d = prismaMock.user.update.mock.calls[0][0].data;
    expect(d.clanId).toBeUndefined();
    expect(d.grade).toBeUndefined();
    expect(d.permissionLevel).toBe(5);
  });
});

describe("PUT — reset mot de passe", () => {
  beforeEach(asAdmin);

  it("génère un mot de passe renvoyé à l'admin + force le changement", async () => {
    const res = await PUT(req("PUT", { id: "u1", resetPassword: true }));
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(typeof j.tempPassword).toBe("string");
    expect(j.tempPassword.length).toBeGreaterThanOrEqual(8);
    const d = prismaMock.user.update.mock.calls[0][0].data;
    expect(d.passwordHash).toBeTruthy();
    expect(d.mustChangePassword).toBe(true);
  });

  it("le hash n'est jamais le mot de passe en clair", async () => {
    const res = await PUT(req("PUT", { id: "u1", resetPassword: true }));
    const j = await res.json();
    const d = prismaMock.user.update.mock.calls[0][0].data as { passwordHash: string };
    expect(d.passwordHash).not.toBe(j.tempPassword);
  });
});

describe("DELETE /api/hub/admin/users", () => {
  it("refuse un modérateur", async () => {
    mockAuth.mockResolvedValue({ user: { id: "m1" }, hubRole: "moderator" });
    const res = await DELETE(req("DELETE", { id: "u1" }));
    expect(res.status).toBe(403);
  });

  it("empêche l'auto-suppression", async () => {
    asAdmin();
    const res = await DELETE(req("DELETE", { id: "admin1" }));
    expect(res.status).toBe(400);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("supprime un autre utilisateur", async () => {
    asAdmin();
    prismaMock.user.delete.mockResolvedValue({});
    const res = await DELETE(req("DELETE", { id: "u1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("renvoie 409 si des données liées bloquent la suppression", async () => {
    asAdmin();
    prismaMock.user.delete.mockRejectedValue(new Error("FK constraint"));
    const res = await DELETE(req("DELETE", { id: "u1" }));
    expect(res.status).toBe(409);
  });
});
