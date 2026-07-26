"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type BaseMember = { user: { id: string; displayName: string }; muted: boolean };
type HubChannelRaw = {
  id: string; name: string; description: string; isPrivate: boolean;
  accessClans: string; accessUsers: string;
  members: BaseMember[]; _count: { messages: number };
};
type ClanChannelRaw = {
  id: string; name: string; description: string; isPrivate: boolean;
  emailNotifEnabled: boolean; emailNotifDelayMin: number;
  members: BaseMember[]; _count: { messages: number };
};
type Kind = "public" | "diplo" | "dm" | "clan";
type Channel = {
  id: string; name: string; description: string; isPrivate: boolean;
  scope: "hub" | "clan"; kind: Kind;
  members: BaseMember[]; messageCount: number;
  emailNotifEnabled?: boolean; emailNotifDelayMin?: number;
};
type Message = {
  id: string; content: string; createdAt: string;
  mandoa: boolean; originalContent: string | null;
  user: { id: string; displayName: string; anonymous: boolean; publicId: string; grade?: string; clanId?: string | null; clan?: { name: string; colorPrimary: string } | null };
};
type ClanBasic = { id: string; name: string; colorPrimary: string };
type ClanTheme = { name: string; colorBg: string; colorPrimary: string; colorAccent: string };
type UserOption = { id: string; displayName: string };
type Tab = "all" | "public" | "clan" | "dm";

const accent = "var(--clan-primary, var(--gold-500))";
const inp = { background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" };

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "public", label: "Public" },
  { key: "clan", label: "Clan" },
  { key: "dm", label: "Privé" },
];

function matchesTab(tab: Tab, kind: Kind): boolean {
  if (tab === "all") return true;
  if (tab === "public") return kind === "public" || kind === "diplo";
  if (tab === "clan") return kind === "clan";
  return kind === "dm";
}

export default function MessageriePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center" style={{ color: "#6b7280" }}>Chargement...</div>}>
      <MessageriePageInner />
    </Suspense>
  );
}

// useSearchParams() (et non une lecture manuelle de window.location.search) est indispensable
// ici : lors d'une navigation client-side (clic sur un <Link>, ex. depuis la nav d'un clan),
// window.location.search n'est pas garanti synchronisé au moment du montage du composant —
// ce qui pouvait faire démarrer la page sur le mauvais clan/onglet, puis planter (canal actif
// ne correspondant plus à la liste chargée). useSearchParams() reste toujours à jour.
function MessageriePageInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const s = session as unknown as Record<string, unknown> | undefined;
  const meId = session?.user?.id;
  const hubRole = s?.hubRole as string | undefined;
  const clanSlug = (s?.clanSlug as string | null) ?? null;
  const permissionLevel = (s?.permissionLevel as number) ?? 0;
  const isMandalorien = (s?.mandalorien as boolean) || false;
  const isHubAdmin = hubRole === "admin" || hubRole === "moderator";
  // Bypass cross-clan (accès à la messagerie d'un clan qui n'est pas le sien) : réservé
  // au rôle hub "admin" strict, à l'image de requireClanAdmin() côté API — pas les modérateurs.
  const isStrictHubAdmin = hubRole === "admin";
  const isClanAdmin = Boolean(clanSlug) && permissionLevel >= 10;

  const tabParam = searchParams.get("tab");
  const tab: Tab = (tabParam === "all" || tabParam === "public" || tabParam === "clan" || tabParam === "dm") ? tabParam : "all";
  const queryClanSlug = searchParams.get("clan");
  const [hubChannels, setHubChannels] = useState<HubChannelRaw[]>([]);
  const [clanChannels, setClanChannels] = useState<ClanChannelRaw[]>([]);
  const [hubLoaded, setHubLoaded] = useState(false);
  const [clanLoaded, setClanLoaded] = useState(false);
  const [clanTheme, setClanTheme] = useState<ClanTheme | null>(null);
  const [allClans, setAllClans] = useState<ClanBasic[]>([]);
  const [allClanUsers, setAllClanUsers] = useState<UserOption[]>([]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [mandoaMode, setMandoaMode] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createPrivate, setCreatePrivate] = useState(false);
  const [createClans, setCreateClans] = useState<string[]>([]);

  const [showAdmin, setShowAdmin] = useState(false);
  const [showFollow, setShowFollow] = useState(false);
  const [followEmail, setFollowEmail] = useState("");
  const [followMsg, setFollowMsg] = useState("");
  const [addUserId, setAddUserId] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);
  const sseRef = useRef<EventSource | null>(null);

  // Clan cible de l'onglet "Clan" : celui demandé en query (ex: lien "Messages" depuis la
  // page d'un clan) si l'utilisateur est admin hub — sinon toujours son propre clan.
  const targetClanSlug = (queryClanSlug && (isStrictHubAdmin || queryClanSlug === clanSlug)) ? queryClanSlug : clanSlug;
  const viewingForeignClan = Boolean(targetClanSlug) && targetClanSlug !== clanSlug;
  const canManageClan = isStrictHubAdmin || (!viewingForeignClan && isClanAdmin);

  const loadHubChannels = useCallback(async () => {
    const r = await fetch("/api/hub/channels");
    if (r.ok) setHubChannels(await r.json());
    setHubLoaded(true);
  }, []);

  const loadClanChannels = useCallback(async () => {
    if (!targetClanSlug) { setClanLoaded(true); return; }
    const r = await fetch(`/api/clan/${targetClanSlug}/channels`);
    if (r.ok) setClanChannels(await r.json()); else setClanChannels([]);
    setClanLoaded(true);
  }, [targetClanSlug]);

  useEffect(() => {
    if (!session) return;
    loadHubChannels();
    loadClanChannels();
    fetch("/api/hub/clans").then(r => r.ok ? r.json() : []).then(setAllClans);
    if (targetClanSlug) {
      fetch(`/api/clan/${targetClanSlug}/public`).then(r => r.ok ? r.json() : null).then(d => { if (d) setClanTheme(d); });
    }
  }, [session, loadHubChannels, loadClanChannels, targetClanSlug]);

  useEffect(() => {
    if (canManageClan && targetClanSlug && allClanUsers.length === 0) {
      fetch(`/api/clan/${targetClanSlug}/admin/users`).then(r => r.ok ? r.json() : []).then(setAllClanUsers);
    }
  }, [canManageClan, targetClanSlug, allClanUsers.length]);

  // Liste fusionnée hub + clan, chaque canal étiqueté par portée (scope) et nature (kind).
  const channels: Channel[] = useMemo(() => {
    const hub = hubChannels.map(ch => {
      let accessUsers: string[] = [];
      try { accessUsers = JSON.parse(ch.accessUsers || "[]"); } catch { /* ignore */ }
      const kind: Kind = !ch.isPrivate ? "public" : accessUsers.length > 0 ? "dm" : "diplo";
      return {
        id: ch.id, name: ch.name, description: ch.description, isPrivate: ch.isPrivate,
        scope: "hub" as const, kind, members: ch.members, messageCount: ch._count.messages,
      };
    });
    const clan = clanChannels.map(ch => ({
      id: ch.id, name: ch.name, description: ch.description, isPrivate: ch.isPrivate,
      scope: "clan" as const, kind: "clan" as const, members: ch.members, messageCount: ch._count.messages,
      emailNotifEnabled: ch.emailNotifEnabled, emailNotifDelayMin: ch.emailNotifDelayMin,
    }));
    return [...clan, ...hub];
  }, [hubChannels, clanChannels]);

  // Sélection initiale : ?channel= en priorité, sinon le premier canal correspondant à l'onglet actif.
  useEffect(() => {
    if (!firstLoad.current || !hubLoaded || !clanLoaded) return;
    firstLoad.current = false;
    const requested = searchParams.get("channel");
    if (requested && channels.some(c => c.id === requested)) { setActiveId(requested); return; }
    const pool = channels.filter(c => matchesTab(tab, c.kind));
    if (pool.length > 0) setActiveId(pool[0].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoaded, clanLoaded, channels, tab]);

  const activeChannel = useMemo(() => channels.find(c => c.id === activeId) ?? null, [channels, activeId]);

  const apiBase = useCallback((ch: Channel) => (
    ch.scope === "clan" ? `/api/clan/${targetClanSlug}/channels/${ch.id}` : `/api/hub/channels/${ch.id}`
  ), [targetClanSlug]);

  useEffect(() => {
    if (!activeChannel || !session) return;
    const base = apiBase(activeChannel);
    fetch(`${base}/messages`).then(r => r.ok ? r.json() : []).then(setMessages);
    const es = new EventSource(`${base}/sse`);
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const p = JSON.parse(e.data);
        if (p.type === "message") {
          setMessages(prev => prev.some(m => m.id === p.message.id) ? prev : [...prev, p.message]);
        }
      } catch { /* ignore */ }
    };
    es.onerror = () => { es.close(); };
    return () => { es.close(); sseRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel?.id, activeChannel?.scope, session]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function selectTab(t: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    params.delete("channel");
    router.replace(`/messagerie?${params.toString()}`, { scroll: false });
    setShowCreate(false); setShowAdmin(false); setShowFollow(false);
    const pool = channels.filter(c => matchesTab(t, c.kind));
    setActiveId(pool.length > 0 ? pool[0].id : null);
  }

  function selectChannel(id: string) {
    setActiveId(id); setShowAdmin(false); setShowFollow(false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !activeChannel) return;
    setSending(true);
    await fetch(`${apiBase(activeChannel)}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMsg, mandoa: mandoaMode }),
    });
    setNewMsg(""); setSending(false);
  }

  async function reloadActiveScope() {
    if (activeChannel?.scope === "clan") await loadClanChannels(); else await loadHubChannels();
  }

  async function createHubChannel() {
    if (!createName.trim()) return;
    await fetch("/api/hub/channels", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: createName.trim(), description: createDesc.trim(), isPrivate: createPrivate, accessClans: createClans }),
    });
    setCreateName(""); setCreateDesc(""); setCreatePrivate(false); setCreateClans([]);
    setShowCreate(false);
    loadHubChannels();
  }

  async function createClanChannel() {
    if (!createName.trim() || !targetClanSlug) return;
    await fetch(`/api/clan/${targetClanSlug}/admin/channels`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: createName.trim(), description: createDesc.trim(), isPrivate: false }),
    });
    setCreateName(""); setCreateDesc("");
    setShowCreate(false);
    loadClanChannels();
  }

  async function deleteActiveChannel() {
    if (!activeChannel) return;
    if (activeChannel.scope === "clan") {
      await fetch(`/api/clan/${targetClanSlug}/admin/channels`, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeChannel.id }),
      });
    } else {
      await fetch("/api/hub/channels", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeChannel.id }),
      });
    }
    setActiveId(null); setShowAdmin(false); firstLoad.current = true;
    reloadActiveScope();
  }

  function toggleClan(id: string) {
    setCreateClans(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  async function memberAction(action: string, userId: string) {
    if (!activeChannel || activeChannel.scope !== "clan") return;
    await fetch(`/api/clan/${targetClanSlug}/channels/${activeChannel.id}/members`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, userId }),
    });
    loadClanChannels();
  }

  async function updateSettings(data: object) {
    if (!activeChannel || activeChannel.scope !== "clan") return;
    await fetch(`/api/clan/${targetClanSlug}/channels/${activeChannel.id}/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    loadClanChannels();
  }

  async function followChannel() {
    if (!activeChannel || activeChannel.scope !== "clan" || !followEmail.includes("@")) return;
    const res = await fetch(`/api/clan/${targetClanSlug}/channels/${activeChannel.id}/follow`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: followEmail }),
    });
    const data = await res.json();
    setFollowMsg(data.message || data.error || "Erreur");
    if (res.ok) setFollowEmail("");
  }

  async function unfollowChannel() {
    if (!activeChannel || activeChannel.scope !== "clan") return;
    await fetch(`/api/clan/${targetClanSlug}/channels/${activeChannel.id}/follow`, { method: "DELETE" });
    setFollowMsg("Suivi annulé");
  }

  if (!session) return (
    <div className="p-12 text-center" style={{ color: "#6b7280" }}>Connectez-vous pour accéder à la messagerie.</div>
  );

  const isMuted = activeChannel?.members.some(m => m.user.id === meId && m.muted);
  const canManageActive = Boolean(activeChannel) && (activeChannel!.scope === "clan" ? canManageClan : isHubAdmin);
  const canCreateHub = isHubAdmin || isClanAdmin;
  const canCreateClan = Boolean(targetClanSlug) && canManageClan;
  const showCreateButton = tab === "clan" ? canCreateClan : tab === "public" ? canCreateHub : false;

  const hubAccessClans = (ch: Channel) => {
    if (ch.scope !== "hub") return [] as ClanBasic[];
    const raw = hubChannels.find(h => h.id === ch.id);
    if (!raw) return [];
    let ids: string[] = [];
    try { ids = JSON.parse(raw.accessClans || "[]"); } catch { /* ignore */ }
    return allClans.filter(c => ids.includes(c.id));
  };

  function channelLabel(ch: Channel): { icon: string; text: string } {
    if (ch.kind === "dm") {
      const other = ch.members.find(m => m.user.id !== meId);
      return { icon: "💬", text: other?.user.displayName ?? ch.name };
    }
    if (ch.kind === "diplo") return { icon: "🔒", text: ch.name };
    return { icon: "#", text: ch.name };
  }

  const grouped = tab === "all"
    ? [
        { label: "Clan", items: channels.filter(c => c.kind === "clan") },
        { label: "Public", items: channels.filter(c => c.kind === "public" || c.kind === "diplo") },
        { label: "Privé", items: channels.filter(c => c.kind === "dm") },
      ].filter(g => g.items.length > 0)
    : [{ label: null, items: channels.filter(c => matchesTab(tab, c.kind)) }];

  const themeStyle = (tab === "clan" && clanTheme)
    ? ({ "--clan-primary": clanTheme.colorPrimary, "--clan-accent": clanTheme.colorAccent, "--clan-bg": clanTheme.colorBg } as React.CSSProperties)
    : undefined;

  return (
    <div className="flex overflow-hidden" style={{ height: "calc(100dvh - 61px)", ...themeStyle }}>
      {/* Masque le footer dès le premier paint (SSR) — évite le flash de mise en page */}
      <style dangerouslySetInnerHTML={{ __html: "footer{display:none!important}" }} />

      {/* Sidebar */}
      <aside className={`${activeId ? "hidden md:flex" : "flex"} w-full md:w-64 shrink-0 flex-col border-r`}
        style={{ borderColor: "#1a1a1a", background: "#080808" }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "#1a1a1a" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--font-display)", color: accent }}>
            Messagerie
          </h2>
          {showCreateButton && (
            <button onClick={() => setShowCreate(!showCreate)} className="text-lg leading-none" style={{ color: "#4a4a4a" }}>+</button>
          )}
        </div>

        {/* Onglets */}
        <div className="flex border-b" style={{ borderColor: "#1a1a1a" }}>
          {TABS.filter(t => t.key !== "clan" || targetClanSlug).map(t => (
            <button key={t.key} onClick={() => selectTab(t.key)}
              className="flex-1 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors"
              style={{ color: tab === t.key ? accent : "#3a3a3a", borderBottom: tab === t.key ? `1px solid ${accent}` : "1px solid transparent" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Création — canal de clan (simple) */}
        {showCreate && tab === "clan" && canCreateClan && (
          <div className="border-b p-3 space-y-2" style={{ borderColor: "#1a1a1a" }}>
            <input value={createName} onChange={e => setCreateName(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm outline-none" style={inp} placeholder="Nom du canal" />
            <div className="flex gap-1">
              <button onClick={createClanChannel} className="rounded px-3 py-1 text-xs font-semibold"
                style={{ background: accent, color: "#1a1408" }}>Créer</button>
              <button onClick={() => setShowCreate(false)} className="rounded px-2 py-1 text-xs" style={{ color: "#4a4a4a" }}>Annuler</button>
            </div>
          </div>
        )}

        {/* Création — canal hub (public / diplomatique) */}
        {showCreate && tab === "public" && canCreateHub && (
          <div className="border-b p-3 space-y-2" style={{ borderColor: "#1a1a1a" }}>
            <input value={createName} onChange={e => setCreateName(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm outline-none" style={inp} placeholder="Nom du canal" />
            <input value={createDesc} onChange={e => setCreateDesc(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm outline-none" style={inp} placeholder="Description (optionnel)" />
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setCreatePrivate(!createPrivate)}
                className="relative rounded-full transition-colors"
                style={{ width: "32px", height: "18px", background: createPrivate ? accent : "#2a2a2a", flexShrink: 0 }}>
                <div className="absolute top-0.5 rounded-full transition-all"
                  style={{ width: "14px", height: "14px", background: "#fff", left: createPrivate ? "15px" : "2px" }} />
              </div>
              <span className="text-xs" style={{ color: "#9ca3af" }}>Canal diplomatique (privé)</span>
            </label>
            {createPrivate && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                <p className="text-xs" style={{ color: "#4a4a4a" }}>Clans ayant accès :</p>
                {allClans.map(clan => (
                  <label key={clan.id} className="flex items-center gap-2 cursor-pointer px-1 py-0.5 rounded hover:bg-white/5">
                    <input type="checkbox" checked={createClans.includes(clan.id)} onChange={() => toggleClan(clan.id)} className="rounded" />
                    <span className="text-xs font-semibold" style={{ color: clan.colorPrimary }}>{clan.name}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-1">
              <button onClick={createHubChannel} className="rounded px-3 py-1 text-xs font-semibold"
                style={{ background: accent, color: "#1a1408" }}>Créer</button>
              <button onClick={() => { setShowCreate(false); setCreatePrivate(false); setCreateClans([]); }}
                className="rounded px-2 py-1 text-xs" style={{ color: "#4a4a4a" }}>Annuler</button>
            </div>
          </div>
        )}

        {/* Liste des canaux */}
        <div className="flex-1 overflow-y-auto">
          {grouped.every(g => g.items.length === 0) && (
            <p className="px-4 py-6 text-xs" style={{ color: "#3a3a3a" }}>
              {tab === "dm" ? "Aucune conversation privée. Ouvrez-en une depuis vos Contacts." : tab === "clan" && !targetClanSlug ? "Vous n'appartenez à aucun clan." : "Aucun canal."}
            </p>
          )}
          {grouped.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#3a3a3a" }}>{group.label}</p>
              )}
              {group.items.map(ch => {
                const { icon, text } = channelLabel(ch);
                return (
                  <button key={ch.id} onClick={() => selectChannel(ch.id)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors"
                    style={{ background: activeId === ch.id ? "rgba(201,168,76,0.06)" : "transparent", color: activeId === ch.id ? accent : "#6b7280" }}>
                    <span style={{ color: "#3a3a3a" }}>{icon}</span>
                    <span className="flex-1 truncate">{text}</span>
                    {ch.kind !== "dm" && <span className="text-xs" style={{ color: "#3a3a3a" }}>{ch.members.length}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* Zone centrale */}
      <div className={`${!activeId ? "hidden md:flex" : "flex"} min-w-0 flex-1 flex-col`} style={{ background: "#0a0a0a" }}>
        {viewingForeignClan && tab === "clan" && (
          <div className="px-4 py-1.5 text-center text-xs font-semibold" style={{ background: "rgba(201,168,76,0.1)", color: accent }}>
            ⚙ Vous consultez la messagerie de {clanTheme?.name ?? "ce clan"} en tant qu&apos;administrateur hub — ce n&apos;est pas votre clan.
          </div>
        )}
        <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "#1a1a1a" }}>
          {activeChannel ? (
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setActiveId(null)} className="md:hidden shrink-0" style={{ color: "#4a4a4a" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold" style={{ color: "#f2f2f5" }}>
                    <span style={{ color: "#3a3a3a" }}>{channelLabel(activeChannel).icon} </span>{channelLabel(activeChannel).text}
                  </h3>
                  {activeChannel.kind === "diplo" && hubAccessClans(activeChannel).map(c => (
                    <span key={c.id} className="text-xs px-1.5 py-0.5 rounded-sm font-semibold" style={{ color: c.colorPrimary, border: `1px solid ${c.colorPrimary}40` }}>
                      {c.name}
                    </span>
                  ))}
                </div>
                {activeChannel.description && <p className="text-xs" style={{ color: "#4a4a4a" }}>{activeChannel.description}</p>}
              </div>
            </div>
          ) : <p style={{ color: "#4a4a4a" }}>Sélectionnez une conversation</p>}
          {activeChannel && (
            <div className="flex items-center gap-2 shrink-0">
              {activeChannel.scope === "clan" && (
                <button onClick={() => { setShowFollow(!showFollow); setShowAdmin(false); }} className="rounded px-2.5 py-1 text-xs"
                  style={{ color: showFollow ? accent : "#4a4a4a" }}>✉</button>
              )}
              {activeChannel.scope === "clan" && canManageActive && (
                <button onClick={() => { setShowAdmin(!showAdmin); setShowFollow(false); }} className="rounded px-2.5 py-1 text-xs"
                  style={{ color: showAdmin ? accent : "#4a4a4a" }}>⚙</button>
              )}
              {activeChannel.scope === "hub" && activeChannel.kind !== "dm" && canManageActive && (
                <button onClick={() => { if (confirm(`Supprimer #${activeChannel.name} ?`)) deleteActiveChannel(); }}
                  className="text-xs px-2 py-1 rounded" style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
                  Supprimer
                </button>
              )}
            </div>
          )}
        </div>

        {showFollow && activeChannel?.scope === "clan" && (
          <div className="border-b px-6 py-3" style={{ borderColor: "#1a1a1a", background: "#0d0d0d" }}>
            {activeChannel.emailNotifEnabled ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input value={followEmail} onChange={e => setFollowEmail(e.target.value)}
                  className="flex-1 max-w-xs rounded border px-3 py-2 text-sm outline-none" style={inp}
                  placeholder="votre@email.com" onKeyDown={e => { if (e.key === "Enter") followChannel(); }} />
                <button onClick={followChannel} className="rounded px-3 py-1.5 text-xs font-semibold" style={{ background: accent, color: "#1a1408" }}>Suivre</button>
                <button onClick={unfollowChannel} className="rounded px-3 py-1.5 text-xs" style={{ color: "#ef4444" }}>Ne plus suivre</button>
              </div>
            ) : <p className="text-xs" style={{ color: "#4a4a4a" }}>Notifications email désactivées.</p>}
            {followMsg && <p className="mt-1 text-xs" style={{ color: accent }}>{followMsg}</p>}
          </div>
        )}

        {showAdmin && activeChannel?.scope === "clan" && canManageActive && (
          <div className="border-b px-6 py-3 space-y-3" style={{ borderColor: "#1a1a1a", background: "#0d0d0d" }}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--font-display)", color: accent }}>Administration</h4>
              <button onClick={deleteActiveChannel} className="rounded px-3 py-1 text-xs" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>Supprimer</button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "#9ca3af" }}>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={activeChannel.emailNotifEnabled} onChange={e => updateSettings({ emailNotifEnabled: e.target.checked })} />
                Notifs email
              </label>
              <span>Délai (min):</span>
              <input type="number" value={activeChannel.emailNotifDelayMin} onChange={e => updateSettings({ emailNotifDelayMin: parseInt(e.target.value) || 120 })}
                className="w-20 rounded border px-2 py-1 text-sm outline-none" style={inp} min={1} />
            </div>
            <div className="flex items-center gap-2">
              <select value={addUserId} onChange={e => setAddUserId(e.target.value)}
                className="flex-1 max-w-xs rounded border px-3 py-2 text-sm outline-none" style={inp}>
                <option value="">Ajouter un membre...</option>
                {allClanUsers.filter(u => !activeChannel.members.some(m => m.user.id === u.id)).map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
              </select>
              {addUserId && <button onClick={() => { memberAction("add", addUserId); setAddUserId(""); }} className="rounded px-3 py-1.5 text-xs font-semibold"
                style={{ background: accent, color: "#1a1408" }}>Ajouter</button>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeChannel.members.map(m => (
                <div key={m.user.id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
                  style={{ background: m.muted ? "rgba(239,68,68,0.1)" : "#1a1a1a", color: m.muted ? "#ef4444" : "#e5e7eb" }}>
                  <span>{m.user.displayName}</span>
                  <button onClick={() => memberAction(m.muted ? "unmute" : "mute", m.user.id)} style={{ color: "#4a4a4a" }}>{m.muted ? "🔊" : "🔇"}</button>
                  <button onClick={() => memberAction("remove", m.user.id)} style={{ color: "#4a4a4a" }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && activeId && (
            <p className="py-8 text-center text-sm" style={{ color: "#3a3a3a" }}>Aucun message. Soyez le premier !</p>
          )}
          {messages.map(msg => {
            const displayName = msg.user.anonymous ? `Anonyme [${msg.user.publicId}]` : msg.user.displayName;
            const clanColor = msg.user.clan?.colorPrimary ?? accent;
            return (
              <div key={msg.id} className="mb-3 flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: msg.user.anonymous ? "rgba(107,114,128,0.1)" : `${clanColor}20`, color: msg.user.anonymous ? "#6b7280" : clanColor, fontFamily: "var(--font-display)" }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: msg.user.anonymous ? "#4a4a4a" : "#e5e7eb" }}>{displayName}</span>
                    {!msg.user.anonymous && msg.user.grade && <span className="text-xs" style={{ color: "#6b7280" }}>{msg.user.grade}</span>}
                    {!msg.user.anonymous && msg.user.clan && (
                      <span className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: clanColor }}>{msg.user.clan.name}</span>
                    )}
                    <span className="text-xs" style={{ color: "#3a3a3a" }}>
                      {new Date(msg.createdAt).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </span>
                  </div>
                  {msg.mandoa ? (
                    <div>
                      <p className="text-sm break-words italic" style={{ color: accent }}>{msg.content}</p>
                      {msg.originalContent && isMandalorien && (
                        <details className="mt-0.5">
                          <summary className="cursor-pointer text-xs" style={{ color: "#4a4a4a" }}>Voir la traduction</summary>
                          <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>{msg.originalContent}</p>
                        </details>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm break-words" style={{ color: "#9ca3af" }}>{msg.content}</p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {activeChannel && (
          <form onSubmit={sendMessage} className="border-t p-3" style={{ borderColor: "#1a1a1a" }}>
            {isMuted ? (
              <p className="text-center text-sm" style={{ color: "#ef4444" }}>Vous êtes muté sur ce canal.</p>
            ) : (
              <div className="flex gap-2">
                {isMandalorien && (
                  <button type="button" onClick={() => setMandoaMode(!mandoaMode)}
                    className="rounded px-3 py-2 text-xs font-semibold shrink-0"
                    title={mandoaMode ? "Mode Mando'a actif" : "Activer le mode Mando'a"}
                    style={{ background: mandoaMode ? "rgba(201,168,76,0.2)" : "#111", borderWidth: 1, borderStyle: "solid", borderColor: mandoaMode ? accent : "#2a2a2a", color: mandoaMode ? accent : "#4a4a4a" }}>
                    Mando&apos;a
                  </button>
                )}
                <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  placeholder={mandoaMode ? "Message en Mando'a..." : `Message ${channelLabel(activeChannel).icon} ${channelLabel(activeChannel).text}...`}
                  className="min-w-0 flex-1 rounded border px-4 py-2 text-sm outline-none"
                  style={{ background: "#111", borderColor: mandoaMode ? `${accent}40` : "#2a2a2a", color: "#f2f2f5" }}
                  disabled={sending} />
                <button type="submit" disabled={sending || !newMsg.trim()}
                  className="rounded px-5 py-2 text-sm font-semibold disabled:opacity-50"
                  style={{ background: accent, color: "#1a1408" }}>Envoyer</button>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Sidebar membres */}
      {activeChannel && activeChannel.kind !== "dm" && (
        <aside className="hidden w-44 shrink-0 border-l lg:block" style={{ borderColor: "#1a1a1a", background: "#080808" }}>
          <div className="border-b px-4 py-3" style={{ borderColor: "#1a1a1a" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--font-display)", color: "#3a3a3a" }}>
              Membres — {activeChannel.members.length}
            </h2>
          </div>
          <div className="overflow-y-auto p-2">
            {activeChannel.members.map(m => (
              <div key={m.user.id} className="flex items-center gap-2 rounded px-2 py-1.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: `${accent}15`, color: accent, fontFamily: "var(--font-display)" }}>
                  {m.user.displayName.charAt(0)}
                </div>
                <span className="truncate text-sm" style={{ color: m.muted ? "#ef4444" : "#6b7280" }}>{m.user.displayName}</span>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
