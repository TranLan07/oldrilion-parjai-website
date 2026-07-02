// Global SSE subscriber store — keyed by channelId
// Each subscriber is a function that pushes a serialized message to its EventSource stream.
// This works in Next.js dev (single process) and single-instance production.

type Subscriber = (data: string) => void;
type NotifSubscriber = (count: number) => void;

const subscribers = new Map<string, Set<Subscriber>>();
const notifSubscribers = new Map<string, Set<NotifSubscriber>>();

export function subscribe(channelId: string, fn: Subscriber): () => void {
  if (!subscribers.has(channelId)) subscribers.set(channelId, new Set());
  subscribers.get(channelId)!.add(fn);
  return () => {
    subscribers.get(channelId)?.delete(fn);
    if (subscribers.get(channelId)?.size === 0) subscribers.delete(channelId);
  };
}

export function publish(channelId: string, data: unknown) {
  const subs = subscribers.get(channelId);
  if (!subs || subs.size === 0) return;
  const payload = JSON.stringify(data);
  for (const fn of subs) fn(payload);
}

export function subscribeNotif(userId: string, fn: NotifSubscriber): () => void {
  if (!notifSubscribers.has(userId)) notifSubscribers.set(userId, new Set());
  notifSubscribers.get(userId)!.add(fn);
  return () => {
    notifSubscribers.get(userId)?.delete(fn);
    if (notifSubscribers.get(userId)?.size === 0) notifSubscribers.delete(userId);
  };
}

export async function publishNotifCount(userId: string) {
  const subs = notifSubscribers.get(userId);
  if (!subs || subs.size === 0) return;
  const { prisma } = await import("./prisma");
  const count = await prisma.notification.count({ where: { userId, read: false } });
  for (const fn of subs) fn(count);
}

export function notifyUser(userId: string) {
  // Déclenche une mise à jour du compteur pour cet utilisateur
  publishNotifCount(userId).catch(() => {});
}
