import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id },
    include: { seller: { select: { id: true, displayName: true, publicId: true } } },
  });
  if (!listing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (listing.status !== "active") return NextResponse.json({ error: "Annonce inactive" }, { status: 400 });
  if (listing.sellerId === session.user.id) return NextResponse.json({ error: "Vous êtes le vendeur" }, { status: 400 });

  const buyerId = session.user.id;
  const sellerId = listing.sellerId;

  // Créer ou récupérer un canal privé entre acheteur et vendeur
  const accessUsers = JSON.stringify([buyerId, sellerId].sort());
  let channel = await prisma.channel.findFirst({
    where: { clanId: null, isPrivate: true, accessUsers },
  });

  if (!channel) {
    const buyer = await prisma.user.findUnique({ where: { id: buyerId }, select: { displayName: true } });
    // Annonce anonyme : ne pas révéler le nom du vendeur dans le nom du canal
    const sellerLabel = listing.anonymous ? `Anonyme [${listing.seller.publicId}]` : listing.seller.displayName;
    channel = await prisma.channel.create({
      data: {
        clanId: null, isPrivate: true, accessUsers,
        name: `MP: ${buyer?.displayName} ↔ ${sellerLabel}`,
        description: `Canal privé créé depuis le Marketplace`,
      },
    });
    // Ajouter les deux membres
    for (const userId of [buyerId, sellerId]) {
      await prisma.channelMember.upsert({
        where: { userId_channelId: { userId, channelId: channel.id } },
        create: { userId, channelId: channel.id },
        update: {},
      });
    }
    // Message auto de référence
    await prisma.message.create({
      data: {
        channelId: channel.id, userId: buyerId,
        content: `[Marketplace] Demande de contact pour l'annonce : « ${listing.title} » (${listing.price} crédits)`,
      },
    });
  }

  return NextResponse.json({ channelId: channel.id });
}
