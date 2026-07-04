import { auth } from "./auth";
import { NextResponse } from "next/server";

export async function requireHubAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const hubRole = (session as unknown as Record<string, unknown>).hubRole as string;
  if (hubRole !== "admin" && hubRole !== "moderator") return null;
  return session;
}

// Admin hub STRICT (pas les modérateurs) — pour les actions sensibles :
// gestion complète des utilisateurs, reset de mot de passe, suppression.
export async function requireHubSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const hubRole = (session as unknown as Record<string, unknown>).hubRole as string;
  if (hubRole !== "admin") return null;
  return session;
}

export function hubDenied() {
  return NextResponse.json({ error: "Accès réservé aux administrateurs du hub" }, { status: 403 });
}
