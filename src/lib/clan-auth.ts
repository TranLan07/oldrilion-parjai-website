import { auth } from "./auth";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";

export async function resolveClan(slug: string) {
  const clan = await prisma.clan.findUnique({ where: { slug } });
  return clan;
}

export async function requireClanAdmin(slug: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const s = session as unknown as Record<string, unknown>;
  const hubRole = s.hubRole as string;
  const clanSlug = s.clanSlug as string;
  const role = s.role as string;
  // Hub admin → accès à tout
  if (hubRole === "admin") return session;
  // Admin du clan concerné
  if (clanSlug === slug && role === "admin") return session;
  return null;
}

export function denied() {
  return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
}

export function notFound() {
  return NextResponse.json({ error: "Clan introuvable" }, { status: 404 });
}
