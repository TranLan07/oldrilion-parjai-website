import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-check";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const specs = await prisma.specialization.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(specs);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const { name, description, defaultPermission, secret, order } = await req.json();
  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  const spec = await prisma.specialization.create({
    data: { name, description: description || "", defaultPermission: defaultPermission || 1, secret: secret || false, order: order || 0 },
  });
  return NextResponse.json(spec);
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const { id, ...data } = await req.json();
  const spec = await prisma.specialization.update({ where: { id }, data });
  return NextResponse.json(spec);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const { id } = await req.json();
  await prisma.specialization.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
