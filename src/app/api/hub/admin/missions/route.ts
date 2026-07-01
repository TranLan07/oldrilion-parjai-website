import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isHubAdmin(session: unknown) {
  const role = (session as Record<string, unknown>)?.hubRole as string;
  return role === "admin" || role === "moderator";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isHubAdmin(session)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const missions = await prisma.mission.findMany({
    where: { visibility: "global" },
    include: { clan: { select: { name: true, slug: true, colorPrimary: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(missions);
}

// Créer une mission hub (clanId null)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !isHubAdmin(session)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { title, description, maxParticipants } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

  const mission = await prisma.mission.create({
    data: {
      title: title.trim(),
      description: description?.trim() ?? "",
      visibility: "global",
      clanId: null,
      maxParticipants: parseInt(maxParticipants) || 0,
    },
  });
  return NextResponse.json(mission);
}

// Retirer du global (une mission de clan) ou supprimer (mission hub)
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !isHubAdmin(session)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id, status } = await req.json();
  const mission = await prisma.mission.findUnique({ where: { id } });
  if (!mission) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });

  if (status) {
    // Mise à jour statut pour les missions hub
    await prisma.mission.update({ where: { id }, data: { status } });
  } else {
    // Retirer du hub global (mission de clan -> redevient interne)
    await prisma.mission.update({ where: { id }, data: { visibility: "internal" } });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !isHubAdmin(session)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await req.json();
  const mission = await prisma.mission.findUnique({ where: { id } });
  if (!mission) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });

  if (mission.clanId !== null) {
    return NextResponse.json({ error: "Utilisez PUT pour retirer une mission de clan du hub" }, { status: 400 });
  }
  await prisma.mission.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
