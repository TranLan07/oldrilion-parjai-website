import { NextRequest, NextResponse } from "next/server";
import { requireHubAdmin, hubDenied } from "@/lib/hub-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await requireHubAdmin())) return hubDenied();
  const entries = await prisma.dictionaryEntry.findMany({ orderBy: { french: "asc" } });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const { french, mandoa, force } = await req.json();
  if (!french?.trim() || !mandoa?.trim()) return NextResponse.json({ error: "Les deux champs sont requis" }, { status: 400 });
  const key = french.trim().toLowerCase();
  const existing = await prisma.dictionaryEntry.findUnique({ where: { french: key } });
  if (existing && !force) return NextResponse.json({ conflict: true, existing, message: `"${key}" existe déjà avec "${existing.mandoa}".` }, { status: 409 });
  if (existing) {
    const updated = await prisma.dictionaryEntry.update({ where: { french: key }, data: { mandoa: mandoa.trim() } });
    return NextResponse.json(updated);
  }
  const entry = await prisma.dictionaryEntry.create({ data: { french: key, mandoa: mandoa.trim() } });
  return NextResponse.json(entry);
}

export async function PUT(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const { id, french, mandoa } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  const entry = await prisma.dictionaryEntry.update({ where: { id }, data: { ...(french && { french: french.trim().toLowerCase() }), ...(mandoa && { mandoa: mandoa.trim() }) } });
  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const { id } = await req.json();
  await prisma.dictionaryEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
