import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, resolveClan, denied, notFound, suspendedResponse } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { notifyUser } from "@/lib/sse-store";

type P = { params: Promise<{ slug: string }> };

const CATEGORIES = ["question", "premium", "signalement", "autre"];

// GET : historique des demandes envoyées par CE clan aux admins du hub.
export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  const session = await requireClanAdmin(slug);
  if (!session) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();

  const requests = await prisma.clanAdminRequest.findMany({
    where: { clanId: clan.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, category: true, subject: true, message: true, status: true, createdAt: true },
  });
  return NextResponse.json(requests);
}

// POST : envoie une nouvelle demande aux administrateurs du hub.
export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  const session = await requireClanAdmin(slug);
  if (!session) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const { category, subject, message } = await req.json();
  const authorId = (session as unknown as { user: { id: string } }).user.id;

  if (!CATEGORIES.includes(category)) return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  if (!subject?.trim() || !message?.trim()) return NextResponse.json({ error: "Objet et message requis" }, { status: 400 });

  const request = await prisma.clanAdminRequest.create({
    data: { clanId: clan.id, authorId, category, subject: subject.trim(), message: message.trim() },
  });

  // Prévient tous les admins/modérateurs du hub : notification in-app + email si configuré.
  const hubStaff = await prisma.user.findMany({
    where: { hubRole: { in: ["admin", "moderator"] } },
    select: { id: true },
  });
  if (hubStaff.length > 0) {
    await prisma.notification.createMany({
      data: hubStaff.map(u => ({
        userId: u.id,
        type: "clan_request",
        title: `Demande de ${clan.name}`,
        body: subject.trim(),
        link: "/hub/admin",
      })),
    });
    for (const u of hubStaff) notifyUser(u.id);
  }

  const cfg = await prisma.hubConfig.findUnique({ where: { key: "contactEmail" } });
  if (cfg?.value) {
    const categoryLabels: Record<string, string> = {
      question: "Question technique", premium: "Demande premium", signalement: "Signalement", autre: "Autre",
    };
    await sendMail(
      cfg.value,
      `[Hub] Demande du clan ${clan.name} : ${categoryLabels[category] ?? category}`,
      `<h2>Nouvelle demande d'un admin de clan</h2>
<p><strong>Clan :</strong> ${clan.name}</p>
<p><strong>Catégorie :</strong> ${categoryLabels[category] ?? category}</p>
<p><strong>Objet :</strong> ${subject.trim()}</p>
<hr/>
<p>${message.trim().replace(/\n/g, "<br/>")}</p>
<hr/>
<p style="color:#666;font-size:12px">À traiter depuis l'onglet Contacts de l'admin hub.</p>`
    ).catch(console.error);
  }

  return NextResponse.json({ success: true, request });
}
