import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));

const mockFindUnique = vi.fn();
vi.mock("../src/lib/prisma", () => ({
  prisma: { clan: { findUnique: (args: unknown) => mockFindUnique(args) } },
}));

import { requireClanAdmin, resolveClan, denied, suspendedResponse } from "../src/lib/clan-auth";

function session(over: Record<string, unknown> = {}) {
  return { user: { id: "u1" }, hubRole: "member", clanSlug: "parjai", permissionLevel: 1, ...over };
}

describe("requireClanAdmin", () => {
  beforeEach(() => mockAuth.mockReset());

  it("refuse sans session", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await requireClanAdmin("parjai")).toBeNull();
  });

  it("refuse un membre simple (permission 1)", async () => {
    mockAuth.mockResolvedValue(session({ permissionLevel: 1 }));
    expect(await requireClanAdmin("parjai")).toBeNull();
  });

  it("refuse une permission juste sous le seuil (9)", async () => {
    mockAuth.mockResolvedValue(session({ permissionLevel: 9 }));
    expect(await requireClanAdmin("parjai")).toBeNull();
  });

  it("accepte au seuil exact (10)", async () => {
    mockAuth.mockResolvedValue(session({ permissionLevel: 10 }));
    expect(await requireClanAdmin("parjai")).not.toBeNull();
  });

  it("accepte au-dessus du seuil (11)", async () => {
    mockAuth.mockResolvedValue(session({ permissionLevel: 11 }));
    expect(await requireClanAdmin("parjai")).not.toBeNull();
  });

  it("refuse l'admin d'un AUTRE clan (IDOR)", async () => {
    mockAuth.mockResolvedValue(session({ clanSlug: "autre-clan", permissionLevel: 10 }));
    expect(await requireClanAdmin("parjai")).toBeNull();
  });

  it("accepte un admin hub sur n'importe quel clan", async () => {
    mockAuth.mockResolvedValue(session({ hubRole: "admin", clanSlug: undefined, permissionLevel: 0 }));
    expect(await requireClanAdmin("parjai")).not.toBeNull();
  });

  it("refuse un modérateur hub (seul admin passe)", async () => {
    mockAuth.mockResolvedValue(session({ hubRole: "moderator", clanSlug: undefined, permissionLevel: 0 }));
    expect(await requireClanAdmin("parjai")).toBeNull();
  });

  it("refuse un utilisateur sans clan", async () => {
    mockAuth.mockResolvedValue(session({ clanSlug: undefined, permissionLevel: 0 }));
    expect(await requireClanAdmin("parjai")).toBeNull();
  });
});

describe("resolveClan / réponses", () => {
  it("resolveClan interroge par slug", async () => {
    mockFindUnique.mockResolvedValue({ id: "c1", slug: "parjai", suspended: false });
    const clan = await resolveClan("parjai");
    expect(clan?.id).toBe("c1");
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { slug: "parjai" } });
  });

  it("denied() renvoie un 403", async () => {
    expect(denied().status).toBe(403);
  });

  it("suspendedResponse() renvoie un 403", async () => {
    expect(suspendedResponse().status).toBe(403);
  });
});
