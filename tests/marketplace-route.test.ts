import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, prismaMock } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  prismaMock: {
    marketplaceListing: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    user: { findUnique: vi.fn() },
    clan: { findUnique: vi.fn() },
  },
}));
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST } from "../src/app/api/hub/marketplace/route";

const listingAnon = {
  id: "l1", sellerId: "seller1", clanId: null, title: "Beskar", price: 100,
  anonymous: true, status: "active", expiresAt: null,
  seller: { id: "seller1", displayName: "Vrai Nom", anonymous: true, publicId: "PUB123" },
  clan: null,
};

function postReq(body: object) {
  return new NextRequest("http://localhost/api/hub/marketplace", {
    method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockAuth.mockReset();
  Object.values(prismaMock).forEach(m => Object.values(m).forEach(fn => fn.mockReset()));
});

describe("GET /api/hub/marketplace — anonymat", () => {
  it("masque l'identité du vendeur anonyme pour les autres utilisateurs", async () => {
    mockAuth.mockResolvedValue({ user: { id: "other" }, hubRole: "member" });
    prismaMock.marketplaceListing.findMany.mockResolvedValue([listingAnon]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].seller.displayName).toBe("");
    expect(data[0].seller.id).toBe("");
    expect(data[0].sellerId).toBe("");
    expect(data[0].seller.publicId).toBe("PUB123");
  });

  it("conserve l'identité pour le vendeur lui-même", async () => {
    mockAuth.mockResolvedValue({ user: { id: "seller1" }, hubRole: "member" });
    prismaMock.marketplaceListing.findMany.mockResolvedValue([listingAnon]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].seller.displayName).toBe("Vrai Nom");
  });

  it("conserve l'identité pour un admin hub", async () => {
    mockAuth.mockResolvedValue({ user: { id: "other" }, hubRole: "admin" });
    prismaMock.marketplaceListing.findMany.mockResolvedValue([listingAnon]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].seller.displayName).toBe("Vrai Nom");
  });

  it("refuse sans authentification", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/hub/marketplace — règles joueur", () => {
  it("bloque la 2e annonce dans la semaine glissante (429)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.user.findUnique.mockResolvedValue({ anonymous: false, hubRole: "member", clanId: null });
    prismaMock.marketplaceListing.count.mockResolvedValue(1);
    const res = await POST(postReq({ title: "Test", price: 50 }));
    expect(res.status).toBe(429);
  });

  it("accepte la 1re annonce et fixe une expiration J+7", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.user.findUnique.mockResolvedValue({ anonymous: false, hubRole: "member", clanId: null });
    prismaMock.marketplaceListing.count.mockResolvedValue(0);
    prismaMock.marketplaceListing.create.mockImplementation(async (args: { data: Record<string, unknown> }) => args.data);
    const res = await POST(postReq({ title: "Test", price: 50 }));
    expect(res.status).toBe(201);
    const created = prismaMock.marketplaceListing.create.mock.calls[0][0].data;
    expect(created.expiresAt).toBeInstanceOf(Date);
    const days = (created.expiresAt.getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);
  });

  it("rejette un prix invalide", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(postReq({ title: "Test", price: -5 }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/hub/marketplace — règles clan", () => {
  it("refuse un clan suspendu (403)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.user.findUnique.mockResolvedValue({ anonymous: false, hubRole: "member", clanId: "c1", permissionLevel: 10 });
    prismaMock.clan.findUnique.mockResolvedValue({ premium: true, suspended: true });
    const res = await POST(postReq({ title: "Test", price: 50, clanId: "c1" }));
    expect(res.status).toBe(403);
  });

  it("refuse un clan non premium (403)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.user.findUnique.mockResolvedValue({ anonymous: false, hubRole: "member", clanId: "c1", permissionLevel: 10 });
    prismaMock.clan.findUnique.mockResolvedValue({ premium: false, suspended: false });
    const res = await POST(postReq({ title: "Test", price: 50, clanId: "c1" }));
    expect(res.status).toBe(403);
  });

  it("refuse un utilisateur d'un autre clan (403)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.user.findUnique.mockResolvedValue({ anonymous: false, hubRole: "member", clanId: "autre" });
    const res = await POST(postReq({ title: "Test", price: 50, clanId: "c1" }));
    expect(res.status).toBe(403);
  });

  it("annonce clan premium : pas d'expiration", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.user.findUnique.mockResolvedValue({ anonymous: false, hubRole: "member", clanId: "c1", permissionLevel: 10 });
    prismaMock.clan.findUnique.mockResolvedValue({ premium: true, suspended: false });
    prismaMock.marketplaceListing.create.mockImplementation(async (args: { data: Record<string, unknown> }) => args.data);
    const res = await POST(postReq({ title: "Test", price: 50, clanId: "c1" }));
    expect(res.status).toBe(201);
    expect(prismaMock.marketplaceListing.create.mock.calls[0][0].data.expiresAt).toBeNull();
  });
});
