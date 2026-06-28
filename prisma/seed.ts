import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: "admin" } });
  if (existing) {
    console.log("Admin user already exists, skipping seed.");
    return;
  }

  // Grades
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
    await prisma.grade.create({ data: g });
  }

  // Specializations
  const specsData = [
    { name: "Kyramud", description: "Les guerriers du clan. Ils opèrent dans le crime pour le clan et pour Mandalore. Grades : Assassin → Chasseur de prime → Fantôme → Exécuteur.", defaultPermission: 1, secret: false, order: 1 },
    { name: "Goran", description: "Les forgerons du clan. Ils s'occupent de la forge, de l'entretien de l'équipement et de la base. Grades : Assistant → Forgeron → Forgeron Spécialiste → Maître Forgeron.", defaultPermission: 1, secret: false, order: 2 },
    { name: "Mirdala", description: "Les stratèges et érudits du clan. Ils opèrent dans la politique et les secrets du clan. Grades : Érudit → Gardien du savoir → Bibliothécaire → Stratège.", defaultPermission: 1, secret: false, order: 3 },
    { name: "Dha", description: "Les services secrets du clan Parjai. Informations classifiées.", defaultPermission: 7, secret: true, order: 4 },
  ];

  for (const s of specsData) {
    await prisma.specialization.create({ data: s });
  }

  await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: hashSync("admin", 10),
      displayName: "Alor Suprême",
      role: "admin",
      grade: "Mand'alor",
      specialization: "Commandement",
      permissionLevel: 10,
      mustChangePassword: false,
    },
  });

  // Pages — toutes les pages avec le bon niveau (0 = visiteur)
  await prisma.pagePermission.createMany({
    data: [
      { path: "/", label: "Accueil", minPermission: 0 },
      { path: "/lore", label: "Lore", minPermission: 0 },
      { path: "/regles", label: "Règles", minPermission: 0 },
      { path: "/membres", label: "Membres", minPermission: 0 },
      { path: "/recrutement", label: "Recrutement", minPermission: 0 },
      { path: "/login", label: "Connexion", minPermission: 0 },
      { path: "/profil", label: "Profil", minPermission: 1 },
      { path: "/messagerie", label: "Messagerie", minPermission: 1 },
      { path: "/traducteur", label: "Traducteur Mando'a", minPermission: 1 },
      { path: "/change-password", label: "Changement de mot de passe", minPermission: 1 },
      { path: "/missions", label: "Missions (standard)", minPermission: 1 },
      { path: "/missions?mode=dha", label: "Missions Dha (classifiées)", minPermission: 7 },
      { path: "/admin", label: "Dashboard Admin", minPermission: 10 },
    ],
  });

  await prisma.channel.create({
    data: { name: "général", description: "Canal principal du clan Parjai", isPrivate: false },
  });

  console.log("Seed completed: admin + grades + pages + general channel.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
