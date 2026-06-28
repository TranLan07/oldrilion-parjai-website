import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-check";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const sections = await prisma.loreSection.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(sections);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const { order, title, description } = await req.json();
  const section = await prisma.loreSection.create({ data: { order: order || 0, title, description } });
  return NextResponse.json(section);
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const { id, ...data } = await req.json();
  const section = await prisma.loreSection.update({ where: { id }, data });
  return NextResponse.json(section);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const { id } = await req.json();
  await prisma.loreSection.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
