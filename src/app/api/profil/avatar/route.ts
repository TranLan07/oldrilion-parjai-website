import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedImage, deleteUploadedImage } from "@/lib/upload";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  const result = await saveUploadedImage(file, "avatar");
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });
  await deleteUploadedImage(user?.avatarUrl);
  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: result.url } });

  return NextResponse.json({ success: true, url: result.url });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });
  await deleteUploadedImage(user?.avatarUrl);
  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: null } });

  return NextResponse.json({ success: true });
}
