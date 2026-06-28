import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const perm = ((session as unknown as Record<string, unknown>)?.permissionLevel as number) || 0;
  if (perm < 10) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const { id } = await params;
  const data = await req.json();

  const channel = await prisma.channel.update({
    where: { id },
    data: {
      ...(data.emailNotifEnabled !== undefined && { emailNotifEnabled: data.emailNotifEnabled }),
      ...(data.emailNotifDelayMin !== undefined && { emailNotifDelayMin: data.emailNotifDelayMin }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });

  return NextResponse.json(channel);
}
