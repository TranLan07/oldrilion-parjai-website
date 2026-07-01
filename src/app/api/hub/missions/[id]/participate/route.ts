import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const { participating } = await req.json();

  const mission = await prisma.mission.findUnique({ where: { id, visibility: "global" } });
  if (!mission) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
  if (mission.status !== "en_cours") return NextResponse.json({ error: "Mission non active" }, { status: 400 });

  const existing = await prisma.missionMember.findUnique({
    where: { userId_missionId: { userId: session.user.id, missionId: id } },
  });

  if (participating) {
    if (mission.maxParticipants > 0) {
      const count = await prisma.missionMember.count({ where: { missionId: id, participating: true } });
      if (count >= mission.maxParticipants && !existing?.participating) {
        return NextResponse.json({ error: "Mission complète" }, { status: 400 });
      }
    }
    await prisma.missionMember.upsert({
      where: { userId_missionId: { userId: session.user.id, missionId: id } },
      create: { userId: session.user.id, missionId: id, participating: true },
      update: { participating: true },
    });
  } else {
    if (existing) await prisma.missionMember.delete({ where: { id: existing.id } });
  }

  return NextResponse.json({ ok: true });
}
