import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, resolveClan, denied, notFound } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";
import { generatePublicId } from "@/lib/public-id";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  const recruitments = await prisma.recruitment.findMany({
    where: { clanId: clan.id },
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(recruitments);
}

export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  const { rpName, discord, experience, motivation, specialization } = await req.json();
  if (!rpName || !discord || !experience || !motivation) {
    return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
  }
  const recruitment = await prisma.recruitment.create({
    data: { clanId: clan.id, rpName, discord, experience, motivation, specialization: specialization || "" },
  });
  return NextResponse.json(recruitment);
}

export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();

  const { id, action } = await req.json();
  if (!id || !action) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

  if (action === "approve") {
    const recruitment = await prisma.recruitment.findUnique({ where: { id } });
    if (!recruitment) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });

    const tempPassword = Math.random().toString(36).slice(2, 10);
    const username = recruitment.rpName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const publicId = await generatePublicId();

    const user = await prisma.user.create({
      data: {
        publicId, username,
        passwordHash: hashSync(tempPassword, 10),
        displayName: recruitment.rpName,
        clanId: clan.id,
        role: "membre",
        grade: "Recrue",
        specialization: recruitment.specialization,
        permissionLevel: 1,
        mustChangePassword: true,
        mandalorien: true,
      },
    });

    await prisma.recruitment.update({ where: { id }, data: { status: "approved", tempPassword, userId: user.id } });

    const generalChannel = await prisma.channel.findFirst({ where: { clanId: clan.id, name: "général" } });
    if (generalChannel) {
      await prisma.channelMember.create({ data: { userId: user.id, channelId: generalChannel.id } });
    }

    return NextResponse.json({ success: true, username, tempPassword });
  }

  if (action === "reject") {
    await prisma.recruitment.update({ where: { id }, data: { status: "rejected" } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
