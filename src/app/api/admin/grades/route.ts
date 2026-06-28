import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-check";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const grades = await prisma.grade.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(grades);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const { name, defaultPermission, order } = await req.json();
  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  const grade = await prisma.grade.create({
    data: { name, defaultPermission: defaultPermission || 1, order: order || 0 },
  });
  return NextResponse.json(grade);
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const { id, ...data } = await req.json();
  const grade = await prisma.grade.update({ where: { id }, data });
  return NextResponse.json(grade);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const { id } = await req.json();
  await prisma.grade.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
