import { prisma } from "./prisma";
import { sendMail } from "./mail";

export async function notifyChannelFollowers(channelId: string, senderName: string, messageContent: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel || !channel.emailNotifEnabled) return;

  const delayMs = channel.emailNotifDelayMin * 60 * 1000;
  const cutoff = new Date(Date.now() - delayMs);

  const followers = await prisma.channelFollower.findMany({
    where: {
      channelId,
      confirmed: true,
      lastNotifAt: { lt: cutoff },
    },
  });

  if (followers.length === 0) return;

  const recentMessages = await prisma.message.findMany({
    where: {
      channelId,
      createdAt: { gt: cutoff },
    },
    include: { user: { select: { displayName: true } } },
    orderBy: { createdAt: "asc" },
  });

  const messagesList = recentMessages.length > 1
    ? recentMessages.map(m =>
        `<p style="margin:4px 0;"><strong style="color:#c9a84c;">${m.user.displayName}</strong>: ${m.content}</p>`
      ).join("")
    : `<p><strong style="color:#c9a84c;">${senderName}</strong>: ${messageContent}</p>`;

  const subject = recentMessages.length > 1
    ? `Parjai — ${recentMessages.length} nouveaux messages dans #${channel.name}`
    : `Parjai — Nouveau message dans #${channel.name}`;

  for (const f of followers) {
    try {
      await sendMail(
        f.email,
        subject,
        `<div style="font-family:sans-serif;color:#e8e6e3;background:#0a0a0f;padding:24px;border-radius:8px;">
          <h3 style="color:#c9a84c;margin-top:0;">#${channel.name}</h3>
          ${messagesList}
          <hr style="border-color:#333;margin:16px 0;">
          <p style="color:#666;font-size:12px;">Vous recevez cet email car vous suivez le canal #${channel.name} sur Parjai.</p>
        </div>`
      );

      await prisma.channelFollower.update({
        where: { id: f.id },
        data: { lastNotifAt: new Date() },
      });
    } catch (err) {
      console.error(`Failed to notify ${f.email}:`, err);
    }
  }
}
