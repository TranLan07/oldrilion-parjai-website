import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveClan, notFound, suspendedResponse } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const channels = await prisma.channel.findMany({
    where: {
      clanId: clan.id,
      OR: [
        { isPrivate: false },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      members: { select: { muted: true, user: { select: { id: true, displayName: true } } } },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "asc" },
    // Freemium : canaux supplémentaires masqués si non-premium
    ...(!clan.premium ? { take: 1 } : {}),
  });

  const allUsers = await prisma.user.findMany({
    where: { clanId: clan.id },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
  });

  const result = channels.map(ch => {
    if (!ch.isPrivate) {
      const registeredIds = new Set(ch.members.map(m => m.user.id));
      const allMembers = allUsers.map(u => ({
        muted: ch.members.find(m => m.user.id === u.id)?.muted || false,
        user: { id: u.id, displayName: u.displayName },
      }));
      allMembers.sort((a, b) => (registeredIds.has(a.user.id) ? 0 : 1) - (registeredIds.has(b.user.id) ? 0 : 1));
      return { ...ch, members: allMembers };
    }
    return ch;
  });

  return NextResponse.json(result);
}
