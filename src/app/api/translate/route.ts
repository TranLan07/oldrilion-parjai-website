import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { translate } from "@/lib/translator";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { mandalorien: true } });
  if (!user?.mandalorien) return NextResponse.json({ error: "Acces reserve aux Mandaloriens" }, { status: 403 });

  const { text, direction } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Texte vide" }, { status: 400 });

  const customEntries = await prisma.dictionaryEntry.findMany();
  const customFrToMandoa: Record<string, string> = {};
  const customMandoaToFr: Record<string, string> = {};
  for (const e of customEntries) {
    customFrToMandoa[e.french] = e.mandoa;
    customMandoaToFr[e.mandoa.toLowerCase()] = e.french;
  }

  const result = translate(text.trim(), direction || undefined, customFrToMandoa, customMandoaToFr);
  return NextResponse.json(result);
}
