import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveClan, notFound, suspendedResponse } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string; id: string }> };

export async function POST(req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { slug, id } = await params;
  const { participating } = await req.json();

  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  // Seuls les membres du clan peuvent participer à ses missions
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { clanId: true } });
  if (user?.clanId !== clan.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const mission = await prisma.mission.findUnique({ where: { id }, include: { _count: { select: { members: true } } } });
  if (!mission || mission.clanId !== clan.id) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });

  if (participating) {
    if (mission.maxParticipants > 0 && mission._count.members >= mission.maxParticipants) {
      return NextResponse.json({ error: "Nombre maximum de participants atteint" }, { status: 400 });
    }
    await prisma.missionMember.upsert({
      where: { userId_missionId: { userId: session.user.id, missionId: id } },
      create: { userId: session.user.id, missionId: id, participating: true },
      update: { participating: true },
    });
  } else {
    await prisma.missionMember.deleteMany({ where: { userId: session.user.id, missionId: id } });
  }
  return NextResponse.json({ success: true });
}
