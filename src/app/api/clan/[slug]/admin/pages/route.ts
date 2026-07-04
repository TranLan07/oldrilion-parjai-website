import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, resolveClan, denied, notFound , suspendedResponse } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ slug: string }> };

// Pages standard d'un clan, avec leur niveau d'accès par défaut. Elles sont
// référencées automatiquement pour que l'admin puisse toutes les régler.
const DEFAULT_CLAN_PAGES: { path: string; label: string; minPermission: number; order: number }[] = [
  { path: "accueil", label: "Accueil", minPermission: 0, order: 1 },
  { path: "lore", label: "Lore", minPermission: 0, order: 2 },
  { path: "regles", label: "Règles", minPermission: 0, order: 3 },
  { path: "membres", label: "Membres", minPermission: 0, order: 4 },
  { path: "recrutement", label: "Recrutement", minPermission: 0, order: 5 },
  { path: "messagerie", label: "Messagerie", minPermission: 1, order: 6 },
  { path: "missions", label: "Missions", minPermission: 1, order: 7 },
  { path: "evenements", label: "Événements", minPermission: 1, order: 8 },
  { path: "banque", label: "Banque", minPermission: 1, order: 9 },
  { path: "diplomatie", label: "Diplomatie", minPermission: 1, order: 10 },
  { path: "profil", label: "Profil", minPermission: 1, order: 11 },
  { path: "admin", label: "Administration", minPermission: 10, order: 12 },
];

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  // Référence les pages standard manquantes avec leur niveau par défaut.
  const existing = await prisma.pagePermission.findMany({ where: { clanId: clan.id }, select: { path: true } });
  const existingPaths = new Set(existing.map(p => p.path));
  const missing = DEFAULT_CLAN_PAGES.filter(p => !existingPaths.has(p.path));
  for (const p of missing) {
    await prisma.pagePermission.upsert({
      where: { clanId_path: { clanId: clan.id, path: p.path } },
      create: { clanId: clan.id, path: p.path, label: p.label, minPermission: p.minPermission },
      update: {},
    });
  }

  const pages = await prisma.pagePermission.findMany({ where: { clanId: clan.id } });
  // Tri : ordre canonique des pages standard d'abord, puis les pages custom
  const orderOf = (path: string) => DEFAULT_CLAN_PAGES.find(p => p.path === path)?.order ?? 99;
  pages.sort((a, b) => orderOf(a.path) - orderOf(b.path) || a.path.localeCompare(b.path));
  return NextResponse.json(pages);
}

export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const { path, label, minPermission } = await req.json();
  if (!path || !label) return NextResponse.json({ error: "Chemin et label requis" }, { status: 400 });
  const page = await prisma.pagePermission.create({ data: { clanId: clan.id, path, label, minPermission: minPermission || 1 } });
  return NextResponse.json(page);
}

export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const { id, path, label, minPermission } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  const page = await prisma.pagePermission.update({ where: { id }, data: { ...(path && { path }), ...(label && { label }), ...(minPermission !== undefined && { minPermission }) } });
  return NextResponse.json(page);
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const { id } = await req.json();
  await prisma.pagePermission.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
