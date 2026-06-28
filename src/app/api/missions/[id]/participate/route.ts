import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const { participating } = await req.json();

  if (participating) {
    const mission = await prisma.mission.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });

    if (mission && mission.maxParticipants > 0 && mission._count.members >= mission.maxParticipants) {
      return NextResponse.json({ error: "Nombre maximum de participants atteint" }, { status: 400 });
    }

    await prisma.missionMember.upsert({
      where: { userId_missionId: { userId: session.user.id, missionId: id } },
      create: { userId: session.user.id, missionId: id, participating: true },
      update: { participating: true },
    });
  } else {
    await prisma.missionMember.deleteMany({
      where: { userId: session.user.id, missionId: id },
    });
  }

  return NextResponse.json({ success: true });
}
