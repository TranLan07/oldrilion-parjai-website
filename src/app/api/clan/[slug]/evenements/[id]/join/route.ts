import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveClan, notFound, suspendedResponse } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string; id: string }> };

export async function POST(req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const { slug, id } = await params;
  const { join } = await req.json();

  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  // Seuls les membres du clan peuvent rejoindre ses événements
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { clanId: true } });
  if (user?.clanId !== clan.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const event = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { members: true } } },
  });
  if (!event || event.clanId !== clan.id) return NextResponse.json({ error: "Evenement introuvable" }, { status: 404 });

  if (join) {
    if (event.maxParticipants && event._count.members >= event.maxParticipants) {
      return NextResponse.json({ error: "Evenement complet" }, { status: 400 });
    }
    await prisma.eventMember.upsert({
      where: { userId_eventId: { userId: session.user.id, eventId: id } },
      create: { userId: session.user.id, eventId: id },
      update: {},
    });
  } else {
    await prisma.eventMember.deleteMany({ where: { userId: session.user.id, eventId: id } });
  }

  return NextResponse.json({ success: true });
}
