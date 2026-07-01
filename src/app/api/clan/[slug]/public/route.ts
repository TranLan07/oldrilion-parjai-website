import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  const clan = await prisma.clan.findUnique({
    where: { slug },
    select: { name: true, description: true, colorBg: true, colorPrimary: true, colorAccent: true },
  });
  if (!clan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(clan);
}
