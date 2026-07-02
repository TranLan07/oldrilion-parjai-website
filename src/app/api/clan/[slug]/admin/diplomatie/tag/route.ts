import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClanAdmin, denied, notFound, resolveClan, suspendedResponse } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  if (!clan.premium) return NextResponse.json({ error: "Premium requis" }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const tag = await prisma.diplomacyTag.create({ data: { clanId: clan.id, name: name.trim() } });
  return NextResponse.json(tag, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const { id } = await req.json();
  await prisma.diplomacyTag.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
