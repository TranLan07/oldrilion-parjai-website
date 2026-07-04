import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/sse-store";
import { translateWithAutoGenerate } from "@/lib/mandoa-auto";

type P = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const channel = await prisma.channel.findUnique({ where: { id, clanId: null } });
  if (!channel) return NextResponse.json({ error: "Canal introuvable" }, { status: 404 });

  // Vérification d'accès aux canaux privés (par clan ou par utilisateur)
  if (channel.isPrivate) {
    const accessUsers: string[] = JSON.parse(channel.accessUsers || "[]");
    let allowed = accessUsers.includes(session.user.id);
    if (!allowed) {
      const userRecord = await prisma.user.findUnique({ where: { id: session.user.id }, select: { clanId: true } });
      const accessClans: string[] = JSON.parse(channel.accessClans || "[]");
      allowed = !!userRecord?.clanId && accessClans.includes(userRecord.clanId);
    }
    if (!allowed) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Auto-join si pas encore membre
  const existing = await prisma.channelMember.findUnique({
    where: { userId_channelId: { userId: session.user.id, channelId: id } },
  });
  if (!existing) {
    await prisma.channelMember.create({ data: { userId: session.user.id, channelId: id } });
  }

  const userInfo = await prisma.user.findUnique({ where: { id: session.user.id }, select: { mandalorien: true } });
  const isMandalorien = userInfo?.mandalorien ?? false;

  const messages = await prisma.message.findMany({
    where: { channelId: id },
    include: { user: { select: { id: true, displayName: true, anonymous: true, publicId: true, grade: true, clanId: true, clan: { select: { name: true, colorPrimary: true } } } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  const sanitized = messages.map(m => ({ ...m, originalContent: (m.mandoa && isMandalorien) ? m.originalContent : null }));
  return NextResponse.json(sanitized);
}

export async function POST(req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const channel = await prisma.channel.findUnique({ where: { id, clanId: null } });
  if (!channel) return NextResponse.json({ error: "Canal introuvable" }, { status: 404 });

  if (channel.isPrivate) {
    const accessUsers: string[] = JSON.parse(channel.accessUsers || "[]");
    let allowed = accessUsers.includes(session.user.id);
    if (!allowed) {
      const userRecord = await prisma.user.findUnique({ where: { id: session.user.id }, select: { clanId: true } });
      const accessClans: string[] = JSON.parse(channel.accessClans || "[]");
      allowed = !!userRecord?.clanId && accessClans.includes(userRecord.clanId);
    }
    if (!allowed) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const membership = await prisma.channelMember.findUnique({
    where: { userId_channelId: { userId: session.user.id, channelId: id } },
  });
  if (membership?.muted) return NextResponse.json({ error: "Vous êtes muté" }, { status: 403 });

  if (!membership) {
    await prisma.channelMember.create({ data: { userId: session.user.id, channelId: id } });
  }

  const body = await req.json();
  const content = body?.content;
  const useMandoa = !!body?.mandoa;
  if (!content?.trim()) return NextResponse.json({ error: "Message vide" }, { status: 400 });

  let finalContent = content.trim();
  let originalContent: string | null = null;
  if (useMandoa) {
    const userMandoa = await prisma.user.findUnique({ where: { id: session.user.id }, select: { mandalorien: true } });
    if (userMandoa?.mandalorien) {
      originalContent = finalContent;
      finalContent = await translateWithAutoGenerate(finalContent);
    }
  }

  const message = await prisma.message.create({
    data: { content: finalContent, originalContent, mandoa: !!originalContent, userId: session.user.id, channelId: id },
    include: { user: { select: { id: true, displayName: true, anonymous: true, publicId: true, grade: true, clanId: true, clan: { select: { name: true, colorPrimary: true } } } } },
  });

  publish(id, { type: "message", message });
  return NextResponse.json(message);
}
