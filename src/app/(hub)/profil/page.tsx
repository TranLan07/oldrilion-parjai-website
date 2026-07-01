"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

type Spec = { id: string; name: string; secret: boolean };
type UserProfile = {
  id: string; displayName: string; username: string; role: string;
  grade: string; specialization: string; publicSpecialization: string;
  permissionLevel: number;
};

export default function ProfilPage() {
  const { data: session } = useSession();
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/profil").then(r => r.ok ? r.json() : null).then(setProfile);
    fetch("/api/specializations").then(r => r.json()).then((data: Spec[]) => {
      setSpecs(data.filter(sp => !sp.secret));
    });
  }, [session]);

  if (!session) {
    return <div className="p-12 text-center" style={{ color: "var(--beskar-400)" }}>Connectez-vous pour voir votre profil.</div>;
  }

  if (!profile) {
    return <div className="p-12 text-center" style={{ color: "var(--beskar-400)" }}>Chargement...</div>;
  }

  const isDha = profile.specialization.toLowerCase() === "dha";

  async function savePublicSpec(value: string) {
    setSaving(true);
    await fetch("/api/profil", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicSpecialization: value }),
    });
    setProfile(p => p ? { ...p, publicSpecialization: value } : p);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-8 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>PROFIL</h1>

      <div className="rounded-sm p-8" style={{ background: "var(--beskar-800)", border: "1px solid var(--beskar-600)" }}>
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
            style={{ background: "var(--grad-blood)", color: "var(--beskar-100)", fontFamily: "var(--font-display)" }}>
            {profile.displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"}
          </div>
          <div>
            <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>{profile.displayName}</h2>
            <p className="text-sm" style={{ fontFamily: "var(--font-mono)", color: "var(--beskar-400)" }}>@{profile.username}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard label="Rôle" value={profile.role} />
          <InfoCard label="Grade" value={profile.grade} />
          <InfoCard label="Spécialisation" value={profile.specialization || "—"} />
          <InfoCard label="Niveau de permission" value={`${profile.permissionLevel}/10`} />
        </div>

        {isDha && (
          <div className="mt-6 rounded-sm p-4" style={{ background: "rgba(107,33,168,0.1)", border: "1px solid rgba(162,89,224,0.3)" }}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ fontFamily: "var(--font-display)", color: "#a259e0" }}>
              Couverture Dha
            </h3>
            <p className="mb-3 text-xs" style={{ color: "var(--beskar-300)" }}>
              Choisissez la spécialisation affichée publiquement sur la page Membres pour protéger votre identité Dha.
            </p>
            <div className="flex items-center gap-3">
              <select value={profile.publicSpecialization} onChange={(e) => savePublicSpec(e.target.value)}
                disabled={saving}
                className="rounded-sm border px-3 py-2 text-sm outline-none"
                style={{ background: "var(--beskar-900)", borderColor: "var(--beskar-500)", color: "var(--beskar-100)" }}>
                <option value="">Kyramud (par défaut)</option>
                {specs.map(sp => <option key={sp.id} value={sp.name}>{sp.name}</option>)}
              </select>
              {saved && <span className="text-xs" style={{ color: "var(--jade-500)" }}>Sauvegardé</span>}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Link href="/change-password"
            className="rounded-sm border px-4 py-2 text-sm transition-colors"
            style={{ borderColor: "var(--beskar-500)", color: "var(--beskar-300)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold-500)"; e.currentTarget.style.color = "var(--gold-500)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--beskar-500)"; e.currentTarget.style.color = "var(--beskar-300)"; }}
          >Changer le mot de passe</Link>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm px-4 py-3" style={{ background: "var(--beskar-700)", border: "1px solid var(--beskar-600)" }}>
      <p className="text-xs uppercase tracking-[0.22em]" style={{ fontFamily: "var(--font-display)", color: "var(--beskar-400)" }}>{label}</p>
      <p className="mt-1 font-medium" style={{ color: "var(--beskar-100)" }}>{value}</p>
    </div>
  );
}
