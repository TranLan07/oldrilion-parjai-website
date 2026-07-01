import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";

export async function GET() {
  // Réservé à l'admin hub — appelé depuis le dashboard
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const { name, email, type, subject, message } = await req.json();

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  const contact = await prisma.contactMessage.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      type: type || "autre",
      subject: subject?.trim() || "",
      message: message.trim(),
    },
  });

  // Envoyer un email à l'adresse configurée par les admins
  const cfg = await prisma.hubConfig.findUnique({ where: { key: "contactEmail" } });
  if (cfg?.value) {
    const typeLabels: Record<string, string> = {
      rgpd: "Demande RGPD", recrutement: "Question recrutement",
      bug: "Signalement bug", autre: "Autre demande",
    };
    await sendMail(
      cfg.value,
      `[Hub] Nouveau contact : ${typeLabels[type] ?? type}`,
      `<h2>Nouvelle demande de contact</h2>
<p><strong>De :</strong> ${name} &lt;${email}&gt;</p>
<p><strong>Type :</strong> ${typeLabels[type] ?? type}</p>
<p><strong>Objet :</strong> ${subject || "(non renseigné)"}</p>
<hr/>
<p>${message.replace(/\n/g, "<br/>")}</p>
<hr/>
<p style="color:#666;font-size:12px">Message #${contact.id} reçu le ${new Date().toLocaleString("fr-FR")}</p>`
    ).catch(console.error);
  }

  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  // Marquer lu / archiver — admin hub
  const { id, read } = await req.json();
  await prisma.contactMessage.update({ where: { id }, data: { read: Boolean(read) } });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  // Supprimer — admin hub
  const { id } = await req.json();
  await prisma.contactMessage.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
