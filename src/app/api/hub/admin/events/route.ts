import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isHubAdmin(session: unknown) {
  const role = (session as Record<string, unknown>)?.hubRole as string;
  return role === "admin" || role === "moderator";
}

// GET: toutes les événements pending + approved (pour admin)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isHubAdmin(session)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const events = await prisma.event.findMany({
    where: { hubStatus: { in: ["pending", "approved"] } },
    include: {
      clan: { select: { name: true, slug: true, colorPrimary: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(events);
}

// POST: créer un événement hub directement (hubStatus = "approved")
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !isHubAdmin(session)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { title, description, maxParticipants, startAt } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

  const event = await prisma.event.create({
    data: {
      title: title.trim(),
      description: description?.trim() ?? "",
      visibility: "global",
      hubStatus: "approved",
      clanId: null,
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
      startAt: startAt ? new Date(startAt) : null,
    },
  });
  return NextResponse.json(event);
}

// PUT: approuver / rejeter / modifier statut
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !isHubAdmin(session)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id, hubStatus, status } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  await prisma.event.update({
    where: { id },
    data: {
      ...(hubStatus && { hubStatus }),
      ...(status && { status }),
    },
  });
  return NextResponse.json({ ok: true });
}

// DELETE: supprimer un événement hub OU retirer du hub (clan event -> hubStatus = "none")
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !isHubAdmin(session)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await req.json();
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });

  if (event.clanId !== null) {
    // Événement de clan : on retire du hub (hubStatus = "none")
    await prisma.event.update({ where: { id }, data: { hubStatus: "none" } });
  } else {
    // Événement hub natif : suppression complète
    await prisma.event.delete({ where: { id } });
  }
  return NextResponse.json({ ok: true });
}
