"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

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

const inpStyle = { background: "var(--beskar-900)", borderColor: "var(--beskar-600)", color: "var(--beskar-100)" };

export default function MessageriePage() {
  const params = useParams();
  const slug = params.slug as string;
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
    const res = await fetch(`/api/clan/${slug}/channels`);
    if (!res.ok) return;
    const data: Channel[] = await res.json();
    setChannels(data);
    if (firstLoad.current && data.length > 0) {
      setActiveId(data[0].id);
      firstLoad.current = false;
    }
  }, [slug]);

  const loadMessages = useCallback(async () => {
    if (!activeId) return;
    const res = await fetch(`/api/clan/${slug}/channels/${activeId}/messages`);
    if (res.ok) setMessages(await res.json());
  }, [activeId, slug]);

  useEffect(() => { if (session) loadChannels(); }, [session, loadChannels]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages();
    pollRef.current = setInterval(loadMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [activeId, loadMessages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (isAdmin && allUsers.length === 0) {
      fetch(`/api/clan/${slug}/admin/users`).then(r => r.ok ? r.json() : []).then(setAllUsers);
    }
  }, [isAdmin, allUsers.length, slug]);

  useEffect(() => {
    const footer = document.querySelector("footer") as HTMLElement | null;
    if (footer) footer.style.display = "none";
    return () => { if (footer) footer.style.display = ""; };
  }, []);

  const active = channels.find((c) => c.id === activeId);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !activeId) return;
    setSending(true);
    const res = await fetch(`/api/clan/${slug}/channels/${activeId}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMsg }),
    });
    if (res.ok) { setNewMsg(""); loadMessages(); }
    setSending(false);
  }

  async function createChannel() {
    if (!createForm.name.trim()) return;
    await fetch(`/api/clan/${slug}/admin/channels`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    setCreateForm({ name: "", description: "", isPrivate: false });
    setShowCreate(false);
    loadChannels();
  }

  async function deleteChannel() {
    if (!activeId) return;
    await fetch(`/api/clan/${slug}/admin/channels`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeId }),
    });
    setActiveId(null); firstLoad.current = true;
    loadChannels(); setShowAdmin(false);
  }

  async function memberAction(action: string, userId: string) {
    if (!activeId) return;
    await fetch(`/api/clan/${slug}/channels/${activeId}/members`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId }),
    });
    loadChannels();
  }

  async function updateSettings(data: object) {
    if (!activeId) return;
    await fetch(`/api/clan/${slug}/channels/${activeId}/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    loadChannels();
  }

  async function followChannel() {
    if (!activeId || !followEmail.includes("@")) return;
    const res = await fetch(`/api/clan/${slug}/channels/${activeId}/follow`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: followEmail }),
    });
    const data = await res.json();
    setFollowMsg(data.message || data.error || "Erreur");
    if (res.ok) setFollowEmail("");
  }

  async function unfollowChannel() {
    if (!activeId) return;
    await fetch(`/api/clan/${slug}/channels/${activeId}/follow`, { method: "DELETE" });
    setFollowMsg("Suivi annulé");
  }

  if (!session) return (
    <div className="p-12 text-center" style={{ color: "var(--beskar-400)" }}>Connectez-vous pour accéder à la messagerie.</div>
  );

  const isMuted = active?.members.some(m => m.user.id === session.user?.id && m.muted);

  return (
    <div className="flex overflow-hidden" style={{ height: "calc(100vh - 61px)" }}>
      {/* Sidebar canaux */}
      <aside className={`${activeId ? "hidden md:flex" : "flex"} w-full md:w-60 shrink-0 flex-col border-r`}
        style={{ borderColor: "var(--beskar-700)", background: "var(--beskar-900)" }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--beskar-700)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--font-display)", color: "var(--clan-primary, var(--gold-500))" }}>Canaux</h2>
          {isAdmin && <button onClick={() => setShowCreate(!showCreate)} className="text-lg leading-none" style={{ color: "var(--beskar-400)" }}>+</button>}
        </div>
        {showCreate && isAdmin && (
          <div className="border-b p-3 space-y-2" style={{ borderColor: "var(--beskar-700)" }}>
            <input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm outline-none" style={inpStyle} placeholder="Nom du canal" />
            <div className="flex gap-1">
              <button onClick={createChannel} className="rounded px-3 py-1 text-xs font-semibold"
                style={{ background: "var(--clan-primary, var(--gold-500))", color: "#1a1408" }}>Créer</button>
              <button onClick={() => setShowCreate(false)} className="rounded px-2 py-1 text-xs" style={{ color: "var(--beskar-400)" }}>Annuler</button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {channels.map((ch) => (
            <button key={ch.id} onClick={() => { setActiveId(ch.id); setShowAdmin(false); setShowFollow(false); }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors"
              style={{ background: activeId === ch.id ? "rgba(0,0,0,0.3)" : "transparent", color: activeId === ch.id ? "var(--clan-primary, var(--gold-500))" : "var(--beskar-300)" }}>
              <span style={{ color: "var(--beskar-500)" }}>#</span>
              <span className="flex-1 truncate">{ch.name}</span>
              {ch.isPrivate && <span className="text-xs" style={{ color: "var(--beskar-500)" }}>🔒</span>}
            </button>
          ))}
        </div>
      </aside>

      {/* Zone centrale */}
      <div className={`${!activeId ? "hidden md:flex" : "flex"} flex-1 flex-col`}>
        <div className="flex items-center justify-between border-b px-4 py-2.5"
          style={{ borderColor: "var(--beskar-700)", background: "var(--beskar-900)" }}>
          {active ? (
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveId(null)} className="md:hidden" style={{ color: "var(--beskar-400)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div>
                <h3 className="font-semibold" style={{ color: "var(--beskar-100)" }}><span style={{ color: "var(--beskar-500)" }}># </span>{active.name}</h3>
                {active.description && <p className="text-xs" style={{ color: "var(--beskar-400)" }}>{active.description}</p>}
              </div>
            </div>
          ) : <p style={{ color: "var(--beskar-400)" }}>Sélectionnez un canal</p>}
          {active && (
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowFollow(!showFollow); setShowAdmin(false); }} className="rounded px-2.5 py-1 text-xs"
                style={{ color: showFollow ? "var(--clan-primary, var(--gold-500))" : "var(--beskar-400)" }}>✉</button>
              {isAdmin && <button onClick={() => { setShowAdmin(!showAdmin); setShowFollow(false); }} className="rounded px-2.5 py-1 text-xs"
                style={{ color: showAdmin ? "var(--clan-primary, var(--gold-500))" : "var(--beskar-400)" }}>⚙</button>}
            </div>
          )}
        </div>

        {showFollow && active && (
          <div className="border-b px-6 py-3" style={{ borderColor: "var(--beskar-700)", background: "var(--beskar-800)" }}>
            {active.emailNotifEnabled ? (
              <div className="flex items-center gap-2">
                <input value={followEmail} onChange={e => setFollowEmail(e.target.value)}
                  className="flex-1 max-w-xs rounded border px-3 py-2 text-sm outline-none" style={inpStyle}
                  placeholder="votre@email.com" onKeyDown={e => { if (e.key === "Enter") followChannel(); }} />
                <button onClick={followChannel} className="rounded px-3 py-1.5 text-xs font-semibold"
                  style={{ background: "var(--clan-primary, var(--gold-500))", color: "#1a1408" }}>Suivre</button>
                <button onClick={unfollowChannel} className="rounded px-3 py-1.5 text-xs" style={{ color: "var(--red-600)" }}>Ne plus suivre</button>
              </div>
            ) : <p className="text-xs" style={{ color: "var(--beskar-400)" }}>Notifications email désactivées.</p>}
            {followMsg && <p className="mt-1 text-xs" style={{ color: "var(--clan-primary, var(--gold-500))" }}>{followMsg}</p>}
          </div>
        )}

        {showAdmin && isAdmin && active && (
          <div className="border-b px-6 py-3 space-y-3" style={{ borderColor: "var(--beskar-700)", background: "var(--beskar-800)" }}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--font-display)", color: "var(--clan-primary, var(--gold-500))" }}>Administration</h4>
              <button onClick={deleteChannel} className="rounded px-3 py-1 text-xs" style={{ background: "rgba(192,57,43,0.15)", color: "var(--red-600)" }}>Supprimer</button>
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--beskar-300)" }}>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={active.emailNotifEnabled} onChange={e => updateSettings({ emailNotifEnabled: e.target.checked })} />
                Notifs email
              </label>
              <span>Délai (min):</span>
              <input type="number" value={active.emailNotifDelayMin} onChange={e => updateSettings({ emailNotifDelayMin: parseInt(e.target.value) || 120 })}
                className="w-20 rounded border px-2 py-1 text-sm outline-none" style={inpStyle} min={1} />
            </div>
            <div className="flex items-center gap-2">
              <select value={addUserId} onChange={e => setAddUserId(e.target.value)}
                className="flex-1 max-w-xs rounded border px-3 py-2 text-sm outline-none" style={inpStyle}>
                <option value="">Ajouter un membre...</option>
                {allUsers.filter(u => !active.members.some(m => m.user.id === u.id)).map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
              </select>
              {addUserId && <button onClick={() => { memberAction("add", addUserId); setAddUserId(""); }} className="rounded px-3 py-1.5 text-xs font-semibold"
                style={{ background: "var(--clan-primary, var(--gold-500))", color: "#1a1408" }}>Ajouter</button>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {active.members.map(m => (
                <div key={m.user.id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
                  style={{ background: m.muted ? "rgba(192,57,43,0.1)" : "var(--beskar-700)", color: m.muted ? "var(--red-600)" : "var(--beskar-200)" }}>
                  <span>{m.user.displayName}</span>
                  <button onClick={() => memberAction(m.muted ? "unmute" : "mute", m.user.id)} style={{ color: "var(--beskar-400)" }}>{m.muted ? "🔊" : "🔇"}</button>
                  <button onClick={() => memberAction("remove", m.user.id)} style={{ color: "var(--beskar-400)" }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && activeId && <p className="py-8 text-center text-sm" style={{ color: "var(--beskar-500)" }}>Aucun message. Soyez le premier à écrire !</p>}
          {messages.map((msg) => (
            <div key={msg.id} className="mb-3 flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: "var(--grad-blood)", color: "var(--beskar-100)", fontFamily: "var(--font-display)" }}>
                {msg.user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--beskar-100)" }}>{msg.user.displayName}</span>
                  <span className="text-xs" style={{ color: "var(--beskar-500)" }}>{msg.user.grade}</span>
                  <span className="text-xs" style={{ color: "var(--beskar-600)" }}>
                    {new Date(msg.createdAt).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm break-words" style={{ color: "var(--beskar-200)" }}>{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {activeId && (
          <form onSubmit={sendMessage} className="border-t p-3" style={{ borderColor: "var(--beskar-700)", background: "var(--beskar-900)" }}>
            {isMuted ? (
              <p className="text-center text-sm" style={{ color: "var(--red-600)" }}>Vous êtes muté sur ce canal.</p>
            ) : (
              <div className="flex gap-2">
                <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  placeholder={`Message #${active?.name ?? ""}...`}
                  className="flex-1 rounded border px-4 py-2 text-sm outline-none"
                  style={{ background: "var(--beskar-800)", borderColor: "var(--beskar-600)", color: "var(--beskar-100)" }}
                  disabled={sending} />
                <button type="submit" disabled={sending || !newMsg.trim()}
                  className="rounded px-5 py-2 text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--clan-primary, var(--gold-500))", color: "#1a1408" }}>Envoyer</button>
              </div>
            )}
          </form>
        )}
      </div>

      {active && (
        <aside className="hidden w-48 shrink-0 border-l lg:block" style={{ borderColor: "var(--beskar-700)", background: "var(--beskar-900)" }}>
          <div className="border-b px-4 py-3" style={{ borderColor: "var(--beskar-700)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--font-display)", color: "var(--beskar-400)" }}>Membres — {active.members.length}</h2>
          </div>
          <div className="overflow-y-auto p-2">
            {active.members.map((m) => (
              <div key={m.user.id} className="flex items-center gap-2 rounded px-2 py-1.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: "rgba(201,168,76,0.15)", color: "var(--clan-primary, var(--gold-500))", fontFamily: "var(--font-display)" }}>
                  {m.user.displayName.charAt(0)}
                </div>
                <span className="truncate text-sm" style={{ color: m.muted ? "var(--red-600)" : "var(--beskar-300)", textDecoration: m.muted ? "line-through" : "none" }}>
                  {m.user.displayName}
                </span>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
