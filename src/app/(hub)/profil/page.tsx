"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

type UserProfile = {
  id: string; displayName: string; username: string;
  publicId: string; hubRole: string; anonymous: boolean;
  role: string; grade: string; specialization: string;
  permissionLevel: number;
  clan: { id: string; slug: string; name: string; colorPrimary: string } | null;
};

export default function ProfilPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/profil").then(r => r.ok ? r.json() : null).then((d: UserProfile) => {
      setProfile(d);
      setDisplayName(d?.displayName ?? "");
    });
  }, [session]);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  async function saveName() {
    if (!displayName.trim()) return;
    setSaving(true);
    const r = await fetch("/api/profil", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    setSaving(false);
    if (r.ok) { setProfile(p => p ? { ...p, displayName } : p); flash("Nom sauvegarde."); }
  }

  async function toggleAnonymous() {
    if (!profile) return;
    const newVal = !profile.anonymous;
    setSaving(true);
    const r = await fetch("/api/profil", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonymous: newVal }),
    });
    setSaving(false);
    if (r.ok) { setProfile(p => p ? { ...p, anonymous: newVal } : p); flash(newVal ? "Mode anonyme active." : "Mode anonyme desactive."); }
  }

  if (!session) return <div className="p-12 text-center text-sm" style={{ color: "#6b7280" }}>Connectez-vous pour voir votre profil.</div>;
  if (!profile) return <div className="p-12 text-center text-sm" style={{ color: "#6b7280" }}>Chargement...</div>;

  const inputSt = { background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" };

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Profil</p>
      <h1 className="mb-8 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
        {profile.displayName}
      </h1>

      {msg && <div className="mb-6 rounded-sm border px-4 py-3 text-sm" style={{ borderColor: "#2a2a2a", background: "#111", color: "#9ca3af" }}>{msg}</div>}

      <section className="mb-6 rounded-sm border p-6 space-y-4" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#4a4a4a" }}>Identite</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold flex-shrink-0"
            style={{ background: "#1a1a1a", color: "#f2f2f5", border: "1px solid #2a2a2a" }}>
            {profile.displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"}
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: "#f2f2f5" }}>{profile.displayName}</p>
            <p className="text-sm" style={{ color: "#4a4a4a" }}>@{profile.username}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="font-mono text-xl font-bold tracking-[0.2em]" style={{ color: "#f2f2f5" }}>{profile.publicId}</p>
            <p className="text-xs" style={{ color: "#4a4a4a" }}>Identifiant public</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoCard label="Role hub" value={profile.hubRole} />
          {profile.clan
            ? <InfoCard label="Clan" value={profile.clan.name} color={profile.clan.colorPrimary} link={`/clan/${profile.clan.slug}`} />
            : <InfoCard label="Clan" value="Sans clan" />
          }
          <InfoCard label="Permission" value={`${profile.permissionLevel}/10`} />
        </div>
        {profile.clan && (
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard label="Grade" value={profile.grade || "---"} />
            <InfoCard label="Specialisation" value={profile.specialization || "---"} />
          </div>
        )}
      </section>

      <section className="mb-6 rounded-sm border p-6 space-y-4" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#4a4a4a" }}>Modifier le profil</h2>
        <div className="flex gap-2">
          <input value={displayName} onChange={e => setDisplayName(e.target.value)}
            className="flex-1 rounded-sm border px-3 py-2 text-sm outline-none" style={inputSt}
            placeholder="Nom affiche" onKeyDown={e => { if (e.key === "Enter") saveName(); }} />
          <button onClick={saveName} disabled={saving}
            className="rounded-sm px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={{ background: "#f2f2f5", color: "#000" }}>Sauvegarder</button>
        </div>
        <Link href="/change-password" className="inline-block text-xs" style={{ color: "#6b7280" }}>Changer le mot de passe</Link>
      </section>

      <section className="mb-6 rounded-sm border p-6 space-y-3" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#4a4a4a" }}>Mode anonyme</h2>
        <p className="text-sm" style={{ color: "#6b7280" }}>
          En mode anonyme, votre nom est masque dans les messages et listes publiques.
          Seuls les membres autorises peuvent revealer votre identite.
        </p>
        <button onClick={toggleAnonymous} disabled={saving}
          className="rounded-sm border px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50"
          style={{
            borderColor: profile.anonymous ? "#ef4444" : "#2a2a2a",
            color: profile.anonymous ? "#ef4444" : "#6b7280",
            background: profile.anonymous ? "rgba(239,68,68,0.08)" : "transparent",
          }}>
          {profile.anonymous ? "Anonyme active -- Desactiver" : "Activer le mode anonyme"}
        </button>
      </section>

      <div className="flex gap-3">
        <Link href="/contacts" className="rounded-sm border px-4 py-2 text-sm" style={{ borderColor: "#2a2a2a", color: "#6b7280" }}>
          Carnet de contacts
        </Link>
        {profile.clan && (
          <Link href={`/clan/${profile.clan.slug}`} className="rounded-sm border px-4 py-2 text-sm" style={{ borderColor: "#2a2a2a", color: "#6b7280" }}>
            Espace clan
          </Link>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value, color, link }: { label: string; value: string; color?: string; link?: string }) {
  const content = (
    <div className="rounded-sm px-4 py-3" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
      <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "#3a3a3a" }}>{label}</p>
      <p className="mt-1 text-sm font-semibold" style={{ color: color ?? "#e5e7eb" }}>{value}</p>
    </div>
  );
  return link ? <a href={link}>{content}</a> : content;
}
