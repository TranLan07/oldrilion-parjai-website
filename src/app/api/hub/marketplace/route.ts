import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const now = new Date();
  const listings = await prisma.marketplaceListing.findMany({
    where: { status: "active", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    include: {
      seller: { select: { id: true, displayName: true, anonymous: true, publicId: true } },
      clan: { select: { id: true, name: true, slug: true, colorBg: true, colorPrimary: true, colorAccent: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(listings);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { title, description, price, clanId } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  if (!price || price < 0) return NextResponse.json({ error: "Prix invalide" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { anonymous: true, hubRole: true, clanId: true } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  // Annonce clan : admin clan premium requis
  if (clanId) {
    if (user.clanId !== clanId) return NextResponse.json({ error: "Clan invalide" }, { status: 403 });
    const clan = await prisma.clan.findUnique({ where: { id: clanId }, select: { premium: true } });
    if (!clan?.premium) return NextResponse.json({ error: "Clan non premium" }, { status: 403 });
    // vérif admin clan
    const userFull = await prisma.user.findUnique({ where: { id: session.user.id }, select: { permissionLevel: true } });
    if ((userFull?.permissionLevel ?? 0) < 10) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  } else {
    // Joueur : 1 annonce par semaine glissante (sauf admin hub)
    if (user.hubRole === "member") {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recent = await prisma.marketplaceListing.count({ where: { sellerId: session.user.id, clanId: null, createdAt: { gt: weekAgo } } });
      if (recent > 0) return NextResponse.json({ error: "Limite : 1 annonce par semaine" }, { status: 429 });
    }
  }

  const expiresAt = clanId ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const listing = await prisma.marketplaceListing.create({
    data: { sellerId: session.user.id, clanId: clanId || null, title: title.trim(), description: description?.trim() || "", price: Number(price), anonymous: user.anonymous, expiresAt },
  });
  return NextResponse.json(listing, { status: 201 });
}
