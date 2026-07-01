import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClanAdmin, denied, notFound, resolveClan } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  return NextResponse.json({
    description: clan.description,
    colorBg: clan.colorBg,
    colorPrimary: clan.colorPrimary,
    colorAccent: clan.colorAccent,
    anonRevealLevel: clan.anonRevealLevel,
  });
}

export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();

  const { description, colorBg, colorPrimary, colorAccent, anonRevealLevel } = await req.json();
  const data: Record<string, unknown> = {};
  if (description !== undefined) data.description = description;
  if (colorBg) data.colorBg = colorBg;
  if (colorPrimary) data.colorPrimary = colorPrimary;
  if (colorAccent) data.colorAccent = colorAccent;
  if (anonRevealLevel !== undefined) data.anonRevealLevel = Number(anonRevealLevel);

  const updated = await prisma.clan.update({ where: { id: clan.id }, data });
  return NextResponse.json(updated);
}