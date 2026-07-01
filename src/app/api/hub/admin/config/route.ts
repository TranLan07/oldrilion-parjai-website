import { NextRequest, NextResponse } from "next/server";
import { requireHubAdmin, hubDenied } from "@/lib/hub-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await requireHubAdmin())) return hubDenied();
  const configs = await prisma.hubConfig.findMany();
  const map: Record<string, string> = {};
  configs.forEach(c => { map[c.key] = c.value; });
  return NextResponse.json(map);
}

export async function PUT(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const data = await req.json() as Record<string, string>;
  for (const [key, value] of Object.entries(data)) {
    await prisma.hubConfig.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    });
  }
  return NextResponse.json({ success: true });
}
