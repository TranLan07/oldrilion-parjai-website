import { NextRequest, NextResponse } from "next/server";
import { translate } from "@/lib/translator";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { text, direction } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: "Texte vide" }, { status: 400 });
  }

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
