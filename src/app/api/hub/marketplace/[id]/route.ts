import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  const listing = await prisma.marketplaceListing.findUnique({ where: { id }, select: { sellerId: true, clanId: true } });
  if (!listing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { hubRole: true, permissionLevel: true, clanId: true } });
  const isOwner = listing.sellerId === session.user.id || (listing.clanId && listing.clanId === user?.clanId && (user?.permissionLevel ?? 0) >= 10);
  const isHubAdmin = user?.hubRole === "admin" || user?.hubRole === "moderator";

  if (!isOwner && !isHubAdmin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const updated = await prisma.marketplaceListing.update({ where: { id }, data: { status } });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const listing = await prisma.marketplaceListing.findUnique({ where: { id }, select: { sellerId: true, clanId: true } });
  if (!listing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { hubRole: true, permissionLevel: true, clanId: true } });
  const isOwner = listing.sellerId === session.user.id || (listing.clanId && listing.clanId === user?.clanId && (user?.permissionLevel ?? 0) >= 10);
  const isHubAdmin = user?.hubRole === "admin" || user?.hubRole === "moderator";

  if (!isOwner && !isHubAdmin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  await prisma.marketplaceListing.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
