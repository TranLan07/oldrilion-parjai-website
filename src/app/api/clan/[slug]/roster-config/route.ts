import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveClan, notFound } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

// Grades et spécialisations d'un clan — utilisé par le panneau de mode debug
// pour proposer des valeurs réalistes à simuler.
export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();

  const [grades, specs] = await Promise.all([
    prisma.grade.findMany({ where: { clanId: clan.id }, select: { name: true, defaultPermission: true }, orderBy: { order: "asc" } }),
    prisma.specialization.findMany({ where: { clanId: clan.id }, select: { name: true }, orderBy: { order: "asc" } }),
  ]);
  const maxPermission = Math.max(10, ...grades.map(g => g.defaultPermission));

  return NextResponse.json({ grades, specs, maxPermission });
}
