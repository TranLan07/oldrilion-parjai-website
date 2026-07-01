import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, resolveClan, denied, notFound } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  const grades = await prisma.grade.findMany({ where: { clanId: clan.id }, include: { _count: { select: { users: true } } }, orderBy: { order: "asc" } });
  return NextResponse.json(grades);
}

export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  const { name, defaultPermission, order } = await req.json();
  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  const grade = await prisma.grade.create({ data: { clanId: clan.id, name, defaultPermission: defaultPermission || 1, order: order || 0 } });
  return NextResponse.json(grade);
}

export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const { id, name, defaultPermission, order } = await req.json();
  const grade = await prisma.grade.update({ where: { id }, data: { ...(name && { name }), ...(defaultPermission !== undefined && { defaultPermission }), ...(order !== undefined && { order }) } });
  return NextResponse.json(grade);
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const { id } = await req.json();
  await prisma.grade.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
