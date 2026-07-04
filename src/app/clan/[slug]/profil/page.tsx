"use client";

import { useParams } from "next/navigation";
import ProfileView from "@/components/ProfileView";

// Profil consulté depuis un clan : rendu sous le layout du clan, donc conserve
// le header (ClanNavbar) et la DA du clan.
export default function ClanProfilPage() {
  const { slug } = useParams() as { slug: string };
  return <ProfileView scope={slug} />;
}
