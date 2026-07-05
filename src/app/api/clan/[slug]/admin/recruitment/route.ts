import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, resolveClan, denied, notFound , suspendedResponse } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";
import { generatePublicId } from "@/lib/public-id";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const recruitments = await prisma.recruitment.findMany({
    where: { clanId: clan.id },
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(recruitments);
}

// La soumission publique est gérée par /api/clan/[slug]/recruitment (POST).

export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const { id, action } = await req.json();
  if (!id || !action) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

  if (action === "approve") {
    const recruitment = await prisma.recruitment.findUnique({ where: { id } });
    if (!recruitment) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
    if (recruitment.status === "approved") return NextResponse.json({ error: "Candidature déjà approuvée" }, { status: 400 });

    // Le candidat a déjà un compte (sans-clan connecté au moment de la candidature).
    const existing = recruitment.applicantId
      ? await prisma.user.findUnique({ where: { id: recruitment.applicantId }, select: { id: true, username: true, displayName: true, clanId: true, mandalorien: true } })
      : null;

    if (existing) {
      // Impossible d'accepter quelqu'un qui appartient déjà à un clan.
      if (existing.clanId) {
        return NextResponse.json({ error: "Ce candidat appartient déjà à un clan." }, { status: 400 });
      }
      // On n'ouvre pas de nouveau compte : on rattache le compte existant au clan.
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          clanId: clan.id,
          role: "membre",
          grade: "Recrue",
          gradeId: null,
          specializationId: null,
          specialization: recruitment.specialization,
          permissionLevel: 1,
          mandalorien: true, // membre d'un clan => mandalorien
        },
      });
      await prisma.recruitment.update({ where: { id }, data: { status: "approved", userId: user.id } });

      const generalChannel = await prisma.channel.findFirst({ where: { clanId: clan.id, name: "général" } });
      if (generalChannel) {
        await prisma.channelMember.upsert({
          where: { userId_channelId: { userId: user.id, channelId: generalChannel.id } },
          create: { userId: user.id, channelId: generalChannel.id },
          update: {},
        });
      }
      await prisma.notification.create({
        data: { userId: user.id, type: "recruitment", title: "Candidature acceptée", body: `Vous avez rejoint le clan ${clan.name}.` },
      });

      return NextResponse.json({ success: true, existingAccount: true, username: existing.username });
    }

    // Candidat sans compte : on en crée un nouveau.
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
