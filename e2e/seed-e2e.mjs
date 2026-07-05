// Seed idempotent pour les tests E2E : ajoute un webmaster de clan Parjai.
// Réexécutable sans effet de bord (upsert). N'altère pas l'état premium/suspended du clan.
import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const parjai = await prisma.clan.findUnique({ where: { slug: "parjai" } });
  if (!parjai) throw new Error("Clan parjai introuvable — lancer `npx tsx prisma/seed.ts` d'abord.");

  // Parjai premium pour tester marketplace clan + personnalisation premium en E2E
  await prisma.clan.update({ where: { id: parjai.id }, data: { premium: true } });

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

  // Utilisateur jetable, sans-clan : cible des actions destructives des tests
  // (reset de mot de passe, etc.) sans impacter e2e_webmaster utilisé pour se connecter.
  await prisma.user.upsert({
    where: { username: "e2e_target" },
    update: { clanId: null, permissionLevel: 1 },
    create: {
      publicId: "E2ETGT",
      username: "e2e_target",
      passwordHash: hash,
      displayName: "E2E Target",
      hubRole: "member",
      role: "membre",
      clanId: null,
      grade: "Recrue",
      specialization: "",
      permissionLevel: 1,
      mustChangePassword: false,
      mandalorien: false,
    },
  });

  // Membre jetable de Parjai : sert à tester le départ de clan (ré-affilié à chaque seed).
  await prisma.user.upsert({
    where: { username: "e2e_leaver" },
    update: { clanId: parjai.id, permissionLevel: 1, mandalorien: true, grade: "Recrue" },
    create: {
      publicId: "E2ELVR",
      username: "e2e_leaver",
      passwordHash: hash,
      displayName: "E2E Leaver",
      hubRole: "member",
      role: "membre",
      clanId: parjai.id,
      grade: "Recrue",
      specialization: "Kyramud",
      permissionLevel: 1,
      mustChangePassword: false,
      mandalorien: true,
    },
  });

  console.log("E2E seed OK : e2e_webmaster (Parjai, perm 10) + e2e_target (jetable) + e2e_leaver (Parjai, jetable)");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
