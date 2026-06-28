import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sections = await prisma.ruleSection.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(sections);
}
