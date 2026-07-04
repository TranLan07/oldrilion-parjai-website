import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, prismaMock } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  prismaMock: {
    clan: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
    marketplaceListing: { findMany: vi.fn() },
  },
}));
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { PUT as settingsPUT } from "../src/app/api/clan/[slug]/admin/settings/route";
import { GET as marketGET } from "../src/app/api/clan/[slug]/marketplace/route";

const params = () => ({ params: Promise.resolve({ slug: "parjai" }) });
function put(body: object) {
  return new NextRequest("http://localhost/x", { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}
const getReq = new NextRequest("http://localhost/x");

beforeEach(() => {
  mockAuth.mockReset();
  Object.values(prismaMock).forEach(m => Object.values(m).forEach(fn => fn.mockReset()));
  prismaMock.clan.update.mockImplementation(async (a: { data: object }) => a.data);
  prismaMock.marketplaceListing.findMany.mockResolvedValue([]);
  // Admin du clan parjai
  mockAuth.mockResolvedValue({ user: { id: "a1" }, hubRole: "admin", clanSlug: "parjai", permissionLevel: 10 });
});

describe("Settings — couleurs premium (colorText / colorCard)", () => {
  it("clan premium : colorText et colorCard sont appliqués", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: true });
    await settingsPUT(put({ colorText: "#ff0000", colorCard: "#111827" }), params());
    const d = prismaMock.clan.update.mock.calls[0][0].data;
    expect(d.colorText).toBe("#ff0000");
    expect(d.colorCard).toBe("#111827");
  });

  it("clan free : colorText et colorCard sont ignorés", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: false });
    await settingsPUT(put({ colorText: "#ff0000", colorCard: "#111827", colorPrimary: "#abcdef" }), params());
    const d = prismaMock.clan.update.mock.calls[0][0].data;
    expect(d.colorText).toBeUndefined();
    expect(d.colorCard).toBeUndefined();
    // Les couleurs de base restent modifiables même en free
    expect(d.colorPrimary).toBe("#abcdef");
  });
});

describe("Marketplace clan — GET / canManage", () => {
  it("premium + admin du clan : canManage true", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: true, colorPrimary: "#c9a84c" });
    prismaMock.user.findUnique.mockResolvedValue({ clanId: "c1", permissionLevel: 10, hubRole: "member" });
    const res = await marketGET(getReq, params());
    const j = await res.json();
    expect(j.canManage).toBe(true);
    expect(j.premium).toBe(true);
  });

  it("clan free : canManage false même pour un admin", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: false, colorPrimary: "#c9a84c" });
    prismaMock.user.findUnique.mockResolvedValue({ clanId: "c1", permissionLevel: 10, hubRole: "member" });
    const res = await marketGET(getReq, params());
    const j = await res.json();
    expect(j.canManage).toBe(false);
  });

  it("membre simple d'un clan premium : canManage false", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: true, colorPrimary: "#c9a84c" });
    prismaMock.user.findUnique.mockResolvedValue({ clanId: "c1", permissionLevel: 1, hubRole: "member" });
    const res = await marketGET(getReq, params());
    const j = await res.json();
    expect(j.canManage).toBe(false);
  });

  it("clan suspendu : 403", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: true, premium: true });
    const res = await marketGET(getReq, params());
    expect(res.status).toBe(403);
  });
});
