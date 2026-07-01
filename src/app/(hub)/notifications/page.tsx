"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

type Notification = {
  id: string; type: string; title: string; body: string;
  read: boolean; link: string | null; createdAt: string;
};

const typeColor: Record<string, string> = {
  message: "#3b82f6", mission: "#c9a84c", event: "#22c55e",
  recruitment: "#a259e0", whitelist: "#06b6d4", report: "#ef4444",
};
const typeLabel: Record<string, string> = {
  message: "Message", mission: "Mission", event: "Evenement",
  recruitment: "Recrutement", whitelist: "Whitelist", report: "Signalement",
};

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  async function load() {
    const r = await fetch("/api/notifications");
    if (r.ok) setNotifs(await r.json());
  }
  useEffect(() => { if (session) load(); }, [session]);

  async function markRead(id: string) {
    await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }
  async function markAllRead() {
    await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ readAll: true }) });
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }
  async function del(id: string) {
    await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setNotifs(prev => prev.filter(n => n.id !== id));
  }
  async function delAll() {
    if (!confirm("Supprimer toutes les notifications ?")) return;
    await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deleteAll: true }) });
    setNotifs([]);
  }

  if (!session) return (
    <div className="p-12 text-center text-sm" style={{ color: "#6b7280" }}>Connectez-vous pour voir vos notifications.</div>
  );

  const unreadCount = notifs.filter(n => !n.read).length;
  const displayed = filter === "unread" ? notifs.filter(n => !n.read) : notifs;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Hub</p>
          <h1 className="text-4xl font-bold uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
            Notifications
            {unreadCount > 0 && (
              <span className="ml-3 rounded-full px-2 py-0.5 text-sm font-bold" style={{ background: "#ef4444", color: "#fff" }}>
                {unreadCount}
              </span>
            )}
          </h1>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="rounded-sm border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: "#2a2a2a", color: "#9ca3af" }}>Tout lire</button>
          )}
          {notifs.length > 0 && (
            <button onClick={delAll} className="rounded-sm px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>Tout supprimer</button>
          )}
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        {(["all", "unread"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em]"
            style={{ borderColor: filter === f ? "#f2f2f5" : "#2a2a2a", color: filter === f ? "#f2f2f5" : "#4a4a4a" }}>
            {f === "all" ? `Toutes (${notifs.length})` : `Non lues (${unreadCount})`}
          </button>
        ))}
      </div>

      {displayed.length === 0 && (
        <p className="py-16 text-center text-sm" style={{ color: "#4a4a4a" }}>
          {filter === "unread" ? "Aucune notification non lue." : "Aucune notification."}
        </p>
      )}

      <div className="space-y-2">
        {displayed.map(n => {
          const color = typeColor[n.type] ?? "#6b7280";
          return (
            <div key={n.id} className="rounded-sm border p-4"
              style={{ borderColor: n.read ? "#1a1a1a" : `${color}40`, background: n.read ? "#0a0a0a" : `${color}0a` }}>
              <div className="flex items-start gap-3">
                <div className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: n.read ? "#2a2a2a" : color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color }}>
                      {typeLabel[n.type] ?? n.type}
                    </span>
                    <span className="text-xs" style={{ color: "#3a3a3a" }}>
                      {new Date(n.createdAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "#e5e7eb" }}>{n.title}</p>
                  <p className="text-sm" style={{ color: "#6b7280" }}>{n.body}</p>
                  {n.link && (
                    <Link href={n.link} onClick={() => { if (!n.read) markRead(n.id); }}
                      className="mt-1 inline-block text-xs" style={{ color }}>Voir →</Link>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.read && (
                    <button onClick={() => markRead(n.id)} className="rounded-sm px-2 py-1 text-xs"
                      style={{ color: "#6b7280", border: "1px solid #2a2a2a" }}>Lu</button>
                  )}
                  <button onClick={() => del(n.id)} className="px-2 py-1 text-xs" style={{ color: "#3a3a3a" }}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
