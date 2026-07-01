import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const channels = await prisma.channel.findMany({
    where: { clanId: null },
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
  const hubRole = (session as unknown as Record<string, unknown>)?.hubRole as string;
  if (!session?.user?.id || (hubRole !== "admin" && hubRole !== "moderator")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const channel = await prisma.channel.create({
    data: { name: name.trim(), description: description?.trim() ?? "", clanId: null, isPrivate: false },
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
