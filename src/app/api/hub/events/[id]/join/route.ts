import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id, hubStatus: "approved" } });
  if (!event) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });

  const { join } = await req.json();

  if (join) {
    if (event.maxParticipants) {
      const count = await prisma.eventMember.count({ where: { eventId: id } });
      if (count >= event.maxParticipants) return NextResponse.json({ error: "Événement complet" }, { status: 400 });
    }
    await prisma.eventMember.upsert({
      where: { userId_eventId: { userId: session.user.id, eventId: id } },
      create: { userId: session.user.id, eventId: id },
      update: {},
    });
  } else {
    await prisma.eventMember.deleteMany({ where: { userId: session.user.id, eventId: id } });
  }

  return NextResponse.json({ ok: true });
}
