import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  const perm = (session as unknown as Record<string, unknown>)?.permissionLevel as number;
  if (!session?.user || perm < 10) return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const recruitments = await prisma.recruitment.findMany({
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(recruitments);
}

export async function POST(req: NextRequest) {
  const { rpName, discord, experience, motivation, specialization } = await req.json();

  if (!rpName || !discord || !experience || !motivation) {
    return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
  }

  const recruitment = await prisma.recruitment.create({
    data: { rpName, discord, experience, motivation, specialization: specialization || "" },
  });

  return NextResponse.json(recruitment);
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id, action } = await req.json();
  if (!id || !action) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

  if (action === "approve") {
    const recruitment = await prisma.recruitment.findUnique({ where: { id } });
    if (!recruitment) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });

    const tempPassword = Math.random().toString(36).slice(2, 10);
    const username = recruitment.rpName.toLowerCase().replace(/[^a-z0-9]/g, "");

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashSync(tempPassword, 10),
        displayName: recruitment.rpName,
        role: "membre",
        grade: "Recrue",
        specialization: recruitment.specialization,
        permissionLevel: 1,
        mustChangePassword: true,
      },
    });

    await prisma.recruitment.update({
      where: { id },
      data: { status: "approved", tempPassword, userId: user.id },
    });

    // Add to general channel
    const generalChannel = await prisma.channel.findFirst({ where: { name: "général" } });
    if (generalChannel) {
      await prisma.channelMember.create({
        data: { userId: user.id, channelId: generalChannel.id },
      });
    }

    return NextResponse.json({ success: true, username, tempPassword });
  }

  if (action === "reject") {
    await prisma.recruitment.update({
      where: { id },
      data: { status: "rejected" },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
