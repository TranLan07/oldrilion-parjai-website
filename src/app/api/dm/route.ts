import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateDmChannel } from "@/lib/dm";

// GET : liste des conversations privées de l'utilisateur (avec l'autre participant + dernier message).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const meId = session.user.id;

  const channels = await prisma.channel.findMany({
    where: { clanId: null, isPrivate: true, accessUsers: { contains: meId } },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true, createdAt: true, mandoa: true } },
      _count: { select: { messages: true } },
    },
  });

  const result = [];
  for (const ch of channels) {
    let ids: string[] = [];
    try { ids = JSON.parse(ch.accessUsers || "[]"); } catch { ids = []; }
    if (!ids.includes(meId)) continue; // garde-fou (contains est un substring)
    const otherId = ids.find(i => i !== meId);
    let other = null;
    if (otherId) {
      const u = await prisma.user.findUnique({
        where: { id: otherId },
        select: { id: true, displayName: true, publicId: true, anonymous: true, clan: { select: { name: true, colorPrimary: true } } },
      });
      if (u) other = { id: u.id, displayName: u.anonymous ? `Anonyme [${u.publicId}]` : u.displayName, publicId: u.publicId, clan: u.clan };
    }
    const last = ch.messages[0] ?? null;
    result.push({
      channelId: ch.id,
      other,
      lastMessage: last ? { content: last.mandoa ? "🔰 (Mando'a)" : last.content, createdAt: last.createdAt } : null,
      messageCount: ch._count.messages,
    });
  }

  result.sort((a, b) => {
    const ta = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const tb = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return tb - ta;
  });
  return NextResponse.json(result);
}

// POST { targetId } : ouvre (ou crée) la conversation privée avec un autre joueur.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const meId = session.user.id;

  const { targetId } = await req.json();
  if (!targetId) return NextResponse.json({ error: "Destinataire requis" }, { status: 400 });
  if (targetId === meId) return NextResponse.json({ error: "Vous ne pouvez pas vous écrire à vous-même" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const channel = await getOrCreateDmChannel(meId, targetId);
  return NextResponse.json({ channelId: channel.id });
}
