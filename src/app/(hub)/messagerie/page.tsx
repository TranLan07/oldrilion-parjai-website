"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";

type ClanInfo = { id: string; name: string; colorPrimary: string } | null;
type Channel = {
  id: string; name: string; description: string; isPrivate: boolean; accessClans: string;
  members: { user: { id: string; displayName: string }; muted: boolean }[];
  _count: { messages: number };
};
type Message = {
  id: string; content: string; createdAt: string;
  mandoa: boolean; originalContent: string | null;
  user: { id: string; displayName: string; anonymous: boolean; publicId: string; grade: string; clanId: string | null; clan: ClanInfo };
};
type Clan = { id: string; name: string; colorPrimary: string };

const gold = "#c9a84c";
const inp = { background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" };

export default function HubMessageriePage() {
  const { data: session } = useSession();
  const hubRole = (session as unknown as Record<string, unknown>)?.hubRole as string;
  const perm = (session as unknown as Record<string, unknown>)?.permissionLevel as number ?? 0;
  const isAdmin = hubRole === "admin" || hubRole === "moderator";
  const isClanAdmin = perm >= 10;
  const canCreate = isAdmin || isClanAdmin;

  const [channels, setChannels] = useState<Channel[]>([]);
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [mandoaMode, setMandoaMode] = useState(false);
  const isMandalorien = ((session as unknown as Record<string, unknown>)?.mandalorien as boolean) || false;
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createPrivate, setCreatePrivate] = useState(false);
  const [createClans, setCreateClans] = useState<string[]>([]);
  const [allClans, setAllClans] = useState<Clan[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);
  const sseRef = useRef<EventSource | null>(null);

  const loadChannels = useCallback(async () => {
    const r = await fetch("/api/hub/channels");
    if (!r.ok) return;
    const data: Channel[] = await r.json();
    setChannels(data);
    if (firstLoad.current && data.length > 0) {
      // ?channel=<id> : sélection directe (ex: redirection depuis le Marketplace)
      const requested = new URLSearchParams(window.location.search).get("channel");
      const found = requested && data.find(c => c.id === requested);
      setActiveId(found ? found.id : data[0].id);
      firstLoad.current = false;
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    loadChannels();
    // Route publique : accessible à tous les connectés (badges de clans + création de canal)
    fetch("/api/hub/clans").then(r => r.ok ? r.json() : []).then((data: Clan[]) => setAllClans(data));
  }, [session, loadChannels]);

  useEffect(() => {
    if (!activeId || !session) return;
    fetch(`/api/hub/channels/${activeId}/messages`)
      .then(r => r.ok ? r.json() : [])
      .then(setMessages);
    const es = new EventSource(`/api/hub/channels/${activeId}/sse`);
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
  }, [activeId, session]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const footer = document.querySelector("footer") as HTMLElement | null;
    if (footer) footer.style.display = "none";
    return () => { if (footer) footer.style.display = ""; };
  }, []);

  const active = channels.find(c => c.id === activeId);

  const filteredChannels = channels.filter(c => {
    if (filter === "public") return !c.isPrivate;
    if (filter === "private") return c.isPrivate;
    return true;
  });

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !activeId) return;
    setSending(true);
    await fetch(`/api/hub/channels/${activeId}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMsg, mandoa: mandoaMode }),
    });
    setNewMsg("");
    setSending(false);
  }

  async function createChannel() {
    if (!createName.trim()) return;
    await fetch("/api/hub/channels", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createName.trim(), description: createDesc.trim(),
        isPrivate: createPrivate, accessClans: createClans,
      }),
    });
    setCreateName(""); setCreateDesc(""); setCreatePrivate(false); setCreateClans([]);
    setShowCreate(false);
    loadChannels();
  }

  async function deleteChannel(id: string) {
    await fetch("/api/hub/channels", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setActiveId(null); firstLoad.current = true; loadChannels();
  }

  function toggleClan(id: string) {
    setCreateClans(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  if (!session) return (
    <div className="p-12 text-center" style={{ color: "#6b7280" }}>Connectez-vous pour accéder à la messagerie.</div>
  );

  const isMuted = active?.members.some(m => m.user.id === session.user?.id && m.muted);

  // Clans avec accès au canal actif
  const activeAccessClans: string[] = active ? (() => { try { return JSON.parse(active.accessClans); } catch { return []; } })() : [];
  const activeAccessClanInfos = allClans.filter(c => activeAccessClans.includes(c.id));

  return (
    <div className="flex overflow-hidden" style={{ height: "calc(100dvh - 61px)" }}>
      {/* Sidebar */}
      <aside className={`${activeId ? "hidden md:flex" : "flex"} w-full md:w-64 shrink-0 flex-col border-r`}
        style={{ borderColor: "#1a1a1a", background: "#080808" }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "#1a1a1a" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--font-display)", color: gold }}>
            Canaux Hub
          </h2>
          {canCreate && (
            <button onClick={() => setShowCreate(!showCreate)} className="text-lg leading-none" style={{ color: "#4a4a4a" }}>+</button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex border-b" style={{ borderColor: "#1a1a1a" }}>
          {(["all", "public", "private"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors"
              style={{ color: filter === f ? gold : "#3a3a3a", borderBottom: filter === f ? `1px solid ${gold}` : "1px solid transparent" }}>
              {f === "all" ? "Tous" : f === "public" ? "Publics" : "Diplo"}
            </button>
          ))}
        </div>

        {/* Formulaire création */}
        {showCreate && canCreate && (
          <div className="border-b p-3 space-y-2" style={{ borderColor: "#1a1a1a" }}>
            <input value={createName} onChange={e => setCreateName(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm outline-none" style={inp} placeholder="Nom du canal" />
            <input value={createDesc} onChange={e => setCreateDesc(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm outline-none" style={inp} placeholder="Description (optionnel)" />

            {/* Toggle privé */}
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setCreatePrivate(!createPrivate)}
                className="relative rounded-full transition-colors"
                style={{ width: "32px", height: "18px", background: createPrivate ? gold : "#2a2a2a", flexShrink: 0 }}>
                <div className="absolute top-0.5 rounded-full transition-all"
                  style={{ width: "14px", height: "14px", background: "#fff", left: createPrivate ? "15px" : "2px" }} />
              </div>
              <span className="text-xs" style={{ color: "#9ca3af" }}>Canal diplomatique (privé)</span>
            </label>

            {/* Sélection de clans */}
            {createPrivate && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                <p className="text-xs" style={{ color: "#4a4a4a" }}>Clans ayant accès :</p>
                {allClans.map(clan => (
                  <label key={clan.id} className="flex items-center gap-2 cursor-pointer px-1 py-0.5 rounded hover:bg-white/5">
                    <input type="checkbox" checked={createClans.includes(clan.id)} onChange={() => toggleClan(clan.id)}
                      className="rounded" />
                    <span className="text-xs font-semibold" style={{ color: clan.colorPrimary }}>{clan.name}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-1">
              <button onClick={createChannel} className="rounded px-3 py-1 text-xs font-semibold"
                style={{ background: gold, color: "#1a1408" }}>Créer</button>
              <button onClick={() => { setShowCreate(false); setCreatePrivate(false); setCreateClans([]); }}
                className="rounded px-2 py-1 text-xs" style={{ color: "#4a4a4a" }}>Annuler</button>
            </div>
          </div>
        )}

        {/* Liste des canaux */}
        <div className="flex-1 overflow-y-auto">
          {filteredChannels.length === 0 && (
            <p className="px-4 py-6 text-xs" style={{ color: "#3a3a3a" }}>Aucun canal.</p>
          )}
          {filteredChannels.map(ch => (
            <button key={ch.id} onClick={() => setActiveId(ch.id)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors"
              style={{ background: activeId === ch.id ? "rgba(201,168,76,0.06)" : "transparent", color: activeId === ch.id ? gold : "#6b7280" }}>
              <span style={{ color: "#3a3a3a" }}>{ch.isPrivate ? "🔒" : "#"}</span>
              <span className="flex-1 truncate">{ch.name}</span>
              <span className="text-xs" style={{ color: "#3a3a3a" }}>{ch.members.length}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Zone centrale */}
      <div className={`${!activeId ? "hidden md:flex" : "flex"} flex-1 flex-col`} style={{ background: "#0a0a0a" }}>
        {/* Header canal */}
        <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "#1a1a1a" }}>
          {active ? (
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setActiveId(null)} className="md:hidden shrink-0" style={{ color: "#4a4a4a" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold" style={{ color: "#f2f2f5" }}>
                    <span style={{ color: "#3a3a3a" }}>{active.isPrivate ? "🔒 " : "# "}</span>{active.name}
                  </h3>
                  {/* Badges des clans ayant accès */}
                  {active.isPrivate && activeAccessClanInfos.map(c => (
                    <span key={c.id} className="text-xs px-1.5 py-0.5 rounded-sm font-semibold"
                      style={{ color: c.colorPrimary, border: `1px solid ${c.colorPrimary}40` }}>
                      {c.name}
                    </span>
                  ))}
                </div>
                {active.description && <p className="text-xs" style={{ color: "#4a4a4a" }}>{active.description}</p>}
              </div>
            </div>
          ) : <p style={{ color: "#4a4a4a" }}>Sélectionnez un canal</p>}
          {active && isAdmin && (
            <button onClick={() => { if (confirm(`Supprimer le canal #${active.name} ?`)) deleteChannel(active.id); }}
              className="text-xs px-2 py-1 rounded shrink-0" style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
              Supprimer
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && activeId && (
            <p className="py-8 text-center text-sm" style={{ color: "#3a3a3a" }}>Aucun message. Soyez le premier !</p>
          )}
          {messages.map(msg => {
            const displayName = msg.user.anonymous ? `Anonyme [${msg.user.publicId}]` : msg.user.displayName;
            const clanColor = msg.user.clan?.colorPrimary ?? gold;
            return (
              <div key={msg.id} className="mb-3 flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: msg.user.anonymous ? "rgba(107,114,128,0.1)" : `${clanColor}20`, color: msg.user.anonymous ? "#6b7280" : clanColor, fontFamily: "var(--font-display)" }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: msg.user.anonymous ? "#4a4a4a" : "#e5e7eb" }}>{displayName}</span>
                    {!msg.user.anonymous && msg.user.clan && (
                      <span className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: clanColor }}>{msg.user.clan.name}</span>
                    )}
                    {!msg.user.anonymous && !msg.user.clan && (
                      <span className="text-xs" style={{ color: "#3a3a3a" }}>Sans clan</span>
                    )}
                    <span className="text-xs" style={{ color: "#3a3a3a" }}>
                      {new Date(msg.createdAt).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </span>
                  </div>
                  {msg.mandoa ? (
                    <div>
                      <p className="text-sm break-words italic" style={{ color: gold }}>{msg.content}</p>
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
        {activeId && (
          <form onSubmit={sendMessage} className="border-t p-3" style={{ borderColor: "#1a1a1a" }}>
            {isMuted ? (
              <p className="text-center text-sm" style={{ color: "#ef4444" }}>Vous êtes muté sur ce canal.</p>
            ) : (
              <div className="flex gap-2">
                {isMandalorien && (
                  <button type="button" onClick={() => setMandoaMode(!mandoaMode)}
                    className="rounded px-3 py-2 text-xs font-semibold shrink-0"
                    title={mandoaMode ? "Mode Mando'a actif" : "Activer le mode Mando'a"}
                    style={{ background: mandoaMode ? "rgba(201,168,76,0.2)" : "#111", borderWidth: 1, borderStyle: "solid", borderColor: mandoaMode ? gold : "#2a2a2a", color: mandoaMode ? gold : "#4a4a4a" }}>
                    Mando&apos;a
                  </button>
                )}
                <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  placeholder={mandoaMode ? "Message en Mando'a..." : `Message ${active?.isPrivate ? "🔒" : "#"}${active?.name ?? ""}...`}
                  className="flex-1 rounded border px-4 py-2 text-sm outline-none"
                  style={{ background: "#111", borderColor: mandoaMode ? `${gold}40` : "#2a2a2a", color: "#f2f2f5" }}
                  disabled={sending} />
                <button type="submit" disabled={sending || !newMsg.trim()}
                  className="rounded px-5 py-2 text-sm font-semibold disabled:opacity-50"
                  style={{ background: gold, color: "#1a1408" }}>Envoyer</button>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Sidebar membres */}
      {active && (
        <aside className="hidden w-44 shrink-0 border-l lg:block" style={{ borderColor: "#1a1a1a", background: "#080808" }}>
          <div className="border-b px-4 py-3" style={{ borderColor: "#1a1a1a" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--font-display)", color: "#3a3a3a" }}>
              Membres — {active.members.length}
            </h2>
          </div>
          <div className="overflow-y-auto p-2">
            {active.members.map(m => (
              <div key={m.user.id} className="flex items-center gap-2 rounded px-2 py-1.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: `${gold}15`, color: gold, fontFamily: "var(--font-display)" }}>
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
