"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// La messagerie de clan a fusionné avec la messagerie hub : un seul espace,
// avec un onglet "Clan" reprenant la direction artistique du clan. On redirige
// ici pour ne pas casser les liens/favoris existants vers cette ancienne route.
export default function ClanMessagerieRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/messagerie?tab=clan"); }, [router]);
  return <div className="p-12 text-center text-sm" style={{ color: "var(--beskar-400)" }}>Redirection vers la messagerie...</div>;
}
