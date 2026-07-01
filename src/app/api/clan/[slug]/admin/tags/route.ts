import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, resolveClan, denied, notFound } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  const clanTags = await prisma.clanTag.findMany({
    where: { clanId: clan.id },
    include: { tag: true },
  });
  return NextResponse.json(clanTags.map(ct => ct.tag));
}

export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();

  const { tagId } = await req.json();
  if (!tagId) return NextResponse.json({ error: "tagId requis" }, { status: 400 });

  // Vérifier la limite maxTagsPerClan
  const config = await prisma.hubConfig.findUnique({ where: { key: "maxTagsPerClan" } });
  const max = parseInt(config?.value ?? "5");
  const count = await prisma.clanTag.count({ where: { clanId: clan.id } });
  if (count >= max) return NextResponse.json({ error: `Maximum ${max} tags par clan` }, { status: 400 });

  await prisma.clanTag.upsert({
    where: { clanId_tagId: { clanId: clan.id, tagId } },
    create: { clanId: clan.id, tagId },
    update: {},
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  const { tagId } = await req.json();
  await prisma.clanTag.delete({ where: { clanId_tagId: { clanId: clan.id, tagId } } });
  return NextResponse.json({ success: true });
}
