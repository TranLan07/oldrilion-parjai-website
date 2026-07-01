"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function HeroButtons() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  return (
    <div className="relative mt-8 flex items-center gap-4">
      <Link href="/clans"
        className="rounded-sm border px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-all"
        style={{ borderColor: "#f2f2f5", color: "#f2f2f5" }}
      >
        Voir les clans
      </Link>
      {!session && (
        <Link href="/login"
          className="rounded-sm px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-all"
          style={{ background: "#f2f2f5", color: "#000000" }}
        >
          Connexion
        </Link>
      )}
      {session && (
        <Link href="/profil"
          className="rounded-sm px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-all"
          style={{ background: "#f2f2f5", color: "#000000" }}
        >
          Mon profil
        </Link>
      )}
    </div>
  );
}
