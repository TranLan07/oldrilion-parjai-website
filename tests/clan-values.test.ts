import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, prismaMock } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  prismaMock: {
    clan: { findUnique: vi.fn() },
    clanValue: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { GET as pubGET } from "../src/app/api/clan/[slug]/values/route";
import { GET as adminGET, PUT as adminPUT } from "../src/app/api/clan/[slug]/admin/values/route";

const params = () => ({ params: Promise.resolve({ slug: "parjai" }) });
const getReq = new NextRequest("http://localhost/x");
function put(body: object) {
  return new NextRequest("http://localhost/x", { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  mockAuth.mockReset();
  Object.values(prismaMock).forEach(m => { if (typeof m !== "function") Object.values(m).forEach(fn => fn.mockReset()); });
  prismaMock.$transaction.mockResolvedValue([]);
  prismaMock.clanValue.create.mockImplementation(async (a: { data: object }) => a.data);
  mockAuth.mockResolvedValue({ user: { id: "a1" }, hubRole: "admin", clanSlug: "parjai", permissionLevel: 10 });
});

describe("GET public /values", () => {
  it("renvoie les valeurs par défaut (couleur null) si le clan n'en a aucune", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false });
    prismaMock.clanValue.findMany.mockResolvedValue([]);
    const res = await pubGET(getReq, params());
    const j = await res.json();
    expect(j).toHaveLength(3);
    expect(j[0].title).toBe("Honneur");
    expect(j[0].color).toBeNull();
  });

  it("renvoie les valeurs custom du clan si elles existent", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false });
    prismaMock.clanValue.findMany.mockResolvedValue([{ id: "v1", title: "Loyauté", description: "d", color: "#ff0000", order: 0 }]);
    const res = await pubGET(getReq, params());
    const j = await res.json();
    expect(j).toHaveLength(1);
    expect(j[0].title).toBe("Loyauté");
    expect(j[0].color).toBe("#ff0000");
  });
});

describe("PUT admin /values", () => {
  it("clan free : la couleur custom est ignorée (null => accent)", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: false });
    prismaMock.clanValue.findMany.mockResolvedValue([]);
    await adminPUT(put({ values: [{ title: "Honneur", description: "d", color: "#ff0000" }] }), params());
    const created = prismaMock.clanValue.create.mock.calls[0][0].data;
    expect(created.color).toBeNull();
  });

  it("clan premium : la couleur custom est conservée", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: true });
    prismaMock.clanValue.findMany.mockResolvedValue([]);
    await adminPUT(put({ values: [{ title: "Honneur", description: "d", color: "#00ff00" }] }), params());
    const created = prismaMock.clanValue.create.mock.calls[0][0].data;
    expect(created.color).toBe("#00ff00");
  });

  it("refuse une valeur sans titre", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: true });
    const res = await adminPUT(put({ values: [{ title: "  ", description: "d" }] }), params());
    expect(res.status).toBe(400);
  });

  it("refuse plus de 6 valeurs", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: true });
    const values = Array.from({ length: 7 }, (_, i) => ({ title: `V${i}` }));
    const res = await adminPUT(put({ values }), params());
    expect(res.status).toBe(400);
  });

  it("GET admin crée les valeurs par défaut si le clan n'en a aucune", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: false });
    prismaMock.clanValue.count.mockResolvedValue(0);
    prismaMock.clanValue.findMany.mockResolvedValue([{ id: "v1", title: "Honneur", description: "d", color: null, order: 0 }]);
    const res = await adminGET(getReq, params());
    expect(res.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalled(); // création des défauts
  });
});
