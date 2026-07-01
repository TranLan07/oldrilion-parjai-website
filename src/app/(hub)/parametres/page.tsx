"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type EmailFollow = { channelId: string; email: string; confirmed: boolean } | null;
type ChannelSetting = {
  channelId: string; channelName: string; channelDesc: string;
  clanId: string | null; clan: { name: string; colorPrimary: string; slug: string } | null;
  inAppNotif: boolean; emailFollow: EmailFollow; muted: boolean;
};
type Settings = {
  anonymous: boolean;
  notifMissions: string;
  notifEvents: string;
  channels: ChannelSetting[];
};

const notifOptions = [
  { value: "all",         label: "Toutes",               desc: "Clan et hub" },
  { value: "clan_only",   label: "Clan uniquement",       desc: "Seulement votre clan" },
  { value: "global_only", label: "Globales uniquement",   desc: "Seulement le hub inter-clans" },
  { value: "none",        label: "Aucune",                desc: "Désactivé" },
];

const inp = { background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" };

export default function ParametresPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [msg, setMsg] = useState("");
  const [emailInputs, setEmailInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/profil/settings");
      if (r.ok) {
        setSettings(await r.json());
      } else {
        const d = await r.json().catch(() => ({}));
        setError(d.error ?? `Erreur ${r.status}`);
      }
    } catch {
      setError("Impossible de charger les paramètres.");
    }
  }, []);

  useEffect(() => { if (session) load(); }, [session, load]);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  async function save(patch: Partial<Settings>) {
    setSaving(true);
    await fetch("/api/profil/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    setSettings(s => s ? { ...s, ...patch } : s);
    flash("Sauvegardé.");
  }

  async function toggleInApp(channelId: string, current: boolean) {
    await fetch("/api/profil/channel-notifs", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, inAppNotif: !current }),
    });
    setSettings(s => s ? {
      ...s,
      channels: s.channels.map(c => c.channelId === channelId ? { ...c, inAppNotif: !current } : c),
    } : s);
  }

  async function subscribeEmail(channelId: string) {
    const email = emailInputs[channelId];
    if (!email?.includes("@")) return;
    const r = await fetch("/api/profil/channel-notifs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, email }),
    });
    if (r.ok) {
      setSettings(s => s ? {
        ...s,
        channels: s.channels.map(c => c.channelId === channelId
          ? { ...c, emailFollow: { channelId, email, confirmed: true } } : c),
      } : s);
      setEmailInputs(e => ({ ...e, [channelId]: "" }));
      flash("Abonnement email activé.");
    }
  }

  async function unsubscribeEmail(channelId: string) {
    await fetch("/api/profil/channel-notifs", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    });
    setSettings(s => s ? {
      ...s,
      channels: s.channels.map(c => c.channelId === channelId ? { ...c, emailFollow: null } : c),
    } : s);
    flash("Abonnement email supprimé.");
  }

  if (!session) return <div className="p-12 text-center text-sm" style={{ color: "#6b7280" }}>Connectez-vous.</div>;
  if (error) return (
    <div className="p-12 text-center text-sm" style={{ color: "#ef4444" }}>
      Erreur : {error}
      <br /><button onClick={() => { setError(""); load(); }} className="mt-3 text-xs underline" style={{ color: "#9ca3af" }}>Réessayer</button>
    </div>
  );
  if (!settings) return <div className="p-12 text-center text-sm" style={{ color: "#6b7280" }}>Chargement...</div>;

  const hubChannels = settings.channels.filter(c => !c.clanId);
  const clanChannels = settings.channels.filter(c => c.clanId);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      {/* Retour */}
      <Link href="/profil" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors"
        style={{ color: "#4a4a4a" }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#9ca3af"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#4a4a4a"; }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Profil
      </Link>

      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Hub</p>
      <h1 className="mb-8 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>Paramètres</h1>

      {msg && (
        <div className="mb-6 rounded-sm border px-4 py-3 text-sm" style={{ borderColor: "#2a2a2a", background: "#111", color: "#9ca3af" }}>{msg}</div>
      )}

      {/* ── Confidentialité ── */}
      <section className="mb-6 rounded-sm border p-6 space-y-4" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#4a4a4a" }}>Confidentialité</h2>
        <p className="text-sm" style={{ color: "#6b7280" }}>
          En mode anonyme, votre nom est masqué dans les messages et listes publiques.
          Seuls les membres autorisés peuvent révéler votre identité.
        </p>
        <button
          onClick={() => save({ anonymous: !settings.anonymous })}
          disabled={saving}
          className="rounded-sm border px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.1em] transition-all disabled:opacity-50"
          style={{
            borderColor: settings.anonymous ? "#ef4444" : "#3a3a3a",
            color: settings.anonymous ? "#ef4444" : "#9ca3af",
            background: settings.anonymous ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.03)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = settings.anonymous ? "#ef4444" : "#f2f2f5";
            e.currentTarget.style.background = settings.anonymous ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = settings.anonymous ? "#ef4444" : "#3a3a3a";
            e.currentTarget.style.background = settings.anonymous ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.03)";
          }}>
          {settings.anonymous ? "Anonyme activé — Désactiver" : "Activer le mode anonyme"}
        </button>
      </section>

      {/* ── Préférences notifications ── */}
      <section className="mb-6 rounded-sm border p-6 space-y-6" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#4a4a4a" }}>Préférences de notifications</h2>

        <NotifPref
          label="Missions"
          value={settings.notifMissions}
          onChange={v => save({ notifMissions: v })}
          disabled={saving}
        />
        <div className="h-px" style={{ background: "#1a1a1a" }} />
        <NotifPref
          label="Événements"
          value={settings.notifEvents}
          onChange={v => save({ notifEvents: v })}
          disabled={saving}
        />
      </section>

      {/* ── Canaux ── */}
      <section className="rounded-sm border p-6 space-y-5" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#4a4a4a" }}>Notifications par canal</h2>
          <p className="mt-1 text-xs" style={{ color: "#3a3a3a" }}>
            Gérez les notifications in-app et les alertes email pour chaque canal rejoint.
          </p>
        </div>

        {settings.channels.length === 0 && (
          <p className="text-sm" style={{ color: "#3a3a3a" }}>Vous n'êtes membre d'aucun canal pour l'instant.</p>
        )}

        {hubChannels.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>Canaux Hub</p>
            {hubChannels.map(ch => (
              <ChannelRow key={ch.channelId} ch={ch}
                emailInput={emailInputs[ch.channelId] ?? ""}
                onEmailInput={v => setEmailInputs(e => ({ ...e, [ch.channelId]: v }))}
                onToggleInApp={() => toggleInApp(ch.channelId, ch.inAppNotif)}
                onSubscribeEmail={() => subscribeEmail(ch.channelId)}
                onUnsubscribeEmail={() => unsubscribeEmail(ch.channelId)}
              />
            ))}
          </div>
        )}

        {clanChannels.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>Canaux Clan</p>
            {clanChannels.map(ch => (
              <ChannelRow key={ch.channelId} ch={ch}
                emailInput={emailInputs[ch.channelId] ?? ""}
                onEmailInput={v => setEmailInputs(e => ({ ...e, [ch.channelId]: v }))}
                onToggleInApp={() => toggleInApp(ch.channelId, ch.inAppNotif)}
                onSubscribeEmail={() => subscribeEmail(ch.channelId)}
                onUnsubscribeEmail={() => unsubscribeEmail(ch.channelId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NotifPref({ label, value, onChange, disabled }: {
  label: string; value: string; onChange: (v: string) => void; disabled: boolean;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold" style={{ color: "#e5e7eb" }}>{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {notifOptions.map(opt => (
          <button key={opt.value} onClick={() => onChange(opt.value)} disabled={disabled}
            className="rounded-sm border px-3 py-2.5 text-left transition-all disabled:opacity-50"
            style={{
              borderColor: value === opt.value ? "#c9a84c" : "#2a2a2a",
              background: value === opt.value ? "rgba(201,168,76,0.08)" : "transparent",
            }}
            onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.borderColor = "#4a4a4a"; }}
            onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.borderColor = "#2a2a2a"; }}>
            <p className="text-xs font-semibold" style={{ color: value === opt.value ? "#c9a84c" : "#e5e7eb" }}>{opt.label}</p>
            <p className="mt-0.5 text-xs" style={{ color: "#4a4a4a" }}>{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChannelRow({ ch, emailInput, onEmailInput, onToggleInApp, onSubscribeEmail, onUnsubscribeEmail }: {
  ch: ChannelSetting;
  emailInput: string;
  onEmailInput: (v: string) => void;
  onToggleInApp: () => void;
  onSubscribeEmail: () => void;
  onUnsubscribeEmail: () => void;
}) {
  const [showEmail, setShowEmail] = useState(false);
  const clanColor = ch.clan?.colorPrimary ?? "#c9a84c";

  return (
    <div className="rounded-sm border p-4 space-y-3" style={{ borderColor: "#1a1a1a", background: "#080808" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: "#e5e7eb" }}># {ch.channelName}</span>
            {ch.clan && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-sm"
                style={{ color: clanColor, border: `1px solid ${clanColor}40`, background: `${clanColor}0a` }}>
                {ch.clan.name}
              </span>
            )}
          </div>
          {ch.channelDesc && <p className="mt-0.5 text-xs" style={{ color: "#4a4a4a" }}>{ch.channelDesc}</p>}
        </div>

        {/* Toggle in-app */}
        <button onClick={onToggleInApp}
          className="shrink-0 rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition-all"
          style={{
            borderColor: ch.inAppNotif ? "#c9a84c" : "#2a2a2a",
            color: ch.inAppNotif ? "#c9a84c" : "#4a4a4a",
            background: ch.inAppNotif ? "rgba(201,168,76,0.06)" : "transparent",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = ch.inAppNotif ? "#c9a84c" : "#4a4a4a"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = ch.inAppNotif ? "#c9a84c" : "#2a2a2a"; }}
          title="Notifications in-app">
          {ch.inAppNotif ? "🔔 In-app" : "🔕 In-app"}
        </button>
      </div>

      {/* Email notif */}
      <div className="flex items-center gap-2 flex-wrap">
        {ch.emailFollow ? (
          <>
            <span className="text-xs" style={{ color: "#22c55e" }}>✉ {ch.emailFollow.email}</span>
            <button onClick={onUnsubscribeEmail}
              className="text-xs px-2 py-1 rounded-sm transition-colors"
              style={{ color: "#4a4a4a", border: "1px solid #2a2a2a" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "#ef4444"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#4a4a4a"; e.currentTarget.style.borderColor = "#2a2a2a"; }}>
              Désabonner
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setShowEmail(!showEmail)}
              className="text-xs px-2 py-1 rounded-sm transition-colors"
              style={{ color: "#4a4a4a", border: "1px solid #2a2a2a" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#9ca3af"; e.currentTarget.style.borderColor = "#4a4a4a"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#4a4a4a"; e.currentTarget.style.borderColor = "#2a2a2a"; }}>
              + Email
            </button>
            {showEmail && (
              <div className="flex items-center gap-2">
                <input type="email" value={emailInput} onChange={e => onEmailInput(e.target.value)}
                  className="rounded-sm border px-3 py-1.5 text-xs outline-none w-48" style={inp}
                  placeholder="votre@email.com"
                  onKeyDown={e => { if (e.key === "Enter") { onSubscribeEmail(); setShowEmail(false); } }} />
                <button onClick={() => { onSubscribeEmail(); setShowEmail(false); }}
                  className="text-xs px-3 py-1.5 rounded-sm"
                  style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
                  OK
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
