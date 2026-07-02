import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveClan, notFound , suspendedResponse } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const perm = ((session as unknown as Record<string, unknown>)?.permissionLevel as number) || 0;
  const clanSlug = (session as unknown as Record<string, unknown>)?.clanSlug as string | null;

  // visibility: internal = membres clan seulement; private = membres inscrits; global = tous auth
  const isMember = clanSlug === slug || perm >= 10;

  const events = await prisma.event.findMany({
    where: {
      clanId: clan.id,
      OR: [
        { visibility: "global" },
        { visibility: "internal", ...(isMember ? {} : { id: { in: [] } }) },
        { visibility: "private", members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      specialization: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, displayName: true } } } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(events);
}