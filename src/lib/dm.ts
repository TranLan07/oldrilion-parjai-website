import { prisma } from "./prisma";

// Récupère (ou crée) le canal privé de messagerie directe entre deux utilisateurs.
// Réutilisé par le carnet de contacts et le bouton "Contacter" du Marketplace.
export async function getOrCreateDmChannel(meId: string, targetId: string, name?: string) {
  const accessUsers = JSON.stringify([meId, targetId].sort());
  let channel = await prisma.channel.findFirst({
    where: { clanId: null, isPrivate: true, accessUsers },
  });

  if (!channel) {
    const [me, target] = await Promise.all([
      prisma.user.findUnique({ where: { id: meId }, select: { displayName: true } }),
      prisma.user.findUnique({ where: { id: targetId }, select: { displayName: true } }),
    ]);
    channel = await prisma.channel.create({
      data: {
        clanId: null,
        isPrivate: true,
        accessUsers,
        name: name ?? `MP: ${me?.displayName ?? "?"} ↔ ${target?.displayName ?? "?"}`,
        description: "Conversation privée",
      },
    });
    for (const userId of [meId, targetId]) {
      await prisma.channelMember.upsert({
        where: { userId_channelId: { userId, channelId: channel.id } },
        create: { userId, channelId: channel.id },
        update: {},
      });
    }
  }

  return channel;
}
