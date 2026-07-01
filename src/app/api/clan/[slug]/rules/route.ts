import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveClan, notFound } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  const sections = await prisma.ruleSection.findMany({ where: { clanId: clan.id }, orderBy: { order: "asc" } });
  return NextResponse.json(sections);
}
