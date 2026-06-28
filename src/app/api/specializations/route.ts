import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const specs = await prisma.specialization.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(specs);
}
