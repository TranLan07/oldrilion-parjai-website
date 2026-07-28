import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClanAdmin, denied, notFound, resolveClan , suspendedResponse } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  return NextResponse.json({
    description: clan.description,
    logoUrl: clan.logoUrl,
    bannerUrl: clan.bannerUrl,
    colorBg: clan.colorBg,
    colorPrimary: clan.colorPrimary,
    colorAccent: clan.colorAccent,
    colorText: clan.colorText,
    colorCard: clan.colorCard,
    anonRevealLevel: clan.anonRevealLevel,
    premium: clan.premium,
    suspended: clan.suspended,
    profilesPublic: clan.profilesPublic,
    websiteUrl: clan.websiteUrl,
    classifiedColor: clan.classifiedColor,
    classifiedColorMode: clan.classifiedColorMode,
  });
}

export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const { description, colorBg, colorPrimary, colorAccent, colorText, colorCard, anonRevealLevel, profilesPublic, websiteUrl, classifiedColor, classifiedColorMode } = await req.json();
  const data: Record<string, unknown> = {};
  if (description !== undefined) data.description = description;
  if (colorBg) data.colorBg = colorBg;
  if (colorPrimary) data.colorPrimary = colorPrimary;
  if (colorAccent) data.colorAccent = colorAccent;
  if (anonRevealLevel !== undefined) data.anonRevealLevel = Number(anonRevealLevel);
  if (profilesPublic !== undefined) data.profilesPublic = Boolean(profilesPublic);
  if (websiteUrl !== undefined) {
    const trimmed = String(websiteUrl).trim();
    if (!trimmed) {
      data.websiteUrl = "";
    } else {
      const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      try {
        data.websiteUrl = new URL(withScheme).toString();
      } catch {
        return NextResponse.json({ error: "Lien du site invalide" }, { status: 400 });
      }
    }
  }
  // Personnalisation avancée réservée aux clans premium
  if (clan.premium) {
    if (colorText) data.colorText = colorText;
    if (colorCard) data.colorCard = colorCard;
    if (classifiedColor !== undefined) data.classifiedColor = classifiedColor ? String(classifiedColor) : null;
    if (classifiedColorMode !== undefined && ["fixed", "role"].includes(classifiedColorMode)) data.classifiedColorMode = classifiedColorMode;
  }

  const updated = await prisma.clan.update({ where: { id: clan.id }, data });
  return NextResponse.json(updated);
}