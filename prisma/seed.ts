import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

// Génère un publicId unique de 6 lettres majuscules
async function generatePublicId(): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let id: string;
  do {
    id = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * 26)]).join("");
  } while (await prisma.user.findUnique({ where: { publicId: id } }));
  return id;
}

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: "admin" } });
  if (existing) {
    console.log("Admin user already exists, skipping seed.");
    return;
  }

  // ─── Config hub ────────────────────────────────────────────────────────────
  await prisma.hubConfig.createMany({
    data: [
      { key: "maxTagsPerClan", value: "5" },
      { key: "hubAnonRevealLevel", value: "5" },
    ],
  });

  // ─── Clan Parjai ───────────────────────────────────────────────────────────
  const parjai = await prisma.clan.create({
    data: {
      slug: "parjai",
      name: "Parjai",
      description: "Les Exécuteurs Rouges — clan mandalorien d'élite opérant dans l'ombre.",
      colorBg: "#000000",
      colorPrimary: "#c9a84c",
      colorAccent: "#c0392b",
    },
  });

  // ─── Grades Parjai ─────────────────────────────────────────────────────────
  const gradesData = [
    { name: "Recrue", defaultPermission: 1, order: 1 },
    { name: "Assassin", defaultPermission: 2, order: 2 },
    { name: "Chasseur de prime", defaultPermission: 3, order: 3 },
    { name: "Fantôme", defaultPermission: 4, order: 4 },
    { name: "Exécuteur", defaultPermission: 5, order: 5 },
    { name: "Assistant", defaultPermission: 2, order: 6 },
    { name: "Forgeron", defaultPermission: 3, order: 7 },
    { name: "Forgeron Spécialiste", defaultPermission: 4, order: 8 },
    { name: "Maître Forgeron", defaultPermission: 5, order: 9 },
    { name: "Érudit", defaultPermission: 2, order: 10 },
    { name: "Gardien du savoir", defaultPermission: 3, order: 11 },
    { name: "Bibliothécaire", defaultPermission: 4, order: 12 },
    { name: "Stratège", defaultPermission: 5, order: 13 },
    { name: "Agent Dha", defaultPermission: 7, order: 14 },
    { name: "Ruus'alor", defaultPermission: 6, order: 15 },
    { name: "Ver'alor", defaultPermission: 8, order: 16 },
    { name: "Mand'alor", defaultPermission: 10, order: 17 },
  ];

  for (const g of gradesData) {
    await prisma.grade.create({ data: { ...g, clanId: parjai.id } });
  }

  // ─── Spécialisations Parjai ────────────────────────────────────────────────
  const specsData = [
    { name: "Kyramud", description: "Les guerriers du clan. Grades : Assassin → Chasseur de prime → Fantôme → Exécuteur.", defaultPermission: 1, secret: false, order: 1 },
    { name: "Goran", description: "Les forgerons du clan. Grades : Assistant → Forgeron → Forgeron Spécialiste → Maître Forgeron.", defaultPermission: 1, secret: false, order: 2 },
    { name: "Mirdala", description: "Les stratèges et érudits du clan. Grades : Érudit → Gardien du savoir → Bibliothécaire → Stratège.", defaultPermission: 1, secret: false, order: 3 },
    { name: "Dha", description: "Les services secrets du clan Parjai. Informations classifiées.", defaultPermission: 7, secret: true, order: 4 },
  ];

  for (const s of specsData) {
    await prisma.specialization.create({ data: { ...s, clanId: parjai.id } });
  }

  // ─── Canal général Parjai ──────────────────────────────────────────────────
  await prisma.channel.create({
    data: {
      clanId: parjai.id,
      name: "général",
      description: "Canal principal du clan Parjai",
      isPrivate: false,
    },
  });

  // ─── Canal inter-clans hub ─────────────────────────────────────────────────
  await prisma.channel.create({
    data: {
      clanId: null,
      name: "hub-général",
      description: "Canal public inter-clans du hub",
      isPrivate: false,
    },
  });

  // ─── Pages Parjai ──────────────────────────────────────────────────────────
  const pagesParjai = [
    { path: "accueil", label: "Accueil", minPermission: 0 },
    { path: "lore", label: "Lore", minPermission: 0 },
    { path: "regles", label: "Règles", minPermission: 0 },
    { path: "membres", label: "Membres", minPermission: 0 },
    { path: "recrutement", label: "Recrutement", minPermission: 0 },
    { path: "profil", label: "Profil", minPermission: 1 },
    { path: "messagerie", label: "Messagerie", minPermission: 1 },
    { path: "traducteur", label: "Traducteur Mando'a", minPermission: 1 },
    { path: "missions", label: "Missions", minPermission: 1 },
    { path: "missions-dha", label: "Missions Dha", minPermission: 7 },
    { path: "admin", label: "Dashboard Admin", minPermission: 10 },
  ];

  for (const p of pagesParjai) {
    await prisma.pagePermission.create({ data: { ...p, clanId: parjai.id } });
  }

  // ─── Admin hub ─────────────────────────────────────────────────────────────
  const adminPublicId = await generatePublicId();
  await prisma.user.create({
    data: {
      publicId: adminPublicId,
      username: "admin",
      passwordHash: hashSync("admin", 10),
      displayName: "Admin Hub",
      hubRole: "admin",
      role: "admin",
      clanId: null,       // sans clan (admin hub global)
      grade: "",
      specialization: "",
      permissionLevel: 10,
      mustChangePassword: false,
    },
  });

  console.log(`Seed V2 completed.`);
  console.log(`  Hub admin → username: admin / password: admin (publicId: ${adminPublicId})`);
  console.log(`  Clan Parjai créé (slug: parjai)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
