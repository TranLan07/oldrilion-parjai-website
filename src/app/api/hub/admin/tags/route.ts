import { NextRequest, NextResponse } from "next/server";
import { requireHubAdmin, hubDenied } from "@/lib/hub-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await requireHubAdmin())) return hubDenied();
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { clans: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  const existing = await prisma.tag.findUnique({ where: { name: name.trim() } });
  if (existing) return NextResponse.json({ error: "Ce tag existe déjà" }, { status: 409 });
  const tag = await prisma.tag.create({ data: { name: name.trim() } });
  return NextResponse.json(tag);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const { id } = await req.json();
  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
