"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

type UserProfile = {
  id: string; displayName: string; username: string;
  publicId: string; hubRole: string; anonymous: boolean;
  role: string; grade: string; specialization: string;
  permissionLevel: number;
  clan: { id: string; slug: string; name: string; colorPrimary: string } | null;
};
type Notification = {
  id: string; type: string; title: string; body: string;
  read: boolean; link: string | null; createdAt: string;
};

const typeColor: Record<string, string> = {
  message: "#3b82f6", mission: "#c9a84c", event: "#22c55e",
  recruitment: "#a259e0", whitelist: "#06b6d4", report: "#ef4444",
};
const typeLabel: Record<string, string> = {
  message: "Message", mission: "Mission", event: "Événement",
  recruitment: "Recrutement", whitelist: "Whitelist", report: "Signalement",
};

export default function ProfilPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("unread");

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/profil").then(r => r.ok ? r.json() : null).then((d: UserProfile) => {
      setProfile(d);
      setDisplayName(d?.displayName ?? "");
    });
    fetch("/api/notifications").then(r => r.ok ? r.json() : []).then(setNotifs);
  }, [session]);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  async function saveName() {
    if (!displayName.trim()) return;
    setNameSaving(true);
    const r = await fetch("/api/profil", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    setNameSaving(false);
    if (r.ok) { setProfile(p => p ? { ...p, displayName } : p); flash("Nom sauvegardé."); }
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }
  async function markAllRead() {
    await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ readAll: true }) });
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }
  async function delNotif(id: string) {
    await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setNotifs(prev => prev.filter(n => n.id !== id));
  }
  async function delAllNotifs() {
    if (!confirm("Supprimer toutes les notifications ?")) return;
    await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deleteAll: true }) });
    setNotifs([]);
  }

  if (!session) return <div className="p-12 text-center text-sm" style={{ color: "#6b7280" }}>Connectez-vous pour voir votre profil.</div>;
  if (!profile) return <div className="p-12 text-center text-sm" style={{ color: "#6b7280" }}>Chargement...</div>;

  const inputSt = { background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" };
  const unreadCount = notifs.filter(n => !n.read).length;
  const displayedNotifs = notifFilter === "unread" ? notifs.filter(n => !n.read) : notifs;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Hub</p>
      <h1 className="mb-8 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
        {profile.displayName}
      </h1>

      {msg && <div className="mb-6 rounded-sm border px-4 py-3 text-sm" style={{ borderColor: "#2a2a2a", background: "#111", color: "#9ca3af" }}>{msg}</div>}

      {/* Identité */}
      <section className="mb-6 rounded-sm border p-6 space-y-4" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#4a4a4a" }}>Identité</h2>
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
          <InfoCard label="Rôle hub" value={profile.hubRole} />
          {profile.clan
            ? <InfoCard label="Clan" value={profile.clan.name} color={profile.clan.colorPrimary} link={`/clan/${profile.clan.slug}`} />
            : <InfoCard label="Clan" value="Sans clan" />}
          <InfoCard label="Permission" value={`${profile.permissionLevel}/10`} />
        </div>
        {profile.clan && (
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard label="Grade" value={profile.grade || "---"} />
            <InfoCard label="Spécialisation" value={profile.specialization || "---"} />
          </div>
        )}
      </section>

      {/* Modifier le profil */}
      <section className="mb-6 rounded-sm border p-6 space-y-4" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#4a4a4a" }}>Modifier le profil</h2>
        <div className="flex gap-2">
          <input value={displayName} onChange={e => setDisplayName(e.target.value)}
            className="flex-1 rounded-sm border px-3 py-2 text-sm outline-none" style={inputSt}
            placeholder="Nom affiché" onKeyDown={e => { if (e.key === "Enter") saveName(); }} />
          <button onClick={saveName} disabled={nameSaving}
            className="rounded-sm px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: "#f2f2f5", color: "#000" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#e5e7eb"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#f2f2f5"; }}>
            Sauvegarder
          </button>
        </div>
        <Link href="/change-password" className="inline-block text-xs transition-colors"
          style={{ color: "#6b7280" }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#9ca3af"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#6b7280"; }}>
          Changer le mot de passe →
        </Link>
      </section>

      {/* Raccourcis */}
      <section className="mb-8 flex flex-wrap gap-3">
        <Link href="/parametres"
          className="rounded-sm border px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] transition-all"
          style={{ borderColor: "#2a2a2a", color: "#9ca3af" }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#f2f2f5"; (e.currentTarget as HTMLAnchorElement).style.color = "#f2f2f5"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#2a2a2a"; (e.currentTarget as HTMLAnchorElement).style.color = "#9ca3af"; }}>
          ⚙ Paramètres
        </Link>
        <Link href="/contacts"
          className="rounded-sm border px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] transition-all"
          style={{ borderColor: "#2a2a2a", color: "#6b7280" }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#4a4a4a"; (e.currentTarget as HTMLAnchorElement).style.color = "#9ca3af"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#2a2a2a"; (e.currentTarget as HTMLAnchorElement).style.color = "#6b7280"; }}>
          Contacts
        </Link>
        <Link href="/traducteur"
          className="rounded-sm border px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] transition-all"
          style={{ borderColor: "#2a2a2a", color: "#6b7280" }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#4a4a4a"; (e.currentTarget as HTMLAnchorElement).style.color = "#9ca3af"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#2a2a2a"; (e.currentTarget as HTMLAnchorElement).style.color = "#6b7280"; }}>
          Traducteur Mando&apos;a
        </Link>
        {profile.clan && (
          <Link href={`/clan/${profile.clan.slug}`}
            className="rounded-sm border px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] transition-all"
            style={{ borderColor: profile.clan.colorPrimary + "40", color: profile.clan.colorPrimary }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = profile.clan!.colorPrimary; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = profile.clan!.colorPrimary + "40"; }}>
            Espace {profile.clan.name}
          </Link>
        )}
      </section>

      {/* Déconnexion */}
      <div className="mb-8 flex justify-end">
        <button onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-sm border px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] transition-all"
          style={{ borderColor: "#2a2a2a", color: "#6b7280" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#fca5a5"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#6b7280"; }}>
          Déconnexion
        </button>
      </div>

      {/* Notifications */}
      <section className="rounded-sm border p-6" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
        <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#4a4a4a" }}>
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full px-1.5 py-0.5 text-xs font-bold" style={{ background: "#ef4444", color: "#fff" }}>
                {unreadCount}
              </span>
            )}
          </h2>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="rounded-sm border px-3 py-1 text-xs transition-all"
                style={{ borderColor: "#2a2a2a", color: "#6b7280" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a4a4a"; e.currentTarget.style.color = "#9ca3af"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#6b7280"; }}>
                Tout lire
              </button>
            )}
            {notifs.length > 0 && (
              <button onClick={delAllNotifs} className="rounded-sm px-3 py-1 text-xs transition-all"
                style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}>
                Tout supprimer
              </button>
            )}
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          {(["all", "unread"] as const).map(f => (
            <button key={f} onClick={() => setNotifFilter(f)}
              className="rounded-sm border px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] transition-all"
              style={{ borderColor: notifFilter === f ? "#f2f2f5" : "#2a2a2a", color: notifFilter === f ? "#f2f2f5" : "#4a4a4a" }}>
              {f === "all" ? `Toutes (${notifs.length})` : `Non lues (${unreadCount})`}
            </button>
          ))}
        </div>

        {displayedNotifs.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: "#3a3a3a" }}>
            {notifFilter === "unread" ? "Aucune notification non lue." : "Aucune notification."}
          </p>
        )}

        <div className="space-y-2">
          {displayedNotifs.map(n => {
            const color = typeColor[n.type] ?? "#6b7280";
            return (
              <div key={n.id} className="rounded-sm border p-3"
                style={{ borderColor: n.read ? "#1a1a1a" : `${color}40`, background: n.read ? "transparent" : `${color}08` }}>
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: n.read ? "#2a2a2a" : color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color }}>{typeLabel[n.type] ?? n.type}</span>
                      <span className="text-xs" style={{ color: "#3a3a3a" }}>
                        {new Date(n.createdAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "#e5e7eb" }}>{n.title}</p>
                    <p className="text-xs" style={{ color: "#6b7280" }}>{n.body}</p>
                    {n.link && (
                      <Link href={n.link} onClick={() => { if (!n.read) markRead(n.id); }}
                        className="mt-1 inline-block text-xs" style={{ color }}>Voir →</Link>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="rounded-sm px-2 py-0.5 text-xs transition-all"
                        style={{ color: "#6b7280", border: "1px solid #2a2a2a" }}
                        onMouseEnter={e => { e.currentTarget.style.color = "#9ca3af"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "#6b7280"; }}>Lu</button>
                    )}
                    <button onClick={() => delNotif(n.id)} className="px-2 py-0.5 text-xs transition-colors" style={{ color: "#3a3a3a" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#3a3a3a"; }}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
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
