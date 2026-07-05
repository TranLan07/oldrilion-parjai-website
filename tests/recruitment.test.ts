import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, prismaMock } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  prismaMock: {
    clan: { findUnique: vi.fn() },
    specialization: { findMany: vi.fn() },
    recruitmentField: { findMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    recruitment: { create: vi.fn() },
    $transaction: vi.fn(async (ops: unknown) => ops),
  },
}));
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { GET as pubGET, POST as pubPOST } from "../src/app/api/clan/[slug]/recruitment/route";
import { PUT as fieldsPUT } from "../src/app/api/clan/[slug]/admin/recruitment-fields/route";

const params = () => ({ params: Promise.resolve({ slug: "parjai" }) });
const getReq = new NextRequest("http://localhost/x");
function jsonReq(method: string, body: object) {
  return new NextRequest("http://localhost/x", { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  mockAuth.mockReset();
  Object.values(prismaMock).forEach(m => { if (typeof m !== "function") Object.values(m).forEach(fn => fn.mockReset()); });
  prismaMock.specialization.findMany.mockResolvedValue([{ id: "s1", name: "Kyramud", description: "" }]);
  prismaMock.recruitmentField.findMany.mockResolvedValue([]);
  prismaMock.recruitment.create.mockImplementation(async (a: { data: object }) => ({ id: "r1", ...a.data }));
  prismaMock.$transaction.mockResolvedValue([]);
});

describe("GET public /recruitment — config", () => {
  it("accessible sans authentification", async () => {
    mockAuth.mockResolvedValue(null);
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: false });
    const res = await pubGET(getReq, params());
    expect(res.status).toBe(200);
  });

  it("ne renvoie que les spés non-secrètes", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: true });
    await pubGET(getReq, params());
    expect(prismaMock.specialization.findMany.mock.calls[0][0].where.secret).toBe(false);
  });

  it("champs custom uniquement si premium", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: false });
    await pubGET(getReq, params());
    expect(prismaMock.recruitmentField.findMany).not.toHaveBeenCalled();
  });

  it("clan suspendu : 403", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: true, premium: true });
    const res = await pubGET(getReq, params());
    expect(res.status).toBe(403);
  });
});

describe("POST public /recruitment — soumission", () => {
  const base = { rpName: "Vhon", discord: "vhon#1", experience: "exp", motivation: "mot" };

  it("accepte une candidature valide sans authentification", async () => {
    mockAuth.mockResolvedValue(null);
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", suspended: false, premium: false });
    const res = await pubPOST(jsonReq("POST", base), params());
    expect(res.status).toBe(200);
    expect(prismaMock.recruitment.create).toHaveBeenCalled();
  });

  it("rejette si un champ principal manque", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", suspended: false, premium: false });
    const res = await pubPOST(jsonReq("POST", { rpName: "X" }), params());
    expect(res.status).toBe(400);
  });

  it("rejette si un champ custom requis est vide (premium)", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", suspended: false, premium: true });
    prismaMock.recruitmentField.findMany.mockResolvedValue([{ id: "f1", label: "Âge RP", required: true }]);
    const res = await pubPOST(jsonReq("POST", { ...base, customAnswers: [{ id: "f1", value: "" }] }), params());
    expect(res.status).toBe(400);
  });

  it("stocke les réponses custom", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", suspended: false, premium: true });
    prismaMock.recruitmentField.findMany.mockResolvedValue([{ id: "f1", label: "Âge RP", required: false }]);
    await pubPOST(jsonReq("POST", { ...base, customAnswers: [{ id: "f1", value: "24 ans" }] }), params());
    const stored = JSON.parse(prismaMock.recruitment.create.mock.calls[0][0].data.customAnswers);
    expect(stored).toEqual([{ label: "Âge RP", value: "24 ans" }]);
  });
});

describe("PUT admin /recruitment-fields — form builder", () => {
  beforeEach(() => mockAuth.mockResolvedValue({ user: { id: "a1" }, hubRole: "admin", clanSlug: "parjai", permissionLevel: 10 }));

  it("refuse un clan non premium (403)", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: false });
    const res = await fieldsPUT(jsonReq("PUT", { fields: [] }), params());
    expect(res.status).toBe(403);
  });

  it("refuse plus de 10 champs", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: true });
    const fields = Array.from({ length: 11 }, (_, i) => ({ label: `f${i}`, type: "text" }));
    const res = await fieldsPUT(jsonReq("PUT", { fields }), params());
    expect(res.status).toBe(400);
  });

  it("refuse un radio sans option", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: true });
    const res = await fieldsPUT(jsonReq("PUT", { fields: [{ label: "Choix", type: "radio", options: [] }] }), params());
    expect(res.status).toBe(400);
  });

  it("plafonne les options à 5 et enregistre les champs valides", async () => {
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, premium: true });
    prismaMock.recruitmentField.findMany.mockResolvedValue([]);
    const res = await fieldsPUT(jsonReq("PUT", { fields: [
      { label: "Âge", type: "text", required: true },
      { label: "Classe", type: "radio", options: ["a", "b", "c", "d", "e", "f", "g"] },
    ] }), params());
    expect(res.status).toBe(200);
    // La création du 2e champ (radio) plafonne à 5 options
    const radioCreate = prismaMock.recruitmentField.create.mock.calls.find(c => c[0].data.type === "radio");
    expect(JSON.parse(radioCreate![0].data.options)).toHaveLength(5);
  });
});
