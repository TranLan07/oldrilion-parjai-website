import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const events = await prisma.event.findMany({
    where: { hubStatus: "approved" },
    include: {
      clan: { select: { name: true, slug: true, colorPrimary: true } },
      specialization: { select: { name: true } },
      members: { include: { user: { select: { id: true, displayName: true } } } },
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json(events);
}
