import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, prismaMock } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  prismaMock: {
    clan: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
    pagePermission: { findUnique: vi.fn() },
    clanBankTransaction: { findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  },
}));
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST } from "../src/app/api/clan/[slug]/banque/route";

const clanFree = { id: "c1", slug: "parjai", premium: false, suspended: false, bankBalance: 500 };
const clanPremium = { ...clanFree, premium: true };
const params = (slug = "parjai") => ({ params: Promise.resolve({ slug }) });

function postReq(body: object) {
  return new NextRequest("http://localhost/api/clan/parjai/banque", {
    method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
  });
}
const getReq = new NextRequest("http://localhost/api/clan/parjai/banque");

function setUser(permissionLevel: number, clanId = "c1") {
  prismaMock.user.findUnique.mockResolvedValue({ permissionLevel, clanId });
}

beforeEach(() => {
  mockAuth.mockReset();
  Object.values(prismaMock).forEach(m => {
    if (typeof m === "function") return;
    Object.values(m).forEach(fn => fn.mockReset());
  });
  prismaMock.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]));
  prismaMock.clanBankTransaction.create.mockImplementation(async (args: { data: object }) => args.data);
  prismaMock.clan.update.mockResolvedValue({});
  mockAuth.mockResolvedValue({ user: { id: "u1" } });
});

describe("banque — suspension", () => {
  it("GET refuse un clan suspendu (403)", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ ...clanFree, suspended: true });
    const res = await GET(getReq, params());
    expect(res.status).toBe(403);
  });

  it("POST refuse un clan suspendu (403)", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ ...clanFree, suspended: true });
    const res = await POST(postReq({ type: "depot", amount: 100 }), params());
    expect(res.status).toBe(403);
  });
});

describe("banque — freemium (clan free : admin uniquement)", () => {
  it("refuse le dépôt d'un membre simple en free (403)", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clanFree);
    setUser(1);
    prismaMock.pagePermission.findUnique.mockResolvedValue(null);
    const res = await POST(postReq({ type: "depot", amount: 100 }), params());
    expect(res.status).toBe(403);
  });

  it("accepte le dépôt d'un admin en free", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clanFree);
    setUser(10);
    prismaMock.pagePermission.findUnique.mockResolvedValue(null);
    const res = await POST(postReq({ type: "depot", amount: 100 }), params());
    expect(res.status).toBe(200);
  });

  it("GET : membre simple en free ne voit pas l'historique", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clanFree);
    setUser(1);
    prismaMock.pagePermission.findUnique.mockResolvedValue(null);
    const res = await GET(getReq, params());
    const data = await res.json();
    expect(data.transactions).toEqual([]);
    expect(prismaMock.clanBankTransaction.findMany).not.toHaveBeenCalled();
  });
});

describe("banque — premium", () => {
  it("membre avec PagePermission peut déposer", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clanPremium);
    setUser(1);
    prismaMock.pagePermission.findUnique.mockResolvedValue({ minPermission: 1 });
    const res = await POST(postReq({ type: "depot", amount: 100 }), params());
    expect(res.status).toBe(200);
  });

  it("retrait premium sans justificatif → 400", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clanPremium);
    setUser(10);
    prismaMock.pagePermission.findUnique.mockResolvedValue(null);
    const res = await POST(postReq({ type: "retrait", amount: 100 }), params());
    expect(res.status).toBe(400);
    const d = await res.json();
    expect(d.error).toContain("Justificatif");
  });

  it("retrait supérieur au solde → 400", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clanPremium);
    setUser(10);
    prismaMock.pagePermission.findUnique.mockResolvedValue(null);
    const res = await POST(postReq({ type: "retrait", amount: 9999, label: "achat" }), params());
    expect(res.status).toBe(400);
    const d = await res.json();
    expect(d.error).toContain("Solde");
  });

  it("montant négatif ou nul → 400", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clanPremium);
    const res = await POST(postReq({ type: "depot", amount: 0 }), params());
    expect(res.status).toBe(400);
  });

  it("type inconnu → 400", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clanPremium);
    const res = await POST(postReq({ type: "virement", amount: 100 }), params());
    expect(res.status).toBe(400);
  });
});

describe("banque — appartenance clan", () => {
  it("un utilisateur d'un autre clan a perm 0 → 403 en écriture", async () => {
    prismaMock.clan.findUnique.mockResolvedValue(clanPremium);
    setUser(10, "autre-clan");
    prismaMock.pagePermission.findUnique.mockResolvedValue(null);
    const res = await POST(postReq({ type: "depot", amount: 100 }), params());
    expect(res.status).toBe(403);
  });
});
