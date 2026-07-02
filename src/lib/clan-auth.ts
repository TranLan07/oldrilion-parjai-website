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
  const permissionLevel = (s.permissionLevel as number) ?? 0;
  // Hub admin → accès à tout
  if (hubRole === "admin") return session;
  // Admin du clan concerné (permissionLevel >= 10)
  if (clanSlug === slug && permissionLevel >= 10) return session;
  return null;
}

export function denied() {
  return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
}

export function notFound() {
  return NextResponse.json({ error: "Clan introuvable" }, { status: 404 });
}

export function suspendedResponse() {
  return NextResponse.json({ error: "Ce clan est suspendu" }, { status: 403 });
}
