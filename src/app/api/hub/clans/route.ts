import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clans = await prisma.clan.findMany({
    include: {
      tags: { include: { tag: true } },
      _count: { select: { members: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(clans);
}
