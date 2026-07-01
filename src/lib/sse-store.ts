// Global SSE subscriber store — keyed by channelId
// Each subscriber is a function that pushes a serialized message to its EventSource stream.
// This works in Next.js dev (single process) and single-instance production.

type Subscriber = (data: string) => void;

const subscribers = new Map<string, Set<Subscriber>>();

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
