import { NextRequest, NextResponse } from "next/server";
import { requireHubAdmin, requireHubSuperAdmin, hubDenied } from "@/lib/hub-auth";
import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";
import { randomBytes } from "crypto";

// Génère un mot de passe lisible (sans caractères ambigus : 0/O, 1/l/I)
function generatePassword(len = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

const HUB_ROLES = ["member", "moderator", "admin"];

export async function GET(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const clanSlug = req.nextUrl.searchParams.get("clan");
  const where = clanSlug ? { clan: { slug: clanSlug } } : {};
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true, publicId: true, username: true, displayName: true,
      hubRole: true, role: true, clanId: true,
      clan: { select: { name: true, slug: true } },
      grade: true, specialization: true, permissionLevel: true,
      anonymous: true, mandalorien: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function PUT(req: NextRequest) {
  const session = await requireHubSuperAdmin();
  if (!session) return hubDenied();

  const body = await req.json();
  const { id, displayName, hubRole, permissionLevel, role, clanId, mandalorien, resetPassword } = body;
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, clanId: true } });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (typeof displayName === "string" && displayName.trim()) data.displayName = displayName.trim();
  if (hubRole && HUB_ROLES.includes(hubRole)) data.hubRole = hubRole;
  if (permissionLevel !== undefined) data.permissionLevel = Math.max(0, Math.floor(Number(permissionLevel) || 0));
  if (typeof role === "string" && role.trim()) data.role = role.trim();
  if (mandalorien !== undefined) data.mandalorien = Boolean(mandalorien);

  // Changement de clan (clanId = "" ou null → retrait du clan)
  if (clanId !== undefined) {
    const newClanId = clanId ? String(clanId) : null;
    if (newClanId) {
      const clan = await prisma.clan.findUnique({ where: { id: newClanId }, select: { id: true } });
      if (!clan) return NextResponse.json({ error: "Clan invalide" }, { status: 400 });
    }
    if (newClanId !== target.clanId) {
      // Réinitialise les champs liés à l'ancien clan
      data.clanId = newClanId;
      data.gradeId = null;
      data.specializationId = null;
      data.grade = "Recrue";
      data.specialization = "";
      data.publicSpecialization = "";
      if (newClanId) {
        data.mandalorien = true; // auto-mandalorien dans un clan
      } else {
        data.role = "membre";
        data.mandalorien = false;
      }
      if (permissionLevel === undefined) data.permissionLevel = 1;
    }
  }

  // Réinitialisation du mot de passe → renvoie le mot de passe généré à l'admin
  let tempPassword: string | undefined;
  if (resetPassword) {
    tempPassword = generatePassword();
    data.passwordHash = hashSync(tempPassword, 10);
    data.mustChangePassword = true;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ success: true, ...(tempPassword ? { tempPassword } : {}) });
}

export async function DELETE(req: NextRequest) {
  const session = await requireHubSuperAdmin();
  if (!session) return hubDenied();

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  if (id === session.user!.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Suppression impossible (données liées)" }, { status: 409 });
  }
  return NextResponse.json({ success: true });
}
