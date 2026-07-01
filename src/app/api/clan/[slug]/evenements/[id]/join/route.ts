import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ slug: string; id: string }> };

export async function POST(req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const { id } = await params;
  const { join } = await req.json();

  const event = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { members: true } } },
  });
  if (!event) return NextResponse.json({ error: "Evenement introuvable" }, { status: 404 });

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