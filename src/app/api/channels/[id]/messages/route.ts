import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyChannelFollowers } from "@/lib/notify-followers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await params;
    const channel = await prisma.channel.findUnique({ where: { id }, include: { members: true } });
    if (!channel) return NextResponse.json({ error: "Canal introuvable" }, { status: 404 });

    const isMember = channel.members.some((m) => m.userId === session.user!.id);

    if (channel.isPrivate && !isMember) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Auto-join public channels when viewing
    if (!channel.isPrivate && !isMember) {
      await prisma.channelMember.create({ data: { userId: session.user!.id, channelId: id } });
    }

    const messages = await prisma.message.findMany({
      where: { channelId: id },
      include: { user: { select: { id: true, displayName: true, role: true, grade: true } } },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return NextResponse.json(messages);
  } catch (e) {
    console.error("GET messages error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await params;

    // Check if channel exists
    const channel = await prisma.channel.findUnique({ where: { id } });
    if (!channel) return NextResponse.json({ error: "Canal introuvable" }, { status: 404 });

    // Check muted (only if user is a member — non-members on public channels can still post)
    const membership = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: session.user.id, channelId: id } },
    });
    if (membership?.muted) {
      return NextResponse.json({ error: "Vous êtes muté sur ce canal" }, { status: 403 });
    }

    // Auto-join public channels on first message
    if (!channel.isPrivate && !membership) {
      await prisma.channelMember.create({ data: { userId: session.user.id, channelId: id } });
    }

    const body = await req.json();
    const content = body?.content;
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: { content: content.trim(), userId: session.user.id, channelId: id },
      include: { user: { select: { id: true, displayName: true, role: true, grade: true } } },
    });

    // Fire-and-forget email notifications
    notifyChannelFollowers(id, message.user.displayName, content.trim()).catch(console.error);

    return NextResponse.json(message);
  } catch (e: unknown) {
    const err = e instanceof Error ? e.stack || e.message : String(e);
    console.error("POST message error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
