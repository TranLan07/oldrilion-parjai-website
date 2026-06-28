"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";

type ChannelMember = { user: { id: string; displayName: string }; muted: boolean };
type Channel = {
  id: string; name: string; description: string; isPrivate: boolean;
  emailNotifEnabled: boolean; emailNotifDelayMin: number;
  members: ChannelMember[]; _count: { messages: number };
};
type Message = {
  id: string; content: string; createdAt: string;
  user: { id: string; displayName: string; role: string; grade: string };
};
type UserOption = { id: string; displayName: string };

const inp = "w-full rounded border border-accent-dim/30 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

export default function MessageriePage() {
  const { data: session } = useSession();
  const perm = ((session as unknown as Record<string, unknown>)?.permissionLevel as number) || 0;
  const isAdmin = perm >= 10;

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showFollow, setShowFollow] = useState(false);
  const [followEmail, setFollowEmail] = useState("");
  const [followMsg, setFollowMsg] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", isPrivate: false });
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const firstLoad = useRef(true);

  const loadChannels = useCallback(async () => {
    const res = await fetch("/api/channels");
    if (!res.ok) return;
    const data: Channel[] = await res.json();
    setChannels(data);
    if (firstLoad.current && data.length > 0) {
      setActiveId(data[0].id);
      firstLoad.current = false;
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!activeId) return;
    const res = await fetch(`/api/channels/${activeId}/messages`);
    if (res.ok) setMessages(await res.json());
  }, [activeId]);

  useEffect(() => { if (session) loadChannels(); }, [session, loadChannels]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages();
    pollRef.current = setInterval(loadMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [activeId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isAdmin && allUsers.length === 0) {
      fetch("/api/admin/users").then(r => r.ok ? r.json() : []).then(setAllUsers);
    }
  }, [isAdmin, allUsers.length]);

  const active = channels.find((c) => c.id === activeId);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !activeId) return;
    setSending(true);
    const res = await fetch(`/api/channels/${activeId}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMsg }),
    });
    if (res.ok) {
      setNewMsg("");
      loadMessages();
    } else {
      try {
        const err = await res.json();
        if (err.error) setNewMsg(`[Erreur: ${err.error}]`);
      } catch {
        setNewMsg(`[Erreur ${res.status}]`);
      }
    }
    setSending(false);
  }

  async function createChannel() {
    if (!createForm.name.trim()) return;
    await fetch("/api/admin/channels", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    setCreateForm({ name: "", description: "", isPrivate: false });
    setShowCreate(false);
    loadChannels();
  }

  async function deleteChannel() {
    if (!activeId) return;
    await fetch("/api/admin/channels", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeId }),
    });
    setActiveId(null);
    firstLoad.current = true;
    loadChannels();
    setShowAdmin(false);
  }

  async function memberAction(action: string, userId: string) {
    if (!activeId) return;
    await fetch(`/api/channels/${activeId}/members`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId }),
    });
    loadChannels();
  }

  async function updateSettings(data: object) {
    if (!activeId) return;
    await fetch(`/api/channels/${activeId}/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    loadChannels();
  }

  async function followChannel() {
    if (!activeId || !followEmail.includes("@")) return;
    const res = await fetch(`/api/channels/${activeId}/follow`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: followEmail }),
    });
    const data = await res.json();
    setFollowMsg(data.message || data.error || "Erreur");
    if (res.ok) setFollowEmail("");
  }

  async function unfollowChannel() {
    if (!activeId) return;
    await fetch(`/api/channels/${activeId}/follow`, { method: "DELETE" });
    setFollowMsg("Suivi annulé");
  }

  if (!session) {
    return <div className="p-12 text-center text-foreground/50">Connectez-vous pour accéder à la messagerie.</div>;
  }

  const isMuted = active?.members.some(m => m.user.id === session.user?.id && m.muted);

  // Hide footer on messagerie page
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "none";
    return () => { if (footer) footer.style.display = ""; };
  }, []);

  return (
    <div className="flex overflow-hidden" style={{ height: "calc(100vh - 61px)" }}>
      {/* ── Sidebar gauche : Canaux ── */}
      <aside className={`${activeId ? "hidden md:flex" : "flex"} w-full md:w-60 shrink-0 flex-col border-r border-accent-dim/20 bg-surface`}>
        <div className="flex items-center justify-between border-b border-accent-dim/20 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">Canaux</h2>
          {isAdmin && (
            <button onClick={() => setShowCreate(!showCreate)} className="text-xs text-foreground/40 hover:text-accent" title="Nouveau canal">+</button>
          )}
        </div>

        {showCreate && isAdmin && (
          <div className="border-b border-accent-dim/20 p-3 space-y-2">
            <input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} className={inp} placeholder="Nom du canal" />
            <input value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} className={inp} placeholder="Description" />
            <label className="flex items-center gap-2 text-xs text-foreground/60 cursor-pointer">
              <input type="checkbox" checked={createForm.isPrivate} onChange={e => setCreateForm({ ...createForm, isPrivate: e.target.checked })} className="accent-accent" /> Privé
            </label>
            <div className="flex gap-1">
              <button onClick={createChannel} className="rounded bg-accent px-3 py-1 text-xs text-background hover:bg-accent-dim">Créer</button>
              <button onClick={() => setShowCreate(false)} className="rounded px-2 py-1 text-xs text-foreground/50 hover:text-foreground">Annuler</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {channels.map((ch) => (
            <button key={ch.id} onClick={() => { setActiveId(ch.id); setShowAdmin(false); setShowFollow(false); }}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${activeId === ch.id ? "bg-accent/10 text-accent" : "text-foreground/70 hover:bg-surface-light"}`}
            >
              <span className="text-foreground/40">#</span>
              <span className="flex-1 truncate">{ch.name}</span>
              {ch.isPrivate && <span className="text-xs text-foreground/30">🔒</span>}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Zone centrale ── */}
      <div className={`${!activeId ? "hidden md:flex" : "flex"} flex-1 flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-accent-dim/20 bg-surface px-4 sm:px-6 py-2.5">
          {active ? (
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveId(null)} className="text-foreground/40 hover:text-accent md:hidden" title="Retour">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div>
                <h3 className="font-semibold"><span className="text-foreground/40"># </span>{active.name}</h3>
                {active.description && <p className="text-xs text-foreground/50">{active.description}</p>}
              </div>
            </div>
          ) : <p className="text-foreground/50">Sélectionnez un canal</p>}

          {active && (
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowFollow(!showFollow); setShowAdmin(false); }}
                className={`rounded px-2.5 py-1 text-xs transition-colors ${showFollow ? "bg-accent/20 text-accent" : "text-foreground/40 hover:text-accent"}`}
                title="Suivre par email">✉</button>
              {isAdmin && (
                <button onClick={() => { setShowAdmin(!showAdmin); setShowFollow(false); }}
                  className={`rounded px-2.5 py-1 text-xs transition-colors ${showAdmin ? "bg-accent/20 text-accent" : "text-foreground/40 hover:text-accent"}`}
                  title="Admin">⚙</button>
              )}
            </div>
          )}
        </div>

        {/* Follow panel */}
        {showFollow && active && (
          <div className="border-b border-accent-dim/20 bg-surface-light px-6 py-3">
            {active.emailNotifEnabled ? (
              <div className="flex items-center gap-2">
                <input value={followEmail} onChange={e => setFollowEmail(e.target.value)} className={`flex-1 max-w-xs ${inp}`} placeholder="votre@email.com"
                  onKeyDown={e => { if (e.key === "Enter") followChannel(); }} />
                <button onClick={followChannel} className="rounded bg-accent px-3 py-1.5 text-xs text-background hover:bg-accent-dim">Suivre</button>
                <button onClick={unfollowChannel} className="rounded px-3 py-1.5 text-xs text-foreground/50 hover:text-red-400">Ne plus suivre</button>
              </div>
            ) : (
              <p className="text-xs text-foreground/40">Les notifications email sont désactivées sur ce canal.</p>
            )}
            {followMsg && <p className="mt-1 text-xs text-accent">{followMsg}</p>}
          </div>
        )}

        {/* Admin panel */}
        {showAdmin && isAdmin && active && (
          <div className="border-b border-accent-dim/20 bg-surface-light px-6 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-accent">Administration du canal</h4>
              <button onClick={deleteChannel} className="rounded bg-red-900/30 px-3 py-1 text-xs text-red-400 hover:bg-red-900/50">Supprimer le canal</button>
            </div>

            {/* Email settings */}
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 text-foreground/60 cursor-pointer">
                <input type="checkbox" checked={active.emailNotifEnabled} onChange={e => updateSettings({ emailNotifEnabled: e.target.checked })} className="accent-accent" />
                Notifs email
              </label>
              <label className="text-foreground/50">Délai min (minutes):</label>
              <input type="number" value={active.emailNotifDelayMin} onChange={e => updateSettings({ emailNotifDelayMin: parseInt(e.target.value) || 120 })}
                className={`w-20 ${inp}`} min={1} />
            </div>

            {/* Add member */}
            <div className="flex items-center gap-2">
              <select value={addUserId} onChange={e => setAddUserId(e.target.value)} className={`flex-1 max-w-xs ${inp}`}>
                <option value="">Ajouter un membre...</option>
                {allUsers.filter(u => !active.members.some(m => m.user.id === u.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.displayName}</option>
                ))}
              </select>
              {addUserId && (
                <button onClick={() => { memberAction("add", addUserId); setAddUserId(""); }} className="rounded bg-accent px-3 py-1.5 text-xs text-background">Ajouter</button>
              )}
            </div>

            {/* Members list with actions */}
            <div className="flex flex-wrap gap-1.5">
              {active.members.map(m => (
                <div key={m.user.id} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${m.muted ? "bg-red-900/20 text-red-400" : "bg-surface px-2.5 py-1 text-foreground/70"}`}>
                  <span>{m.user.displayName}</span>
                  {m.muted && <span title="Muté">🔇</span>}
                  <button onClick={() => memberAction(m.muted ? "unmute" : "mute", m.user.id)} className="text-foreground/30 hover:text-yellow-400" title={m.muted ? "Unmute" : "Mute"}>
                    {m.muted ? "🔊" : "🔇"}
                  </button>
                  <button onClick={() => memberAction("remove", m.user.id)} className="text-foreground/30 hover:text-red-400" title="Retirer">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && activeId && (
            <p className="py-8 text-center text-foreground/40">Aucun message. Soyez le premier à écrire !</p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="mb-3 flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                {msg.user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{msg.user.displayName}</span>
                  <span className="text-xs text-foreground/30">{msg.user.grade}</span>
                  <span className="text-xs text-foreground/20">
                    {new Date(msg.createdAt).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 break-words">{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {activeId && (
          <form onSubmit={sendMessage} className="border-t border-accent-dim/20 bg-surface p-3">
            {isMuted ? (
              <p className="text-center text-sm text-red-400/70">Vous êtes muté sur ce canal.</p>
            ) : (
              <div className="flex gap-2">
                <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  placeholder={`Message #${active?.name || ""}...`}
                  className="flex-1 rounded border border-accent-dim/30 bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
                  disabled={sending} />
                <button type="submit" disabled={sending || !newMsg.trim()}
                  className="rounded bg-accent px-5 py-2 text-sm font-medium text-background hover:bg-accent-dim disabled:opacity-50">
                  Envoyer
                </button>
              </div>
            )}
          </form>
        )}
      </div>

      {/* ── Sidebar droite : Membres ── */}
      {active && (
        <aside className="hidden w-52 shrink-0 border-l border-accent-dim/20 bg-surface lg:block">
          <div className="border-b border-accent-dim/20 px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Membres — {active.members.length}</h2>
          </div>
          <div className="overflow-y-auto p-2">
            {active.members.map((m) => (
              <div key={m.user.id} className="flex items-center gap-2 rounded px-2 py-1.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                  {m.user.displayName.charAt(0)}
                </div>
                <span className={`truncate text-sm ${m.muted ? "text-red-400/50 line-through" : "text-foreground/70"}`}>{m.user.displayName}</span>
                {m.muted && <span className="text-xs">🔇</span>}
              </div>
            ))}
            {active.members.length === 0 && (
              <p className="px-2 py-4 text-xs text-foreground/30">Aucun membre</p>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
