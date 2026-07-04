import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveClan, notFound, suspendedResponse } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

// Marketplace d'un clan : les annonces publiées au nom du clan (premium).
export async function GET(_: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const listings = await prisma.marketplaceListing.findMany({
    where: { clanId: clan.id },
    include: { seller: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { clanId: true, permissionLevel: true, hubRole: true },
  });
  const isHubAdmin = user?.hubRole === "admin";
  const canManage = clan.premium && ((user?.clanId === clan.id && (user?.permissionLevel ?? 0) >= 10) || isHubAdmin);

  return NextResponse.json({
    listings,
    premium: clan.premium,
    canManage,
    clanId: clan.id,
    colorPrimary: clan.colorPrimary,
  });
}
