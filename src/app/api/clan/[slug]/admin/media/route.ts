import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClanAdmin, resolveClan, denied, notFound, suspendedResponse } from "@/lib/clan-auth";
import { saveUploadedImage, deleteUploadedImage } from "@/lib/upload";

type P = { params: Promise<{ slug: string }> };

const FIELD: Record<string, "logoUrl" | "bannerUrl"> = { logo: "logoUrl", banner: "bannerUrl" };

export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const form = await req.formData();
  const type = String(form.get("type") ?? "");
  const field = FIELD[type];
  if (!field) return NextResponse.json({ error: "Type invalide (logo ou banner attendu)" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  const result = await saveUploadedImage(file, type === "logo" ? "clan-logo" : "clan-banner");
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  await deleteUploadedImage(clan[field]);
  await prisma.clan.update({ where: { id: clan.id }, data: { [field]: result.url } });

  return NextResponse.json({ success: true, url: result.url });
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const { type } = await req.json();
  const field = FIELD[type];
  if (!field) return NextResponse.json({ error: "Type invalide (logo ou banner attendu)" }, { status: 400 });

  await deleteUploadedImage(clan[field]);
  await prisma.clan.update({ where: { id: clan.id }, data: { [field]: null } });

  return NextResponse.json({ success: true });
}
