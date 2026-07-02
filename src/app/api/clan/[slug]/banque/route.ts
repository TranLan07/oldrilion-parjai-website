import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveClan, notFound, suspendedResponse } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

async function getEffectivePerm(slug: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { permissionLevel: true, clanId: true } });
  const clan = await resolveClan(slug);
  if (!clan || !user || user.clanId !== clan.id) return { perm: 0, clan: null };
  return { perm: user.permissionLevel, clan };
}

async function checkPagePerm(clanId: string, path: string, userPerm: number): Promise<boolean> {
  const pp = await prisma.pagePermission.findUnique({ where: { clanId_path: { clanId, path } } });
  return userPerm >= (pp?.minPermission ?? 1);
}

export async function GET(_: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const { perm } = await getEffectivePerm(slug, session.user.id);
  const canView = await checkPagePerm(clan.id, "banque", perm) || perm >= 10;
  if (!canView) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const canViewHistory = clan.premium
    ? (await checkPagePerm(clan.id, "banque_historique", perm) || perm >= 10)
    : perm >= 10;

  const transactions = canViewHistory
    ? await prisma.clanBankTransaction.findMany({
        where: { clanId: clan.id },
        include: { author: { select: { id: true, displayName: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];

  return NextResponse.json({ balance: clan.bankBalance, transactions, premium: clan.premium, perm });
}

export async function POST(req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const { type, amount, label } = await req.json();
  if (!["depot", "retrait"].includes(type)) return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  if (!amount || amount <= 0) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });

  const { perm } = await getEffectivePerm(slug, session.user.id);
  if (perm < 1) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const permPath = type === "depot" ? "banque_depot" : "banque_retrait";
  const canAct = clan.premium
    ? (await checkPagePerm(clan.id, permPath, perm) || perm >= 10)
    : perm >= 10;
  if (!canAct) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  if (type === "retrait") {
    if (clan.premium && !label?.trim()) return NextResponse.json({ error: "Justificatif obligatoire (clan premium)" }, { status: 400 });
    if (clan.bankBalance < amount) return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
  }

  const [tx] = await prisma.$transaction([
    prisma.clanBankTransaction.create({
      data: { clanId: clan.id, type, amount: Number(amount), label: label?.trim() || null, authorId: session.user.id },
    }),
    prisma.clan.update({
      where: { id: clan.id },
      data: { bankBalance: { [type === "depot" ? "increment" : "decrement"]: Number(amount) } },
    }),
  ]);

  return NextResponse.json(tx);
}
