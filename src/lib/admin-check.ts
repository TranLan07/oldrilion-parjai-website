import { auth } from "@/lib/auth";

export async function requireAdmin() {
  const session = await auth();
  const perm = ((session as unknown as Record<string, unknown>)?.permissionLevel as number) || 0;
  if (!session?.user || perm < 10) return null;
  return session;
}
