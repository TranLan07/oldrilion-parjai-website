import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Session admin hub : satisfait requireClanAdmin, requireHubAdmin et l'auth de base
// sur toutes les routes, ce qui permet d'atteindre le check de suspension.
const { mockAuth, prismaMock } = vi.hoisted(() => {
  const anyModel = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(async () => []),
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
    updateMany: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
    deleteMany: vi.fn(async () => ({})),
    upsert: vi.fn(async () => ({})),
    count: vi.fn(async () => 0),
  });
  return {
    mockAuth: vi.fn(),
    prismaMock: new Proxy({} as Record<string, ReturnType<typeof anyModel>> & { $transaction: unknown }, {
      get(target, prop: string) {
        if (prop === "$transaction") return async (arg: unknown) =>
          typeof arg === "function" ? (arg as (tx: unknown) => unknown)(target) : arg;
        if (!(prop in target)) target[prop] = anyModel();
        return target[prop];
      },
    }),
  };
});
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

// Imports statiques (Vite n'autorise pas l'import dynamique à chemin variable)
import * as adminChannels from "../src/app/api/clan/[slug]/admin/channels/route";
import * as adminDiplomatie from "../src/app/api/clan/[slug]/admin/diplomatie/route";
import * as adminDiploTag from "../src/app/api/clan/[slug]/admin/diplomatie/tag/route";
import * as adminEvenements from "../src/app/api/clan/[slug]/admin/evenements/route";
import * as adminGrades from "../src/app/api/clan/[slug]/admin/grades/route";
import * as adminLore from "../src/app/api/clan/[slug]/admin/lore/route";
import * as adminMissions from "../src/app/api/clan/[slug]/admin/missions/route";
import * as adminPages from "../src/app/api/clan/[slug]/admin/pages/route";
import * as adminRecruitment from "../src/app/api/clan/[slug]/admin/recruitment/route";
import * as adminRules from "../src/app/api/clan/[slug]/admin/rules/route";
import * as adminSettings from "../src/app/api/clan/[slug]/admin/settings/route";
import * as adminSpecs from "../src/app/api/clan/[slug]/admin/specializations/route";
import * as adminTags from "../src/app/api/clan/[slug]/admin/tags/route";
import * as adminUsers from "../src/app/api/clan/[slug]/admin/users/route";
import * as adminWhitelist from "../src/app/api/clan/[slug]/admin/whitelist/route";
import * as banque from "../src/app/api/clan/[slug]/banque/route";
import * as chFollow from "../src/app/api/clan/[slug]/channels/[id]/follow/route";
import * as chMembers from "../src/app/api/clan/[slug]/channels/[id]/members/route";
import * as chMessages from "../src/app/api/clan/[slug]/channels/[id]/messages/route";
import * as chSettings from "../src/app/api/clan/[slug]/channels/[id]/settings/route";
import * as chSse from "../src/app/api/clan/[slug]/channels/[id]/sse/route";
import * as channels from "../src/app/api/clan/[slug]/channels/route";
import * as diplomatie from "../src/app/api/clan/[slug]/diplomatie/route";
import * as evJoin from "../src/app/api/clan/[slug]/evenements/[id]/join/route";
import * as evenements from "../src/app/api/clan/[slug]/evenements/route";
import * as lore from "../src/app/api/clan/[slug]/lore/route";
import * as members from "../src/app/api/clan/[slug]/members/route";
import * as misParticipate from "../src/app/api/clan/[slug]/missions/[id]/participate/route";
import * as missions from "../src/app/api/clan/[slug]/missions/route";
import * as rules from "../src/app/api/clan/[slug]/rules/route";
import * as specializations from "../src/app/api/clan/[slug]/specializations/route";

// Signature volontairement large : les routes ont des types de params variés
// ([id] ou non), on les appelle de façon uniforme dans le test.
type RouteHandler = (req: NextRequest, ctx: { params: Promise<{ slug: string; id?: string }> }) => Promise<Response>;
type Handlers = Record<string, unknown>;

// public/route.ts est volontairement exclu (ne renvoie que les métadonnées
// nécessaires à l'affichage de l'écran de suspension lui-même).
const ROUTES: Array<{ name: string; mod: Handlers; methods: string[]; hasId?: boolean }> = [
  { name: "admin/channels", mod: adminChannels, methods: ["GET", "POST", "PUT", "DELETE"] },
  { name: "admin/diplomatie", mod: adminDiplomatie, methods: ["GET", "POST", "PUT", "DELETE"] },
  { name: "admin/diplomatie/tag", mod: adminDiploTag, methods: ["POST", "DELETE"] },
  { name: "admin/evenements", mod: adminEvenements, methods: ["GET", "POST", "PUT", "DELETE"] },
  { name: "admin/grades", mod: adminGrades, methods: ["GET", "POST", "PUT", "DELETE"] },
  { name: "admin/lore", mod: adminLore, methods: ["GET", "POST", "PUT", "DELETE"] },
  { name: "admin/missions", mod: adminMissions, methods: ["GET", "POST", "PUT", "DELETE"] },
  { name: "admin/pages", mod: adminPages, methods: ["GET", "POST", "PUT", "DELETE"] },
  { name: "admin/recruitment", mod: adminRecruitment, methods: ["GET", "POST", "PUT"] },
  { name: "admin/rules", mod: adminRules, methods: ["GET", "POST", "PUT", "DELETE"] },
  { name: "admin/settings", mod: adminSettings, methods: ["GET", "PUT"] },
  { name: "admin/specializations", mod: adminSpecs, methods: ["GET", "POST", "PUT", "DELETE"] },
  { name: "admin/tags", mod: adminTags, methods: ["GET", "POST", "DELETE"] },
  { name: "admin/users", mod: adminUsers, methods: ["GET", "PUT", "DELETE"] },
  { name: "admin/whitelist", mod: adminWhitelist, methods: ["GET", "POST", "DELETE"] },
  { name: "banque", mod: banque, methods: ["GET", "POST"] },
  { name: "channels/[id]/follow", mod: chFollow, methods: ["POST", "DELETE"], hasId: true },
  { name: "channels/[id]/members", mod: chMembers, methods: ["POST"], hasId: true },
  { name: "channels/[id]/messages", mod: chMessages, methods: ["GET", "POST"], hasId: true },
  { name: "channels/[id]/settings", mod: chSettings, methods: ["PUT"], hasId: true },
  { name: "channels/[id]/sse", mod: chSse, methods: ["GET"], hasId: true },
  { name: "channels", mod: channels, methods: ["GET"] },
  { name: "diplomatie", mod: diplomatie, methods: ["GET"] },
  { name: "evenements/[id]/join", mod: evJoin, methods: ["POST"], hasId: true },
  { name: "evenements", mod: evenements, methods: ["GET"] },
  { name: "lore", mod: lore, methods: ["GET"] },
  { name: "members", mod: members, methods: ["GET"] },
  { name: "missions/[id]/participate", mod: misParticipate, methods: ["POST"], hasId: true },
  { name: "missions", mod: missions, methods: ["GET"] },
  { name: "rules", mod: rules, methods: ["GET"] },
  { name: "specializations", mod: specializations, methods: ["GET"] },
];

function makeReq(method: string) {
  const url = "http://localhost/api/clan/parjai/x";
  if (method === "GET") return new NextRequest(url);
  return new NextRequest(url, { method, body: JSON.stringify({ email: "a@b.c", join: true, participating: true }), headers: { "Content-Type": "application/json" } });
}

const SUSPENDED_CLAN = { id: "c1", slug: "parjai", suspended: true, premium: false, bankBalance: 0 };

describe("Suspension — toutes les routes clan renvoient 403 quand le clan est suspendu", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: "admin1" }, hubRole: "admin", clanSlug: "parjai", permissionLevel: 10 });
    prismaMock.clan.findUnique.mockResolvedValue(SUSPENDED_CLAN);
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin1", clanId: "c1", permissionLevel: 10, mandalorien: true });
  });

  for (const route of ROUTES) {
    for (const method of route.methods) {
      it(`${method} ${route.name} → 403`, async () => {
        const handler = route.mod[method] as RouteHandler | undefined;
        expect(handler, `${method} exporté`).toBeTypeOf("function");
        const params = Promise.resolve(route.hasId ? { slug: "parjai", id: "x1" } : { slug: "parjai" });
        const res = await handler!(makeReq(method), { params });
        expect(res.status).toBe(403);
      });
    }
  }
});
