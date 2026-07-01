import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { clanId: true } });
  const clanId = user?.clanId ?? null;

  const channels = await prisma.channel.findMany({
    where: {
      clanId: null,
      OR: [
        { isPrivate: false },
        // Canal privé : le clan de l'utilisateur est dans accessClans
        ...(clanId ? [{ isPrivate: true, accessClans: { contains: clanId } }] : []),
      ],
    },
    include: {
      members: { include: { user: { select: { id: true, displayName: true } } } },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(channels);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const hubRole = (session as unknown as Record<string, unknown>)?.hubRole as string;
  const perm = (session as unknown as Record<string, unknown>)?.permissionLevel as number ?? 0;
  const isHubAdmin = hubRole === "admin" || hubRole === "moderator";
  const isClanAdmin = perm >= 10;

  if (!isHubAdmin && !isClanAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { name, description, isPrivate, accessClans } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  // Canal privé : réservé aux admins hub ou admins de clan
  // Pour les admins de clan, leur clan est automatiquement inclus
  let clansArray: string[] = Array.isArray(accessClans) ? accessClans : [];
  if (isPrivate && isClanAdmin && !isHubAdmin) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { clanId: true } });
    if (user?.clanId && !clansArray.includes(user.clanId)) {
      clansArray = [user.clanId, ...clansArray];
    }
  }

  const channel = await prisma.channel.create({
    data: {
      name: name.trim(),
      description: description?.trim() ?? "",
      clanId: null,
      isPrivate: !!isPrivate,
      accessClans: JSON.stringify(clansArray),
    },
  });
  return NextResponse.json(channel);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const hubRole = (session as unknown as Record<string, unknown>)?.hubRole as string;
  if (!session?.user?.id || (hubRole !== "admin" && hubRole !== "moderator")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await req.json();
  await prisma.channel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
