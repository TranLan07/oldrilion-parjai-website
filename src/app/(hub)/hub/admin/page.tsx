"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type Clan = { id: string; slug: string; name: string; _count: { members: number }; colorPrimary: string };
type Tag = { id: string; name: string; _count: { clans: number } };
type User = { id: string; publicId: string; username: string; displayName: string; hubRole: string; clan: { name: string; slug: string } | null; createdAt: string };
type Config = Record<string, string>;

const tabs = ["Clans", "Utilisateurs", "Tags", "Config"] as const;
type Tab = typeof tabs[number];

export default function HubAdminPage() {
  const { data: session } = useSession();
  const hubRole = (session as unknown as Record<string, unknown>)?.hubRole as string;

  const [tab, setTab] = useState<Tab>("Clans");
  const [clans, setClans] = useState<Clan[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<Config>({});
  const [newClanName, setNewClanName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [configEdit, setConfigEdit] = useState<Config>({});

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  useEffect(() => { loadClans(); loadTags(); loadUsers(); loadConfig(); }, []);

  async function loadClans() {
    const r = await fetch("/api/hub/admin/clans");
    if (r.ok) setClans(await r.json());
  }
  async function loadTags() {
    const r = await fetch("/api/hub/admin/tags");
    if (r.ok) setTags(await r.json());
  }
  async function loadUsers() {
    const r = await fetch("/api/hub/admin/users");
    if (r.ok) setUsers(await r.json());
  }
  async function loadConfig() {
    const r = await fetch("/api/hub/admin/config");
    if (r.ok) { const d = await r.json(); setConfig(d); setConfigEdit(d); }
  }

  async function createClan() {
    if (!newClanName.trim()) return;
    const r = await fetch("/api/hub/admin/clans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newClanName.trim() }),
    });
    const d = await r.json();
    if (!r.ok) { flash(`Erreur : ${d.error}`); return; }
    flash(`Clan créé ! Webmaster : ${d.webmaster.username} / ${d.webmaster.tempPassword}`);
    setNewClanName("");
    loadClans();
  }

  async function deleteClan(id: string) {
    await fetch("/api/hub/admin/clans", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadClans();
  }

  async function createTag() {
    if (!newTagName.trim()) return;
    const r = await fetch("/api/hub/admin/tags", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim() }),
    });
    const d = await r.json();
    if (!r.ok) { flash(`Erreur : ${d.error}`); return; }
    setNewTagName("");
    loadTags();
  }

  async function deleteTag(id: string) {
    await fetch("/api/hub/admin/tags", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadTags();
  }

  async function banUser(id: string) {
    await fetch("/api/hub/admin/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, banned: true }) });
    flash("Utilisateur banni.");
    loadUsers();
  }

  async function saveConfig() {
    await fetch("/api/hub/admin/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(configEdit) });
    flash("Configuration sauvegardée.");
    loadConfig();
  }

  if (!session || (hubRole !== "admin" && hubRole !== "moderator")) {
    return <div className="p-12 text-center" style={{ color: "#6b7280" }}>Accès réservé aux administrateurs hub.</div>;
  }

  const filteredUsers = users.filter(u =>
    !userSearch || u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || u.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  const inputStyle = { background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" };

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <h1 className="mb-2 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>Admin Hub</h1>
      <p className="mb-8 text-sm" style={{ color: "#4a4a4a" }}>Panneau d'administration global du réseau.</p>

      {msg && <div className="mb-6 rounded-sm border px-4 py-3 text-sm" style={{ borderColor: "#2a2a2a", background: "#111", color: "#9ca3af" }}>{msg}</div>}

      {/* Tabs */}
      <div className="mb-8 flex gap-1 border-b" style={{ borderColor: "#1a1a1a" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.1em] transition-colors"
            style={{ fontFamily: "var(--font-display)", color: tab === t ? "#f2f2f5" : "#4a4a4a", borderBottom: tab === t ? "2px solid #f2f2f5" : "2px solid transparent" }}
          >{t}</button>
        ))}
      </div>

      {/* ── Clans ── */}
      {tab === "Clans" && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <input value={newClanName} onChange={e => setNewClanName(e.target.value)}
              className="rounded-sm border px-3 py-2 text-sm outline-none w-64" style={inputStyle}
              placeholder="Nom du nouveau clan"
              onKeyDown={e => { if (e.key === "Enter") createClan(); }} />
            <button onClick={createClan} className="rounded-sm px-4 py-2 text-sm font-semibold"
              style={{ background: "#f2f2f5", color: "#000" }}>Créer</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clans.map(clan => (
              <div key={clan.id} className="rounded-sm border p-4" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold uppercase tracking-[0.1em] text-sm" style={{ fontFamily: "var(--font-display)", color: clan.colorPrimary }}>{clan.name}</span>
                  <span className="text-xs" style={{ color: "#4a4a4a" }}>{clan._count.members} mbr</span>
                </div>
                <p className="mb-3 text-xs" style={{ color: "#4a4a4a" }}>/clan/{clan.slug}</p>
                <div className="flex gap-2">
                  <a href={`/clan/${clan.slug}`} className="text-xs px-2 py-1 rounded-sm border" style={{ borderColor: "#2a2a2a", color: "#6b7280" }}>Visiter</a>
                  <a href={`/clan/${clan.slug}/admin`} className="text-xs px-2 py-1 rounded-sm border" style={{ borderColor: "#2a2a2a", color: "#6b7280" }}>Admin clan</a>
                  <button onClick={() => { if (confirm(`Supprimer le clan "${clan.name}" et TOUTES ses données ?`)) deleteClan(clan.id); }}
                    className="text-xs px-2 py-1 rounded-sm" style={{ background: "rgba(192,57,43,0.1)", color: "#ef4444" }}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Utilisateurs ── */}
      {tab === "Utilisateurs" && (
        <div className="space-y-4">
          <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
            className="rounded-sm border px-3 py-2 text-sm outline-none w-72" style={inputStyle}
            placeholder="Rechercher par nom ou username..." />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: "#1a1a1a" }}>
                  {["ID", "Nom", "Username", "Clan", "Rôle hub", "Actions"].map(h => (
                    <th key={h} className="pb-3 pr-4 text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "#4a4a4a" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className="border-b" style={{ borderColor: "#111" }}>
                    <td className="py-2.5 pr-4 font-mono text-xs" style={{ color: "#4a4a4a" }}>{u.publicId}</td>
                    <td className="py-2.5 pr-4" style={{ color: "#e5e7eb" }}>{u.displayName}</td>
                    <td className="py-2.5 pr-4" style={{ color: "#6b7280" }}>@{u.username}</td>
                    <td className="py-2.5 pr-4" style={{ color: "#6b7280" }}>{u.clan?.name ?? <span style={{ color: "#3a3a3a" }}>Sans clan</span>}</td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded-sm px-1.5 py-0.5 text-xs" style={{ background: u.hubRole === "admin" ? "rgba(255,255,255,0.1)" : "#111", color: u.hubRole === "admin" ? "#f2f2f5" : "#4a4a4a" }}>
                        {u.hubRole}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <button onClick={() => { if (confirm(`Bannir ${u.displayName} ?`)) banUser(u.id); }}
                        className="text-xs px-2 py-1 rounded-sm" style={{ background: "rgba(192,57,43,0.1)", color: "#ef4444" }}>Ban</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tags ── */}
      {tab === "Tags" && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <input value={newTagName} onChange={e => setNewTagName(e.target.value)}
              className="rounded-sm border px-3 py-2 text-sm outline-none w-56" style={inputStyle}
              placeholder="Nouveau tag..."
              onKeyDown={e => { if (e.key === "Enter") createTag(); }} />
            <button onClick={createTag} className="rounded-sm px-4 py-2 text-sm font-semibold"
              style={{ background: "#f2f2f5", color: "#000" }}>Créer</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center gap-2 rounded-sm border px-3 py-2"
                style={{ borderColor: "#2a2a2a", background: "#111" }}>
                <span className="text-sm" style={{ color: "#e5e7eb" }}>{tag.name}</span>
                <span className="text-xs" style={{ color: "#4a4a4a" }}>({tag._count.clans} clans)</span>
                <button onClick={() => deleteTag(tag.id)} className="text-xs" style={{ color: "#4a4a4a" }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Config ── */}
      {tab === "Config" && (
        <div className="space-y-4 max-w-sm">
          {Object.entries(configEdit).map(([key, value]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "#4a4a4a" }}>{key}</label>
              <input value={value} onChange={e => setConfigEdit(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full rounded-sm border px-3 py-2 text-sm outline-none" style={inputStyle} />
            </div>
          ))}
          <button onClick={saveConfig} className="rounded-sm px-4 py-2 text-sm font-semibold"
            style={{ background: "#f2f2f5", color: "#000" }}>Sauvegarder</button>
        </div>
      )}
    </div>
  );
}
