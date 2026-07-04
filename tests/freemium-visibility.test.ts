import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, prismaMock } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  prismaMock: {
    clan: { findUnique: vi.fn() },
    event: { create: vi.fn(), update: vi.fn() },
    mission: { create: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { POST as evPOST, PUT as evPUT } from "../src/app/api/clan/[slug]/admin/evenements/route";
import { POST as misPOST, PUT as misPUT } from "../src/app/api/clan/[slug]/admin/missions/route";

const params = () => ({ params: Promise.resolve({ slug: "parjai" }) });
const clan = (premium: boolean) => ({ id: "c1", slug: "parjai", suspended: false, premium });

function req(body: object) {
  return new NextRequest("http://localhost/x", {
    method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockAuth.mockReset();
  Object.values(prismaMock).forEach(m => Object.values(m).forEach(fn => fn.mockReset()));
  // Session admin du clan parjai
  mockAuth.mockResolvedValue({ user: { id: "a1" }, hubRole: "admin", clanSlug: "parjai", permissionLevel: 10 });
  prismaMock.event.create.mockImplementation(async (a: { data: object }) => a.data);
  prismaMock.event.update.mockImplementation(async (a: { data: object }) => a.data);
  prismaMock.mission.create.mockImplementation(async (a: { data: object }) => a.data);
  prismaMock.mission.update.mockImplementation(async (a: { data: object }) => a.data);
});

describe("Freemium — visibilité événements", () => {
  it("POST free : visibility forcée à 'internal' même si 'global' demandé", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clan(false));
    await evPOST(req({ title: "E", visibility: "global" }), params());
    expect(prismaMock.event.create.mock.calls[0][0].data.visibility).toBe("internal");
  });

  it("POST premium : visibility 'global' respectée", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clan(true));
    await evPOST(req({ title: "E", visibility: "global" }), params());
    expect(prismaMock.event.create.mock.calls[0][0].data.visibility).toBe("global");
  });

  it("PUT free : visibility 'global' NE doit PAS être appliquée (anti-bypass)", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clan(false));
    await evPUT(req({ id: "e1", visibility: "global" }), params());
    const data = prismaMock.event.update.mock.calls[0][0].data;
    expect(data.visibility).not.toBe("global");
  });

  it("PUT premium : visibility 'global' appliquée", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clan(true));
    await evPUT(req({ id: "e1", visibility: "global" }), params());
    expect(prismaMock.event.update.mock.calls[0][0].data.visibility).toBe("global");
  });
});

describe("Freemium — visibilité missions", () => {
  it("POST free : visibility forcée à 'internal'", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clan(false));
    await misPOST(req({ title: "M", visibility: "global" }), params());
    expect(prismaMock.mission.create.mock.calls[0][0].data.visibility).toBe("internal");
  });

  it("POST premium : visibility 'global' respectée", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clan(true));
    await misPOST(req({ title: "M", visibility: "global" }), params());
    expect(prismaMock.mission.create.mock.calls[0][0].data.visibility).toBe("global");
  });

  it("PUT free : visibility 'global' NE doit PAS être appliquée (anti-bypass)", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clan(false));
    await misPUT(req({ id: "m1", visibility: "global" }), params());
    const data = prismaMock.mission.update.mock.calls[0][0].data;
    expect(data.visibility).not.toBe("global");
  });

  it("PUT premium : visibility 'global' appliquée", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clan(true));
    await misPUT(req({ id: "m1", visibility: "global" }), params());
    expect(prismaMock.mission.update.mock.calls[0][0].data.visibility).toBe("global");
  });
});
