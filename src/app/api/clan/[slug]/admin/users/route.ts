import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, resolveClan, denied, notFound , suspendedResponse } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";

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

export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const { id, gradeId, specializationId, grade, specialization, role, permissionLevel, displayName } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
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
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  const clan2 = await resolveClan(slug);
  if (!clan2) return notFound();
  const target2 = await prisma.user.findUnique({ where: { id }, select: { clanId: true } });
  if (!target2 || target2.clanId !== clan2.id) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
