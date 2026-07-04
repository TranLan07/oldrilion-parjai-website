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
  const pages = await prisma.pagePermission.findMany({ where: { clanId: clan.id }, orderBy: { path: "asc" } });
  return NextResponse.json(pages);
}

export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const { path, label, minPermission } = await req.json();
  if (!path || !label) return NextResponse.json({ error: "Chemin et label requis" }, { status: 400 });
  const page = await prisma.pagePermission.create({ data: { clanId: clan.id, path, label, minPermission: minPermission || 1 } });
  return NextResponse.json(page);
}

export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const { id, path, label, minPermission } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  const page = await prisma.pagePermission.update({ where: { id }, data: { ...(path && { path }), ...(label && { label }), ...(minPermission !== undefined && { minPermission }) } });
  return NextResponse.json(page);
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const { id } = await req.json();
  await prisma.pagePermission.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
