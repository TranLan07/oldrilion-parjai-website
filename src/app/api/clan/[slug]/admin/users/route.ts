import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, resolveClan, denied, notFound , suspendedResponse } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";
import { generatePublicId } from "@/lib/public-id";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const users = await prisma.user.findMany({
    where: { clanId: clan.id },
    select: { id: true, publicId: true, username: true, displayName: true, role: true, grade: true, gradeId: true, specialization: true, specializationId: true, permissionLevel: true, mustChangePassword: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

// Création directe d'un accès membre par un admin (clan ou hub) — sans passer par le
// formulaire de recrutement. Attribue un grade/une spécialisation et un mot de passe
// temporaire, et rattache immédiatement le compte à ce clan.
export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const { displayName, username, gradeId, specializationId } = await req.json();
  if (!displayName?.trim() || !username?.trim()) {
    return NextResponse.json({ error: "Nom affiché et identifiant requis" }, { status: 400 });
  }
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  if (!cleanUsername) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { username: cleanUsername } });
  if (existing) return NextResponse.json({ error: "Cet identifiant est déjà utilisé" }, { status: 409 });

  const grade = gradeId ? await prisma.grade.findFirst({ where: { id: gradeId, clanId: clan.id } }) : null;
  if (gradeId && !grade) return NextResponse.json({ error: "Grade invalide" }, { status: 400 });
  const spec = specializationId ? await prisma.specialization.findFirst({ where: { id: specializationId, clanId: clan.id } }) : null;
  if (specializationId && !spec) return NextResponse.json({ error: "Spécialisation invalide" }, { status: 400 });

  const permissionLevel = Math.max(grade?.defaultPermission ?? 0, spec?.defaultPermission ?? 0, 1);
  const tempPassword = Math.random().toString(36).slice(2, 10);
  const publicId = await generatePublicId();

  const user = await prisma.user.create({
    data: {
      publicId, username: cleanUsername,
      passwordHash: hashSync(tempPassword, 10),
      displayName: displayName.trim(),
      clanId: clan.id,
      role: "membre",
      gradeId: grade?.id ?? null, grade: grade?.name ?? "Recrue",
      specializationId: spec?.id ?? null, specialization: spec?.name ?? "",
      permissionLevel,
      mustChangePassword: true,
      mandalorien: true,
    },
  });

  const generalChannel = await prisma.channel.findFirst({ where: { clanId: clan.id, name: "général" } });
  if (generalChannel) {
    await prisma.channelMember.create({ data: { userId: user.id, channelId: generalChannel.id } }).catch(() => {});
  }

  return NextResponse.json({ success: true, username: user.username, tempPassword, publicId: user.publicId });
}

export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const { id, gradeId, specializationId, grade, specialization, role, permissionLevel, displayName } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id }, select: { clanId: true } });
  if (!target || target.clanId !== clan.id) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const user = await prisma.user.update({ where: { id }, data: {
    ...(displayName && { displayName }),
    ...(role && { role }),
    ...(grade !== undefined && { grade }),
    ...(gradeId !== undefined && { gradeId }),
    ...(specialization !== undefined && { specialization }),
    ...(specializationId !== undefined && { specializationId }),
    ...(permissionLevel !== undefined && { permissionLevel }),
  }});
  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  const clan2 = await resolveClan(slug);
  if (!clan2) return notFound();
  const target2 = await prisma.user.findUnique({ where: { id }, select: { clanId: true } });
  if (!target2 || target2.clanId !== clan2.id) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
