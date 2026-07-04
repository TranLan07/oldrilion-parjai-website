import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, resolveClan, denied, notFound, suspendedResponse } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const specs = await prisma.specialization.findMany({ where: { clanId: clan.id }, include: { _count: { select: { users: true } } }, orderBy: { order: "asc" } });
  return NextResponse.json(specs);
}

export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const { name, description, defaultPermission, secret, color, order } = await req.json();
  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  if (secret && !clan.premium) return NextResponse.json({ error: "Les spécialisations secrètes sont une fonctionnalité premium." }, { status: 403 });
  if (color && !clan.premium) return NextResponse.json({ error: "La couleur custom est une fonctionnalité premium." }, { status: 403 });
  const spec = await prisma.specialization.create({
    data: { clanId: clan.id, name, description: description || "", defaultPermission: defaultPermission || 1, secret: secret || false, color: clan.premium ? (color || null) : null, order: order || 0 },
  });
  return NextResponse.json(spec);
}

export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const { id, ...data } = await req.json();
  if (data.secret && !clan.premium) return NextResponse.json({ error: "Les spécialisations secrètes sont une fonctionnalité premium." }, { status: 403 });
  if (data.color && !clan.premium) delete data.color;
  const spec = await prisma.specialization.update({ where: { id }, data });
  return NextResponse.json(spec);
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const { id } = await req.json();
  await prisma.specialization.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
