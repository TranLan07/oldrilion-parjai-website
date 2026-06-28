import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const channels = await prisma.channel.findMany({
    where: {
      OR: [
        { isPrivate: false },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      members: {
        select: { muted: true, user: { select: { id: true, displayName: true } } },
      },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // For public channels, show all users as members
  const allUsers = await prisma.user.findMany({
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
      // Put registered members first (they have activity), then the rest
      allMembers.sort((a, b) => {
        const aReg = registeredIds.has(a.user.id) ? 0 : 1;
        const bReg = registeredIds.has(b.user.id) ? 0 : 1;
        return aReg - bReg;
      });
      return { ...ch, members: allMembers };
    }
    return ch;
  });

  return NextResponse.json(result);
}
