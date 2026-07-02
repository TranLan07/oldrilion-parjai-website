import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyChannelFollowers } from "@/lib/notify-followers";
import { publish } from "@/lib/sse-store";
import { translateWithAutoGenerate } from "@/lib/mandoa-auto";

type P = { params: Promise<{ slug: string; id: string }> };

export async function GET(_req: NextRequest, { params }: P) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { id } = await params;

    const channel = await prisma.channel.findUnique({ where: { id }, include: { members: true } });
    if (!channel) return NextResponse.json({ error: "Canal introuvable" }, { status: 404 });

    const isMember = channel.members.some(m => m.userId === session.user!.id);
    if (channel.isPrivate && !isMember) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    if (!channel.isPrivate && !isMember) {
      await prisma.channelMember.create({ data: { userId: session.user!.id, channelId: id } });
    }

    const userRecord = await prisma.user.findUnique({ where: { id: session.user.id }, select: { mandalorien: true } });
    const isMandalorien = userRecord?.mandalorien ?? false;

    const messages = await prisma.message.findMany({
      where: { channelId: id },
      include: { user: { select: { id: true, displayName: true, role: true, grade: true, anonymous: true, publicId: true } } },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    const sanitized = messages.map(m => ({
      ...m,
      originalContent: (m.mandoa && isMandalorien) ? m.originalContent : null,
    }));

    return NextResponse.json(sanitized);
  } catch (e) {
    console.error("GET messages error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: P) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { id } = await params;

    const channel = await prisma.channel.findUnique({ where: { id } });
    if (!channel) return NextResponse.json({ error: "Canal introuvable" }, { status: 404 });

    const membership = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: session.user.id, channelId: id } },
    });
    if (membership?.muted) return NextResponse.json({ error: "Vous êtes muté sur ce canal" }, { status: 403 });

    if (!channel.isPrivate && !membership) {
      await prisma.channelMember.create({ data: { userId: session.user.id, channelId: id } });
    }

    const body = await req.json();
    const content = body?.content;
    const useMandoa = !!body?.mandoa;
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }

    let finalContent = content.trim();
    let originalContent: string | null = null;

    if (useMandoa) {
      const userRecord2 = await prisma.user.findUnique({ where: { id: session.user.id }, select: { mandalorien: true } });
      if (userRecord2?.mandalorien) {
        originalContent = finalContent;
        finalContent = await translateWithAutoGenerate(finalContent);
      }
    }

    const message = await prisma.message.create({
      data: { content: finalContent, originalContent, mandoa: !!originalContent, userId: session.user.id, channelId: id },
      include: { user: { select: { id: true, displayName: true, role: true, grade: true, anonymous: true, publicId: true } } },
    });

    notifyChannelFollowers(id, message.user.displayName, content.trim()).catch(console.error);
    publish(id, { type: "message", message });
    return NextResponse.json(message);
  } catch (e) {
    console.error("POST message error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
