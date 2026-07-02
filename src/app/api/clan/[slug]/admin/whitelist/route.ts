import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClanAdmin, denied, notFound, resolveClan , suspendedResponse } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const wl = await prisma.clanWhitelist.findMany({
    where: { clanId: clan.id },
    include: { user: { select: { id: true, publicId: true, displayName: true, username: true, clan: { select: { name: true, colorPrimary: true } } } } },
    orderBy: { user: { displayName: "asc" } },
  });
  return NextResponse.json(wl);
}

export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const { publicId, accessLevel } = await req.json();
  if (!publicId?.trim()) return NextResponse.json({ error: "PublicId requis" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { publicId: publicId.trim().toUpperCase() } });
  if (!user) return NextResponse.json({ error: "Aucun utilisateur avec cet identifiant" }, { status: 404 });

  const entry = await prisma.clanWhitelist.upsert({
    where: { clanId_userId: { clanId: clan.id, userId: user.id } },
    create: { clanId: clan.id, userId: user.id, accessLevel: Number(accessLevel) || 1 },
    update: { accessLevel: Number(accessLevel) || 1 },
    include: { user: { select: { id: true, publicId: true, displayName: true, username: true, clan: { select: { name: true, colorPrimary: true } } } } },
  });
  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const { id } = await req.json();
  const entry = await prisma.clanWhitelist.findUnique({ where: { id } });
  if (!entry || entry.clanId !== clan.id) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await prisma.clanWhitelist.delete({ where: { id } });
  return NextResponse.json({ success: true });
}