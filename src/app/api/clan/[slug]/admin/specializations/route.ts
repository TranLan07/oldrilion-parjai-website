import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, resolveClan, denied, notFound } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  const specs = await prisma.specialization.findMany({ where: { clanId: clan.id }, include: { _count: { select: { users: true } } }, orderBy: { order: "asc" } });
  return NextResponse.json(specs);
}

export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  const { name, description, defaultPermission, secret, order } = await req.json();
  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  const spec = await prisma.specialization.create({ data: { clanId: clan.id, name, description: description || "", defaultPermission: defaultPermission || 1, secret: secret || false, order: order || 0 } });
  return NextResponse.json(spec);
}

export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const { id, ...data } = await req.json();
  const spec = await prisma.specialization.update({ where: { id }, data });
  return NextResponse.json(spec);
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const { id } = await req.json();
  await prisma.specialization.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
