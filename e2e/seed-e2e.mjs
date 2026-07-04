// Seed idempotent pour les tests E2E : ajoute un webmaster de clan Parjai.
// Réexécutable sans effet de bord (upsert). N'altère pas l'état premium/suspended du clan.
import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const parjai = await prisma.clan.findUnique({ where: { slug: "parjai" } });
  if (!parjai) throw new Error("Clan parjai introuvable — lancer `npx tsx prisma/seed.ts` d'abord.");

  const hash = hashSync("e2etest123", 10);

  await prisma.user.upsert({
    where: { username: "e2e_webmaster" },
    update: { passwordHash: hash, clanId: parjai.id, permissionLevel: 10, mandalorien: true },
    create: {
      publicId: "E2EWMR",
      username: "e2e_webmaster",
      passwordHash: hash,
      displayName: "E2E Webmaster",
      hubRole: "member",
      role: "admin",
      clanId: parjai.id,
      grade: "Mand'alor",
      specialization: "Kyramud",
      permissionLevel: 10,
      mustChangePassword: false,
      mandalorien: true,
    },
  });

  console.log("E2E seed OK : e2e_webmaster / e2etest123 (Parjai, perm 10, mandalorien)");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
