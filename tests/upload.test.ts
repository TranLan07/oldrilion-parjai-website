import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { existsSync } from "fs";
import { readFile, rm } from "fs/promises";
import path from "path";

const { mockAuth, prismaMock } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  prismaMock: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    clan: { findUnique: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { POST as avatarPOST, DELETE as avatarDELETE } from "../src/app/api/profil/avatar/route";
import { POST as mediaPOST, DELETE as mediaDELETE } from "../src/app/api/clan/[slug]/admin/media/route";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const writtenFiles: string[] = [];

function png(name = "test.png") {
  // 1x1 minimal PNG bytes, real image data (not just a text stub)
  const bytes = Buffer.from(
    "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000a49444154789c6360000002000100ffff030000060005575ea70000000049454e44ae426082",
    "hex"
  );
  return new File([bytes], name, { type: "image/png" });
}

function postWithFile(url: string, file: File, extra?: Record<string, string>) {
  const form = new FormData();
  form.set("file", file);
  if (extra) for (const [k, v] of Object.entries(extra)) form.set(k, v);
  return new NextRequest(url, { method: "POST", body: form });
}

function del(url: string, body?: object) {
  return new NextRequest(url, {
    method: "DELETE",
    ...(body ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : {}),
  });
}

const clanParams = () => ({ params: Promise.resolve({ slug: "parjai" }) });

beforeEach(() => {
  mockAuth.mockReset();
  prismaMock.user.findUnique.mockReset();
  prismaMock.user.update.mockReset();
  prismaMock.clan.findUnique.mockReset();
  prismaMock.clan.update.mockReset();
});

afterAll(async () => {
  for (const f of writtenFiles) await rm(f, { force: true }).catch(() => {});
});

describe("POST /api/profil/avatar", () => {
  it("upload une image valide, l'écrit sur disque et met à jour l'utilisateur", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.user.findUnique.mockResolvedValue({ avatarUrl: null });
    prismaMock.user.update.mockResolvedValue({});

    const res = await avatarPOST(postWithFile("http://localhost/api/profil/avatar", png()));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.url).toMatch(/^\/uploads\/avatar\/[a-f0-9-]+\.png$/);

    const diskPath = path.join(process.cwd(), "public", json.url);
    writtenFiles.push(diskPath);
    expect(existsSync(diskPath)).toBe(true);
    const written = await readFile(diskPath);
    expect(written.length).toBeGreaterThan(0);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { avatarUrl: json.url },
    });
  });

  it("supprime l'ancien avatar quand un nouveau est uploadé", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    // simulate an existing (fake, non-existent) old avatar — deletion must not throw
    prismaMock.user.findUnique.mockResolvedValue({ avatarUrl: "/uploads/avatar/old-fake.png" });
    prismaMock.user.update.mockResolvedValue({});

    const res = await avatarPOST(postWithFile("http://localhost/api/profil/avatar", png()));
    expect(res.status).toBe(200);
    const json = await res.json();
    writtenFiles.push(path.join(process.cwd(), "public", json.url));
  });

  it("rejette sans authentification", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await avatarPOST(postWithFile("http://localhost/api/profil/avatar", png()));
    expect(res.status).toBe(401);
  });

  it("rejette un fichier manquant", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const form = new FormData();
    const res = await avatarPOST(new NextRequest("http://localhost/api/profil/avatar", { method: "POST", body: form }));
    expect(res.status).toBe(400);
  });

  it("rejette un type MIME non supporté", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const badFile = new File([Buffer.from("not an image")], "evil.svg", { type: "image/svg+xml" });
    const res = await avatarPOST(postWithFile("http://localhost/api/profil/avatar", badFile));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/non supporté/i);
  });

  it("rejette un fichier trop volumineux (> 2 Mo)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const big = new File([Buffer.alloc(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    const res = await avatarPOST(postWithFile("http://localhost/api/profil/avatar", big));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/volumineux/i);
  });
});

describe("DELETE /api/profil/avatar", () => {
  it("retire l'avatar de l'utilisateur", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.user.findUnique.mockResolvedValue({ avatarUrl: "/uploads/avatar/whatever.png" });
    prismaMock.user.update.mockResolvedValue({});
    const res = await avatarDELETE();
    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { avatarUrl: null } });
  });

  it("rejette sans authentification", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await avatarDELETE();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/clan/[slug]/admin/media (logo & bannière)", () => {
  function adminSession() {
    return { user: { id: "admin1" }, hubRole: "member", clanSlug: "parjai", permissionLevel: 10 };
  }

  it("upload un logo de clan valide", async () => {
    mockAuth.mockResolvedValue(adminSession());
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, logoUrl: null, bannerUrl: null });
    prismaMock.clan.update.mockResolvedValue({});

    const res = await mediaPOST(postWithFile("http://localhost/api/clan/parjai/admin/media", png(), { type: "logo" }), clanParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toMatch(/^\/uploads\/clan-logo\/[a-f0-9-]+\.png$/);
    const diskPath = path.join(process.cwd(), "public", json.url);
    writtenFiles.push(diskPath);
    expect(existsSync(diskPath)).toBe(true);
    expect(prismaMock.clan.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { logoUrl: json.url } });
  });

  it("upload une bannière de clan valide (jusqu'à 5 Mo)", async () => {
    mockAuth.mockResolvedValue(adminSession());
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, logoUrl: null, bannerUrl: null });
    prismaMock.clan.update.mockResolvedValue({});

    const res = await mediaPOST(postWithFile("http://localhost/api/clan/parjai/admin/media", png(), { type: "banner" }), clanParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toMatch(/^\/uploads\/clan-banner\/[a-f0-9-]+\.png$/);
    const diskPath = path.join(process.cwd(), "public", json.url);
    writtenFiles.push(diskPath);
    expect(existsSync(diskPath)).toBe(true);
    expect(prismaMock.clan.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { bannerUrl: json.url } });
  });

  it("une bannière de 3 Mo passe (sous la limite de 5 Mo) alors qu'un logo de 3 Mo serait refusé", async () => {
    mockAuth.mockResolvedValue(adminSession());
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, logoUrl: null, bannerUrl: null });
    prismaMock.clan.update.mockResolvedValue({});

    const midSize = new File([Buffer.alloc(3 * 1024 * 1024)], "mid.png", { type: "image/png" });

    const bannerRes = await mediaPOST(postWithFile("http://localhost/api/clan/parjai/admin/media", midSize, { type: "banner" }), clanParams());
    expect(bannerRes.status).toBe(200);
    const bannerJson = await bannerRes.json();
    writtenFiles.push(path.join(process.cwd(), "public", bannerJson.url));

    const logoRes = await mediaPOST(postWithFile("http://localhost/api/clan/parjai/admin/media", midSize, { type: "logo" }), clanParams());
    expect(logoRes.status).toBe(400);
  });

  it("rejette un type invalide (ni logo ni banner)", async () => {
    mockAuth.mockResolvedValue(adminSession());
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false });
    const res = await mediaPOST(postWithFile("http://localhost/api/clan/parjai/admin/media", png(), { type: "avatar" }), clanParams());
    expect(res.status).toBe(400);
  });

  it("rejette un membre non-admin (IDOR/permissions)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u2" }, hubRole: "member", clanSlug: "parjai", permissionLevel: 1 });
    const res = await mediaPOST(postWithFile("http://localhost/api/clan/parjai/admin/media", png(), { type: "logo" }), clanParams());
    expect(res.status).toBe(403);
  });

  it("rejette un admin d'un autre clan", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u3" }, hubRole: "member", clanSlug: "autre-clan", permissionLevel: 10 });
    const res = await mediaPOST(postWithFile("http://localhost/api/clan/parjai/admin/media", png(), { type: "logo" }), clanParams());
    expect(res.status).toBe(403);
  });

  it("rejette l'upload sur un clan suspendu", async () => {
    mockAuth.mockResolvedValue(adminSession());
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: true });
    const res = await mediaPOST(postWithFile("http://localhost/api/clan/parjai/admin/media", png(), { type: "logo" }), clanParams());
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/clan/[slug]/admin/media", () => {
  it("retire le logo du clan", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1" }, hubRole: "member", clanSlug: "parjai", permissionLevel: 10 });
    prismaMock.clan.findUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false, logoUrl: "/uploads/clan-logo/x.png" });
    prismaMock.clan.update.mockResolvedValue({});
    const res = await mediaDELETE(del("http://localhost/api/clan/parjai/admin/media", { type: "logo" }), clanParams());
    expect(res.status).toBe(200);
    expect(prismaMock.clan.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { logoUrl: null } });
  });
});
