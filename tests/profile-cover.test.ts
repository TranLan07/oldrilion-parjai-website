import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, prismaMock } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  prismaMock: {
    clan: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    specialization: { findFirst: vi.fn(), findMany: vi.fn() },
    grade: { findMany: vi.fn() },
  },
}));
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { PUT as profilPUT } from "../src/app/api/profil/route";
import { GET as rosterGET } from "../src/app/api/clan/[slug]/roster-config/route";

function put(body: object) {
  return new NextRequest("http://localhost/api/profil", { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}
const params = () => ({ params: Promise.resolve({ slug: "parjai" }) });

beforeEach(() => {
  mockAuth.mockReset();
  Object.values(prismaMock).forEach(m => Object.values(m).forEach(fn => fn.mockReset()));
  prismaMock.user.update.mockImplementation(async (a: { data: object }) => ({ anonymous: false, publicSpecialization: "", ...a.data }));
  mockAuth.mockResolvedValue({ user: { id: "u1" } });
});

describe("Profil PUT — couverture publique", () => {
  it("accepte une spé publique du clan", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ clanId: "c1" });
    prismaMock.specialization.findFirst.mockResolvedValue({ id: "s1" });
    const res = await profilPUT(put({ publicSpecialization: "Goran" }));
    expect(res.status).toBe(200);
    expect(prismaMock.user.update.mock.calls[0][0].data.publicSpecialization).toBe("Goran");
    // La requête cherche bien une spé NON secrète
    expect(prismaMock.specialization.findFirst.mock.calls[0][0].where.secret).toBe(false);
  });

  it("rejette une spé inexistante ou secrète", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ clanId: "c1" });
    prismaMock.specialization.findFirst.mockResolvedValue(null);
    const res = await profilPUT(put({ publicSpecialization: "Dha" }));
    expect(res.status).toBe(400);
  });

  it("permet de retirer la couverture (valeur vide)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ clanId: "c1" });
    const res = await profilPUT(put({ publicSpecialization: "" }));
    expect(res.status).toBe(200);
    expect(prismaMock.user.update.mock.calls[0][0].data.publicSpecialization).toBe("");
  });

  it("rejette si l'utilisateur n'a pas de clan", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ clanId: null });
    const res = await profilPUT(put({ publicSpecialization: "Goran" }));
    expect(res.status).toBe(400);
  });
});

describe("roster-config — grades & spés d'un clan", () => {
  it("renvoie les grades/spés et calcule la permission max", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai" });
    prismaMock.grade.findMany.mockResolvedValue([{ name: "Recrue", defaultPermission: 1 }, { name: "Mand'alor", defaultPermission: 15 }]);
    prismaMock.specialization.findMany.mockResolvedValue([{ name: "Kyramud" }]);
    const res = await rosterGET(new NextRequest("http://localhost/x"), params());
    const j = await res.json();
    expect(j.maxPermission).toBe(15); // max(10, 15)
    expect(j.grades).toHaveLength(2);
    expect(j.specs[0].name).toBe("Kyramud");
  });

  it("plancher de permission max à 10", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai" });
    prismaMock.grade.findMany.mockResolvedValue([{ name: "Recrue", defaultPermission: 1 }]);
    prismaMock.specialization.findMany.mockResolvedValue([]);
    const res = await rosterGET(new NextRequest("http://localhost/x"), params());
    const j = await res.json();
    expect(j.maxPermission).toBe(10);
  });
});
