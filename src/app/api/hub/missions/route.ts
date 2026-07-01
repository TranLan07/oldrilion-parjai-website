import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const missions = await prisma.mission.findMany({
    where: { visibility: "global" },
    include: {
      clan: { select: { name: true, slug: true, colorPrimary: true } },
      members: { include: { user: { select: { id: true, displayName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(missions);
}
