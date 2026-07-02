import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClanAdmin, denied, notFound, resolveClan, suspendedResponse } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const entries = await prisma.diplomacyEntry.findMany({
    where: { clanId: clan.id },
    include: {
      targetClan: { select: { id: true, name: true, slug: true, colorPrimary: true } },
      tags: true,
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  const tags = await prisma.diplomacyTag.findMany({ where: { clanId: clan.id }, orderBy: { name: "asc" } });
  const allClans = await prisma.clan.findMany({ where: { suspended: false }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });

  return NextResponse.json({ entries, tags, allClans, premium: clan.premium });
}

export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const { type, targetClanId, customName, order, tagIds } = await req.json();
  if (!["allie", "ennemi"].includes(type)) return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  if (!targetClanId && !customName?.trim()) return NextResponse.json({ error: "Cible requise" }, { status: 400 });

  const entry = await prisma.diplomacyEntry.create({
    data: {
      clanId: clan.id, type,
      targetClanId: targetClanId || null,
      customName: targetClanId ? null : customName.trim(),
      order: order || 0,
      tags: (clan.premium && tagIds?.length)
        ? { connect: (tagIds as string[]).map((id: string) => ({ id })) }
        : undefined,
    },
    include: { targetClan: { select: { id: true, name: true, slug: true, colorPrimary: true } }, tags: true },
  });
  return NextResponse.json(entry, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const { id, type, targetClanId, customName, order, tagIds } = await req.json();

  const entry = await prisma.diplomacyEntry.update({
    where: { id },
    data: {
      ...(type && { type }),
      ...(targetClanId !== undefined && { targetClanId: targetClanId || null }),
      ...(customName !== undefined && { customName: targetClanId ? null : customName?.trim() || null }),
      ...(order !== undefined && { order }),
      ...(clan.premium && tagIds !== undefined && { tags: { set: (tagIds as string[]).map((id: string) => ({ id })) } }),
    },
    include: { targetClan: { select: { id: true, name: true, slug: true, colorPrimary: true } }, tags: true },
  });
  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const { id, tagId } = await req.json();

  if (tagId) {
    await prisma.diplomacyTag.delete({ where: { id: tagId } });
  } else {
    await prisma.diplomacyEntry.delete({ where: { id } });
  }
  return NextResponse.json({ success: true });
}
