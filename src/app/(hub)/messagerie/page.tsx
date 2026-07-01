"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";

type ClanInfo = { name: string; colorPrimary: string } | null;
type Channel = {
  id: string; name: string; description: string;
  members: { user: { id: string; displayName: string }; muted: boolean }[];
  _count: { messages: number };
};
type Message = {
  id: string; content: string; createdAt: string;
  user: { id: string; displayName: string; anonymous: boolean; publicId: string; grade: string; clanId: string | null; clan: ClanInfo };
};

const gold = "#c9a84c";
const inp = { background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" };

export default function HubMessageriePage() {
  const { data: session } = useSession();
  const hubRole = (session as unknown as Record<string, unknown>)?.hubRole as string;
  const isAdmin = hubRole === "admin" || hubRole === "moderator";

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);
  const sseRef = useRef<EventSource | null>(null);

  const loadChannels = useCallback(async () => {
    const r = await fetch("/api/hub/channels");
    if (!r.ok) return;
    const data: Channel[] = await r.json();
    setChannels(data);
    if (firstLoad.current && data.length > 0) {
      setActiveId(data[0].id);
      firstLoad.current = false;
    }
  }, []);

  useEffect(() => { if (session) loadChannels(); }, [session, loadChannels]);

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

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !activeId) return;
    setSending(true);
    await fetch(`/api/hub/channels/${activeId}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMsg }),
    });
    setNewMsg("");
    setSending(false);
  }

  async function createChannel() {
    if (!createName.trim()) return;
    await fetch("/api/hub/channels", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: createName.trim(), description: createDesc.trim() }),
    });
    setCreateName(""); setCreateDesc(""); setShowCreate(false);
    loadChannels();
  }

  async function deleteChannel(id: string) {
    await fetch("/api/hub/channels", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setActiveId(null); firstLoad.current = true; loadChannels();
  }

  if (!session) return (
    <div className="p-12 text-center" style={{ color: "#6b7280" }}>Connectez-vous pour accéder à la messagerie.</div>
  );

  const isMuted = active?.members.some(m => m.user.id === session.user?.id && m.muted);

  return (
    <div className="flex overflow-hidden" style={{ height: "calc(100vh - 61px)" }}>
      {/* Sidebar */}
      <aside className={`${activeId ? "hidden md:flex" : "flex"} w-full md:w-60 shrink-0 flex-col border-r`}
        style={{ borderColor: "#1a1a1a", background: "#080808" }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "#1a1a1a" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--font-display)", color: gold }}>
            Canaux Hub
          </h2>
          {isAdmin && (
            <button onClick={() => setShowCreate(!showCreate)} className="text-lg leading-none" style={{ color: "#4a4a4a" }}>+</button>
          )}
        </div>

        {showCreate && isAdmin && (
          <div className="border-b p-3 space-y-2" style={{ borderColor: "#1a1a1a" }}>
            <input value={createName} onChange={e => setCreateName(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm outline-none" style={inp} placeholder="Nom du canal" />
            <input value={createDesc} onChange={e => setCreateDesc(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm outline-none" style={inp} placeholder="Description (optionnel)" />
            <div className="flex gap-1">
              <button onClick={createChannel} className="rounded px-3 py-1 text-xs font-semibold"
                style={{ background: gold, color: "#1a1408" }}>Créer</button>
              <button onClick={() => setShowCreate(false)} className="rounded px-2 py-1 text-xs" style={{ color: "#4a4a4a" }}>Annuler</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {channels.length === 0 && (
            <p className="px-4 py-6 text-xs" style={{ color: "#3a3a3a" }}>Aucun canal. Les admins hub peuvent en créer.</p>
          )}
          {channels.map(ch => (
            <button key={ch.id} onClick={() => setActiveId(ch.id)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors"
              style={{ background: activeId === ch.id ? "rgba(201,168,76,0.06)" : "transparent", color: activeId === ch.id ? gold : "#6b7280" }}>
              <span style={{ color: "#3a3a3a" }}>#</span>
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
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveId(null)} className="md:hidden" style={{ color: "#4a4a4a" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div>
                <h3 className="font-semibold" style={{ color: "#f2f2f5" }}>
                  <span style={{ color: "#3a3a3a" }}># </span>{active.name}
                </h3>
                {active.description && <p className="text-xs" style={{ color: "#4a4a4a" }}>{active.description}</p>}
              </div>
            </div>
          ) : <p style={{ color: "#4a4a4a" }}>Sélectionnez un canal</p>}
          {active && isAdmin && (
            <button onClick={() => { if (confirm(`Supprimer le canal #${active.name} ?`)) deleteChannel(active.id); }}
              className="text-xs px-2 py-1 rounded" style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
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
                  <p className="text-sm break-words" style={{ color: "#9ca3af" }}>{msg.content}</p>
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
                <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  placeholder={`Message #${active?.name ?? ""}...`}
                  className="flex-1 rounded border px-4 py-2 text-sm outline-none"
                  style={{ background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" }}
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
