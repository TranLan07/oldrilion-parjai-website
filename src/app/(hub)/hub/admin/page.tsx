"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type Clan = { id: string; slug: string; name: string; _count: { members: number }; colorPrimary: string; premium: boolean; suspended: boolean; suspendedReason: string | null };
type Tag = { id: string; name: string; _count: { clans: number } };
type User = { id: string; publicId: string; username: string; displayName: string; hubRole: string; role: string; permissionLevel: number; mandalorien: boolean; clanId: string | null; clan: { name: string; slug: string } | null; createdAt: string };
type Config = Record<string, string>;

const tabs = ["Clans", "Utilisateurs", "Tags", "Config", "Contacts", "Messagerie", "Missions", "Événements", "Dictionnaire"] as const;
type Tab = typeof tabs[number];

export default function HubAdminPage() {
  const { data: session } = useSession();
  const hubRole = (session as unknown as Record<string, unknown>)?.hubRole as string;

  type ContactMsg = { id: string; name: string; email: string; type: string; subject: string; message: string; read: boolean; createdAt: string };
  type HubChannel = { id: string; name: string; description: string; _count: { messages: number }; members: { user: { id: string; displayName: string } }[] };
  type HubMission = { id: string; title: string; description: string; status: string; maxParticipants: number; createdAt: string; clan: { name: string; slug: string; colorPrimary: string } | null };
  type HubEvent = { id: string; title: string; description: string; status: string; hubStatus: string; startAt: string | null; _count: { members: number }; clan: { name: string; slug: string; colorPrimary: string } | null };

  const [tab, setTab] = useState<Tab>("Clans");
  const [clans, setClans] = useState<Clan[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<Config>({});
  const [contacts, setContacts] = useState<ContactMsg[]>([]);
  const [newClanName, setNewClanName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ displayName: "", hubRole: "member", clanId: "", permissionLevel: "1" });
  const [resetPw, setResetPw] = useState<Record<string, string>>({});
  const [savingUser, setSavingUser] = useState(false);
  const [msg, setMsg] = useState("");
  const [configEdit, setConfigEdit] = useState<Config>({});
  const [contactEmail, setContactEmail] = useState("");
  const [contactFilter, setContactFilter] = useState<"all" | "unread">("unread");
  const [openContact, setOpenContact] = useState<string | null>(null);
  const [hubChannels, setHubChannels] = useState<HubChannel[]>([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [hubMissions, setHubMissions] = useState<HubMission[]>([]);
  const [missionForm, setMissionForm] = useState({ title: "", description: "", maxParticipants: "0" });
  const [hubEvents, setHubEvents] = useState<HubEvent[]>([]);
  const [eventForm, setEventForm] = useState({ title: "", description: "", maxParticipants: "", startAt: "" });
  const [webmasterInfo, setWebmasterInfo] = useState<Record<string, { username: string; password: string }>>({});
  type DictEntry = { id: string; french: string; mandoa: string; isAuto?: boolean };
  const [dictEntries, setDictEntries] = useState<DictEntry[]>([]);
  const [dictSearch, setDictSearch] = useState("");
  const [dictShowForm, setDictShowForm] = useState(false);
  const [dictForm, setDictForm] = useState({ french: "", mandoa: "" });
  const [dictEditing, setDictEditing] = useState<DictEntry | null>(null);
  const [dictDeleting, setDictDeleting] = useState<string | null>(null);
  const [dictConflict, setDictConflict] = useState<{ existing: DictEntry; newMandoa: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState<Record<string, string>>({});

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  async function loadContacts() {
    const r = await fetch("/api/contact");
    if (r.ok) setContacts(await r.json());
  }

  async function loadHubChannels() {
    const r = await fetch("/api/hub/channels");
    if (r.ok) setHubChannels(await r.json());
  }
  async function loadHubMissions() {
    const r = await fetch("/api/hub/admin/missions");
    if (r.ok) setHubMissions(await r.json());
  }

  async function loadHubEvents() {
    const r = await fetch("/api/hub/admin/events");
    if (r.ok) setHubEvents(await r.json());
  }

  async function loadDict() {
    const r = await fetch("/api/hub/admin/dictionary");
    if (r.ok) setDictEntries(await r.json());
  }

  useEffect(() => { loadClans(); loadTags(); loadUsers(); loadConfig(); loadContacts(); loadHubChannels(); loadHubMissions(); loadHubEvents(); loadDict(); }, []);

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
    if (r.ok) {
      const d = await r.json();
      setConfig(d); setConfigEdit(d);
      if (d.contactEmail) setContactEmail(d.contactEmail);
    }
  }

  async function saveContactEmail() {
    await fetch("/api/hub/admin/config", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...configEdit, contactEmail }),
    });
    flash("Email de contact sauvegardé.");
  }

  async function markContactRead(id: string, read: boolean) {
    await fetch("/api/contact", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, read }) });
    setContacts(prev => prev.map(c => c.id === id ? { ...c, read } : c));
  }

  async function deleteContact(id: string) {
    await fetch("/api/contact", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setContacts(prev => prev.filter(c => c.id !== id));
    if (openContact === id) setOpenContact(null);
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


  async function togglePremium(id: string, current: boolean) {
    await fetch("/api/hub/admin/clans", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, premium: !current }) });
    loadClans();
  }

  async function toggleSuspend(id: string, currentlySuspended: boolean) {
    const reason = suspendReason[id] ?? "";
    await fetch("/api/hub/admin/clans", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, suspended: !currentlySuspended, suspendedReason: reason }) });
    setSuspendReason(prev => ({ ...prev, [id]: "" }));
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

  function startEditUser(u: User) {
    setEditUserId(u.id);
    setEditForm({
      displayName: u.displayName,
      hubRole: u.hubRole,
      clanId: u.clanId ?? "",
      permissionLevel: String(u.permissionLevel),
    });
  }

  async function saveUser(id: string) {
    setSavingUser(true);
    const r = await fetch("/api/hub/admin/users", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        displayName: editForm.displayName,
        hubRole: editForm.hubRole,
        clanId: editForm.clanId || null,
        permissionLevel: Number(editForm.permissionLevel),
      }),
    });
    const d = await r.json();
    setSavingUser(false);
    if (!r.ok) { flash(`Erreur : ${d.error}`); return; }
    flash("Utilisateur mis à jour.");
    setEditUserId(null);
    loadUsers();
  }

  async function resetUserPassword(id: string) {
    const r = await fetch("/api/hub/admin/users", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resetPassword: true }),
    });
    const d = await r.json();
    if (!r.ok) { flash(`Erreur : ${d.error}`); return; }
    setResetPw(prev => ({ ...prev, [id]: d.tempPassword }));
  }

  async function toggleMandalorien(id: string, current: boolean) {
    await fetch("/api/hub/admin/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, mandalorien: !current }) });
    loadUsers();
  }

  async function deleteUser(id: string) {
    const r = await fetch("/api/hub/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const d = await r.json();
    if (!r.ok) { flash(`Erreur : ${d.error}`); return; }
    flash("Utilisateur supprimé.");
    setEditUserId(null);
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

  const isSuperAdmin = hubRole === "admin";
  const filteredUsers = users.filter(u =>
    !userSearch || u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || u.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  const inputStyle = { background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" };

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <h1 className="mb-2 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>Admin Hub</h1>
      <p className="mb-8 text-sm" style={{ color: "#4a4a4a" }}>Panneau d&apos;administration global du réseau.</p>

      {msg && <div className="mb-6 rounded-sm border px-4 py-3 text-sm" style={{ borderColor: "#2a2a2a", background: "#111", color: "#9ca3af" }}>{msg}</div>}

      {/* Tabs */}
      <div className="mb-8 flex gap-1 overflow-x-auto border-b" style={{ borderColor: "#1a1a1a" }}>
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
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-bold uppercase tracking-[0.1em] text-sm flex-1" style={{ fontFamily: "var(--font-display)", color: clan.colorPrimary }}>{clan.name}</span>
                  {clan.premium && <span className="rounded-sm px-1.5 py-0.5 text-xs font-semibold" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }}>★ Premium</span>}
                  {clan.suspended && <span className="rounded-sm px-1.5 py-0.5 text-xs font-semibold" style={{ background: "rgba(192,57,43,0.15)", color: "#ef4444", border: "1px solid rgba(192,57,43,0.3)" }}>Suspendu</span>}
                  <span className="text-xs" style={{ color: "#4a4a4a" }}>{clan._count.members} mbr</span>
                </div>
                <p className="mb-3 text-xs" style={{ color: "#4a4a4a" }}>/clan/{clan.slug}</p>
                <div className="flex flex-wrap gap-2">
                  <a href={`/clan/${clan.slug}`} className="text-xs px-2 py-1 rounded-sm border" style={{ borderColor: "#2a2a2a", color: "#6b7280" }}>Visiter</a>
                  <a href={`/clan/${clan.slug}/admin`} className="text-xs px-2 py-1 rounded-sm border" style={{ borderColor: "#2a2a2a", color: "#6b7280" }}>Admin clan</a>
                  <button onClick={async () => {
                    const r = await fetch("/api/hub/admin/clans/webmaster", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clanId: clan.id }),
                    });
                    if (r.ok) {
                      const d = await r.json();
                      setWebmasterInfo(prev => ({ ...prev, [clan.id]: d }));
                    }
                  }} className="text-xs px-2 py-1 rounded-sm border" style={{ borderColor: "#2a2a2a", color: "#c9a84c" }}>
                    Accès webmaster
                  </button>
                  <button onClick={() => togglePremium(clan.id, clan.premium)}
                    className="text-xs px-2 py-1 rounded-sm border"
                    style={{ borderColor: clan.premium ? "#c9a84c30" : "#2a2a2a", color: clan.premium ? "#c9a84c" : "#6b7280" }}>
                    {clan.premium ? "✓ Premium" : "Activer premium"}
                  </button>
                  <button onClick={() => { if (confirm(`Supprimer le clan "${clan.name}" et TOUTES ses données ? Les membres seront réinitialisés en sans-clan.`)) deleteClan(clan.id); }}
                    className="text-xs px-2 py-1 rounded-sm" style={{ background: "rgba(192,57,43,0.1)", color: "#ef4444" }}>Supprimer</button>
                </div>
                {/* Suspension */}
                <div className="mt-3 space-y-1.5">
                  {!clan.suspended && (
                    <div className="flex items-center gap-1.5">
                      <input value={suspendReason[clan.id] ?? ""} onChange={e => setSuspendReason(p => ({ ...p, [clan.id]: e.target.value }))}
                        className="flex-1 rounded-sm border px-2 py-1 text-xs outline-none" style={{ background: "#111", borderColor: "#2a2a2a", color: "#9ca3af" }}
                        placeholder="Motif (optionnel)..." />
                      <button onClick={() => toggleSuspend(clan.id, false)}
                        className="text-xs px-2 py-1 rounded-sm" style={{ background: "rgba(192,57,43,0.1)", color: "#ef4444" }}>
                        Suspendre
                      </button>
                    </div>
                  )}
                  {clan.suspended && (
                    <div className="flex items-center justify-between rounded-sm border px-2 py-1.5" style={{ borderColor: "rgba(192,57,43,0.2)", background: "rgba(192,57,43,0.05)" }}>
                      <span className="text-xs" style={{ color: "#9ca3af" }}>{clan.suspendedReason ? `Motif: ${clan.suspendedReason}` : "Aucun motif"}</span>
                      <button onClick={() => toggleSuspend(clan.id, true)}
                        className="ml-2 text-xs px-2 py-0.5 rounded-sm" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                        Lever la suspension
                      </button>
                    </div>
                  )}
                </div>
                {webmasterInfo[clan.id] && (
                  <div className="mt-3 rounded-sm border px-3 py-2 text-xs space-y-0.5" style={{ borderColor: "#c9a84c30", background: "rgba(201,168,76,0.05)" }}>
                    <p style={{ color: "#9ca3af" }}>Login : <span className="font-mono font-bold" style={{ color: "#f2f2f5" }}>{webmasterInfo[clan.id].username}</span></p>
                    <p style={{ color: "#9ca3af" }}>Mot de passe : <span className="font-mono font-bold" style={{ color: "#f2f2f5" }}>{webmasterInfo[clan.id].password}</span></p>
                    <p style={{ color: "#4a4a4a" }}>Nouveau mot de passe généré. Communiquez-le au webmaster.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Utilisateurs ── */}
      {tab === "Utilisateurs" && (
        <div className="space-y-3">
          <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
            className="rounded-sm border px-3 py-2 text-sm outline-none w-full sm:w-72" style={inputStyle}
            placeholder="Rechercher par nom ou username..." />
          {!isSuperAdmin && (
            <p className="text-xs" style={{ color: "#c9a84c" }}>Lecture seule — la gestion des utilisateurs est réservée aux administrateurs hub.</p>
          )}

          {filteredUsers.map(u => {
            const editing = editUserId === u.id;
            return (
              <div key={u.id} className="rounded-sm border" style={{ borderColor: editing ? "#c9a84c40" : "#1e1e1e", background: "#0d0d0d" }}>
                {/* En-tête carte */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <span className="font-mono text-xs" style={{ color: "#4a4a4a" }}>{u.publicId}</span>
                  <span className="font-semibold" style={{ color: "#e5e7eb" }}>{u.displayName}</span>
                  <span className="text-xs" style={{ color: "#6b7280" }}>@{u.username}</span>
                  <span className="rounded-sm px-1.5 py-0.5 text-xs" style={{ background: u.hubRole === "admin" ? "rgba(255,255,255,0.12)" : u.hubRole === "moderator" ? "rgba(201,168,76,0.12)" : "#111", color: u.hubRole === "admin" ? "#f2f2f5" : u.hubRole === "moderator" ? "#c9a84c" : "#4a4a4a" }}>
                    {u.hubRole}
                  </span>
                  <span className="text-xs" style={{ color: u.clan ? "#9ca3af" : "#3a3a3a" }}>
                    {u.clan ? `${u.clan.name} · niv.${u.permissionLevel}` : "Sans clan"}
                  </span>
                  {u.mandalorien && <span className="text-xs rounded-sm px-1.5 py-0.5" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>Mando</span>}
                  {isSuperAdmin && (
                    <button onClick={() => editing ? setEditUserId(null) : startEditUser(u)}
                      className="ml-auto text-xs px-3 py-1 rounded-sm border" style={{ borderColor: "#2a2a2a", color: editing ? "#c9a84c" : "#9ca3af" }}>
                      {editing ? "Fermer" : "Éditer"}
                    </button>
                  )}
                </div>

                {/* Panneau d'édition */}
                {editing && isSuperAdmin && (
                  <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: "#1a1a1a" }}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs uppercase tracking-wider" style={{ color: "#6b7280" }}>Nom affiché</span>
                        <input value={editForm.displayName} onChange={e => setEditForm({ ...editForm, displayName: e.target.value })}
                          className="mt-1 w-full rounded-sm border px-3 py-2 text-sm outline-none" style={inputStyle} />
                      </label>
                      <label className="block">
                        <span className="text-xs uppercase tracking-wider" style={{ color: "#6b7280" }}>Rôle hub (global)</span>
                        <select value={editForm.hubRole} onChange={e => setEditForm({ ...editForm, hubRole: e.target.value })}
                          className="mt-1 w-full rounded-sm border px-3 py-2 text-sm outline-none" style={inputStyle}>
                          <option value="member">member</option>
                          <option value="moderator">moderator</option>
                          <option value="admin">admin</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs uppercase tracking-wider" style={{ color: "#6b7280" }}>Clan</span>
                        <select value={editForm.clanId} onChange={e => setEditForm({ ...editForm, clanId: e.target.value })}
                          className="mt-1 w-full rounded-sm border px-3 py-2 text-sm outline-none" style={inputStyle}>
                          <option value="">Sans clan</option>
                          {clans.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs uppercase tracking-wider" style={{ color: "#6b7280" }}>Permission clan (niveau)</span>
                        <input type="number" min={0} value={editForm.permissionLevel} onChange={e => setEditForm({ ...editForm, permissionLevel: e.target.value })}
                          className="mt-1 w-full rounded-sm border px-3 py-2 text-sm outline-none" style={inputStyle} />
                      </label>
                    </div>

                    <p className="text-xs" style={{ color: "#3a3a3a" }}>
                      Changer de clan réinitialise grade et spécialisation. Un membre de clan est automatiquement Mandalorien.
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => saveUser(u.id)} disabled={savingUser}
                        className="text-xs px-4 py-2 rounded-sm font-semibold disabled:opacity-50" style={{ background: "#f2f2f5", color: "#000" }}>
                        {savingUser ? "..." : "Enregistrer"}
                      </button>
                      {!u.clanId && (
                        <button onClick={() => toggleMandalorien(u.id, u.mandalorien)}
                          className="text-xs px-3 py-2 rounded-sm border" style={{ borderColor: u.mandalorien ? "#c9a84c" : "#2a2a2a", color: u.mandalorien ? "#c9a84c" : "#6b7280" }}>
                          {u.mandalorien ? "Retirer Mando" : "Octroyer Mando"}
                        </button>
                      )}
                      <button onClick={() => resetUserPassword(u.id)}
                        className="text-xs px-3 py-2 rounded-sm border" style={{ borderColor: "#2a2a2a", color: "#9ca3af" }}>
                        Réinitialiser le mot de passe
                      </button>
                      <button onClick={() => { if (confirm(`Supprimer définitivement ${u.displayName} (@${u.username}) ?`)) deleteUser(u.id); }}
                        className="ml-auto text-xs px-3 py-2 rounded-sm" style={{ background: "rgba(192,57,43,0.12)", color: "#ef4444" }}>
                        Supprimer
                      </button>
                    </div>

                    {resetPw[u.id] && (
                      <div className="rounded-sm border px-3 py-2 text-xs space-y-0.5" style={{ borderColor: "#c9a84c30", background: "rgba(201,168,76,0.05)" }}>
                        <p style={{ color: "#9ca3af" }}>Nouveau mot de passe (à communiquer à l&apos;utilisateur) :</p>
                        <p className="font-mono font-bold text-base" style={{ color: "#f2f2f5" }}>{resetPw[u.id]}</p>
                        <p style={{ color: "#4a4a4a" }}>L&apos;utilisateur devra le changer à la prochaine connexion.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filteredUsers.length === 0 && <p className="py-8 text-center text-sm" style={{ color: "#3a3a3a" }}>Aucun utilisateur.</p>}
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
      {tab === "Config" && (() => {
        const configFields = [
          {
            key: "maxTagsPerClan",
            label: "Tags max par clan",
            desc: "Nombre maximum de tags qu'un clan peut avoir. Les admins de clan ne peuvent pas dépasser cette limite.",
            type: "number",
            min: 1, max: 20,
          },
          {
            key: "hubAnonRevealLevel",
            label: "Niveau de permission pour révéler les anonymes (hub)",
            desc: "Permission minimale requise pour voir la vraie identité d'un membre en mode anonyme, dans les espaces hub. (1–10)",
            type: "number",
            min: 1, max: 10,
          },
          {
            key: "contactEmail",
            label: "Email de notification — Contacts",
            desc: "Adresse email qui reçoit une alerte à chaque nouvelle demande de contact/RGPD soumise via le formulaire public.",
            type: "email",
          },
        ];

        return (
          <div className="space-y-5 max-w-lg">
            {configFields.map(field => (
              <div key={field.key} className="rounded-sm border p-5 space-y-3" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
                <div>
                  <label className="block text-sm font-semibold" style={{ color: "#f2f2f5" }}>{field.label}</label>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: "#6b7280" }}>{field.desc}</p>
                </div>
                <input
                  type={field.type}
                  value={configEdit[field.key] ?? ""}
                  onChange={e => setConfigEdit(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full rounded-sm border px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                  {...(field.min !== undefined ? { min: field.min } : {})}
                  {...(field.max !== undefined ? { max: field.max } : {})}
                  placeholder={field.type === "email" ? "admin@exemple.com" : ""}
                />
              </div>
            ))}
            <button onClick={saveConfig} className="rounded-sm px-5 py-2.5 text-sm font-semibold transition-all"
              style={{ background: "#f2f2f5", color: "#000" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#e5e7eb"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#f2f2f5"; }}>
              Sauvegarder
            </button>
          </div>
        );
      })()}

      {/* ── Messagerie inter-clans ── */}
      {tab === "Messagerie" && (
        <div className="space-y-6">
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Gérez les canaux de messagerie inter-clans accessibles à tous les membres du Hub (y compris sans-clans).
          </p>
          {/* Créer un canal */}
          <div className="rounded-sm border p-4 space-y-3" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>Nouveau canal</h3>
            <div className="flex flex-wrap gap-2">
              <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                className="rounded-sm border px-3 py-2 text-sm outline-none w-48" style={inputStyle}
                placeholder="Nom du canal" />
              <input value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)}
                className="rounded-sm border px-3 py-2 text-sm outline-none w-64" style={inputStyle}
                placeholder="Description (optionnel)" />
              <button onClick={async () => {
                if (!newChannelName.trim()) return;
                await fetch("/api/hub/channels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newChannelName.trim(), description: newChannelDesc.trim() }) });
                setNewChannelName(""); setNewChannelDesc(""); loadHubChannels(); flash("Canal créé.");
              }} className="rounded-sm px-4 py-2 text-sm font-semibold" style={{ background: "#f2f2f5", color: "#000" }}>
                Créer
              </button>
            </div>
          </div>
          {/* Liste des canaux */}
          <div className="space-y-2">
            {hubChannels.length === 0 && <p className="text-sm" style={{ color: "#3a3a3a" }}>Aucun canal hub.</p>}
            {hubChannels.map(ch => (
              <div key={ch.id} className="flex items-center justify-between rounded-sm border px-4 py-3"
                style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
                <div>
                  <span className="font-semibold text-sm" style={{ color: "#f2f2f5" }}># {ch.name}</span>
                  {ch.description && <span className="ml-2 text-xs" style={{ color: "#4a4a4a" }}>{ch.description}</span>}
                  <span className="ml-3 text-xs" style={{ color: "#3a3a3a" }}>{ch._count.messages} msg · {ch.members.length} membres</span>
                </div>
                <button onClick={async () => {
                  if (!confirm(`Supprimer #${ch.name} et tous ses messages ?`)) return;
                  await fetch("/api/hub/channels", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: ch.id }) });
                  loadHubChannels(); flash("Canal supprimé.");
                }} className="text-xs px-3 py-1.5 rounded-sm" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                  Supprimer
                </button>
              </div>
            ))}
          </div>
          <a href="/messagerie" className="inline-block text-sm" style={{ color: "#c9a84c" }}>Ouvrir la messagerie hub →</a>
        </div>
      )}

      {/* ── Missions hub ── */}
      {tab === "Missions" && (
        <div className="space-y-6">
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Missions globales du hub + missions de clans marquées &quot;global&quot;. Vous pouvez retirer une mission de clan du hub ou supprimer les missions hub.
          </p>
          {/* Créer une mission hub */}
          <div className="rounded-sm border p-4 space-y-3" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>Nouvelle mission hub</h3>
            <div className="flex flex-wrap gap-2">
              <input value={missionForm.title} onChange={e => setMissionForm(f => ({ ...f, title: e.target.value }))}
                className="rounded-sm border px-3 py-2 text-sm outline-none w-56" style={inputStyle} placeholder="Titre" />
              <input value={missionForm.description} onChange={e => setMissionForm(f => ({ ...f, description: e.target.value }))}
                className="rounded-sm border px-3 py-2 text-sm outline-none w-72" style={inputStyle} placeholder="Description" />
              <input type="number" value={missionForm.maxParticipants} onChange={e => setMissionForm(f => ({ ...f, maxParticipants: e.target.value }))}
                className="rounded-sm border px-3 py-2 text-sm outline-none w-28" style={inputStyle} placeholder="Max participants (0=∞)" min="0" />
              <button onClick={async () => {
                if (!missionForm.title.trim()) return;
                await fetch("/api/hub/admin/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(missionForm) });
                setMissionForm({ title: "", description: "", maxParticipants: "0" }); loadHubMissions(); flash("Mission créée.");
              }} className="rounded-sm px-4 py-2 text-sm font-semibold" style={{ background: "#f2f2f5", color: "#000" }}>
                Créer
              </button>
            </div>
          </div>
          {/* Liste missions */}
          <div className="space-y-2">
            {hubMissions.length === 0 && <p className="text-sm" style={{ color: "#3a3a3a" }}>Aucune mission globale.</p>}
            {hubMissions.map(m => (
              <div key={m.id} className="rounded-sm border p-4" style={{ borderColor: m.clan ? `${m.clan.colorPrimary}30` : "#1e1e1e", background: "#0d0d0d" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-sm uppercase tracking-[0.08em]" style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>{m.title}</span>
                      {m.clan ? (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-sm" style={{ color: m.clan.colorPrimary, border: `1px solid ${m.clan.colorPrimary}40` }}>{m.clan.name}</span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded-sm" style={{ color: "#6b7280", border: "1px solid #2a2a2a" }}>Hub</span>
                      )}
                      <span className="text-xs" style={{ color: "#4a4a4a" }}>{m.status}</span>
                    </div>
                    {m.description && <p className="text-xs" style={{ color: "#6b7280" }}>{m.description}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {m.clan ? (
                      <button onClick={async () => {
                        await fetch("/api/hub/admin/missions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id }) });
                        loadHubMissions(); flash("Mission retirée du hub.");
                      }} className="text-xs px-3 py-1.5 rounded-sm border" style={{ borderColor: "#2a2a2a", color: "#9ca3af" }}>
                        Retirer du Hub
                      </button>
                    ) : (
                      <>
                        <select onChange={async (e) => {
                          if (!e.target.value) return;
                          await fetch("/api/hub/admin/missions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id, status: e.target.value }) });
                          loadHubMissions(); flash("Statut mis à jour.");
                          e.target.value = "";
                        }} className="text-xs rounded-sm border px-2 py-1.5 outline-none" style={{ background: "#111", borderColor: "#2a2a2a", color: "#9ca3af" }}>
                          <option value="">Statut...</option>
                          <option value="en_cours">En cours</option>
                          <option value="validee">Validée</option>
                          <option value="abandonnee">Abandonnée</option>
                          <option value="ratee">Ratée</option>
                        </select>
                        <button onClick={async () => {
                          if (!confirm(`Supprimer la mission "${m.title}" ?`)) return;
                          await fetch("/api/hub/admin/missions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id }) });
                          loadHubMissions(); flash("Mission supprimée.");
                        }} className="text-xs px-3 py-1.5 rounded-sm" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                          Supprimer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <a href="/missions" className="inline-block text-sm" style={{ color: "#c9a84c" }}>Voir les missions hub →</a>
        </div>
      )}

      {/* ── Événements hub ── */}
      {tab === "Événements" && (
        <div className="space-y-6">
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Événements proposés par les clans (en attente d&apos;approbation) et événements hub. Approuvez, rejetez ou créez des événements visibles par tous.
          </p>

          {/* Événements en attente */}
          {hubEvents.filter(e => e.hubStatus === "pending").length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#c9a84c" }}>
                En attente ({hubEvents.filter(e => e.hubStatus === "pending").length})
              </h3>
              {hubEvents.filter(e => e.hubStatus === "pending").map(ev => (
                <div key={ev.id} className="rounded-sm border p-4 flex items-start justify-between gap-3"
                  style={{ borderColor: "#c9a84c30", background: "rgba(201,168,76,0.04)" }}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-sm" style={{ color: "#f2f2f5" }}>{ev.title}</span>
                      {ev.clan && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-sm" style={{ color: ev.clan.colorPrimary, border: `1px solid ${ev.clan.colorPrimary}40` }}>{ev.clan.name}</span>}
                      {ev.startAt && <span className="text-xs" style={{ color: "#4a4a4a" }}>{new Date(ev.startAt).toLocaleDateString("fr-FR")}</span>}
                    </div>
                    {ev.description && <p className="text-xs" style={{ color: "#6b7280" }}>{ev.description}</p>}
                    <p className="mt-1 text-xs" style={{ color: "#4a4a4a" }}>{ev._count.members} inscrits</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={async () => {
                      await fetch("/api/hub/admin/events", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: ev.id, hubStatus: "approved" }) });
                      loadHubEvents(); flash("Événement approuvé.");
                    }} className="text-xs px-3 py-1.5 rounded-sm" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                      Approuver
                    </button>
                    <button onClick={async () => {
                      await fetch("/api/hub/admin/events", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: ev.id }) });
                      loadHubEvents(); flash("Événement rejeté.");
                    }} className="text-xs px-3 py-1.5 rounded-sm" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                      Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Créer événement hub */}
          <div className="rounded-sm border p-4 space-y-3" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>Nouvel événement hub</h3>
            <div className="flex flex-wrap gap-2">
              <input value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                className="rounded-sm border px-3 py-2 text-sm outline-none w-56" style={inputStyle} placeholder="Titre" />
              <input value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                className="rounded-sm border px-3 py-2 text-sm outline-none w-72" style={inputStyle} placeholder="Description" />
              <input type="number" value={eventForm.maxParticipants} onChange={e => setEventForm(f => ({ ...f, maxParticipants: e.target.value }))}
                className="rounded-sm border px-3 py-2 text-sm outline-none w-28" style={inputStyle} placeholder="Max (0=∞)" min="0" />
              <input type="datetime-local" value={eventForm.startAt} onChange={e => setEventForm(f => ({ ...f, startAt: e.target.value }))}
                className="rounded-sm border px-3 py-2 text-sm outline-none" style={inputStyle} />
              <button onClick={async () => {
                if (!eventForm.title.trim()) return;
                await fetch("/api/hub/admin/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventForm) });
                setEventForm({ title: "", description: "", maxParticipants: "", startAt: "" }); loadHubEvents(); flash("Événement créé.");
              }} className="rounded-sm px-4 py-2 text-sm font-semibold" style={{ background: "#f2f2f5", color: "#000" }}>
                Créer
              </button>
            </div>
          </div>

          {/* Événements approuvés */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>
              Approuvés ({hubEvents.filter(e => e.hubStatus === "approved").length})
            </h3>
            {hubEvents.filter(e => e.hubStatus === "approved").length === 0 && (
              <p className="text-sm" style={{ color: "#3a3a3a" }}>Aucun événement approuvé.</p>
            )}
            {hubEvents.filter(e => e.hubStatus === "approved").map(ev => (
              <div key={ev.id} className="rounded-sm border p-4 flex items-start justify-between gap-3" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-sm" style={{ color: "#f2f2f5" }}>{ev.title}</span>
                    {ev.clan ? (
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-sm" style={{ color: ev.clan.colorPrimary, border: `1px solid ${ev.clan.colorPrimary}40` }}>{ev.clan.name}</span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 rounded-sm" style={{ color: "#6b7280", border: "1px solid #2a2a2a" }}>Hub</span>
                    )}
                    <span className="text-xs" style={{ color: "#22c55e" }}>✓ Approuvé</span>
                  </div>
                  {ev.description && <p className="text-xs" style={{ color: "#6b7280" }}>{ev.description}</p>}
                </div>
                <button onClick={async () => {
                  await fetch("/api/hub/admin/events", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: ev.id }) });
                  loadHubEvents(); flash(ev.clan ? "Événement retiré du hub." : "Événement supprimé.");
                }} className="text-xs px-3 py-1.5 rounded-sm shrink-0" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                  {ev.clan ? "Retirer" : "Supprimer"}
                </button>
              </div>
            ))}
          </div>
          <a href="/evenements" className="inline-block text-sm" style={{ color: "#c9a84c" }}>Voir les événements hub →</a>
        </div>
      )}

      {/* ── Dictionnaire ── */}
      {tab === "Dictionnaire" && (() => {
        const filtered = dictSearch
          ? dictEntries.filter(e => e.french.includes(dictSearch.toLowerCase()) || e.mandoa.toLowerCase().includes(dictSearch.toLowerCase()))
          : dictEntries;

        async function dictCreate() {
          if (!dictForm.french.trim() || !dictForm.mandoa.trim()) return;
          const res = await fetch("/api/hub/admin/dictionary", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ french: dictForm.french, mandoa: dictForm.mandoa }),
          });
          if (res.status === 409) {
            const data = await res.json();
            setDictConflict({ existing: data.existing, newMandoa: dictForm.mandoa.trim() });
            return;
          }
          setDictForm({ french: "", mandoa: "" }); setDictShowForm(false); loadDict();
        }

        async function dictForceReplace() {
          if (!dictConflict) return;
          await fetch("/api/hub/admin/dictionary", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ french: dictConflict.existing.french, mandoa: dictConflict.newMandoa, force: true }),
          });
          setDictConflict(null); setDictForm({ french: "", mandoa: "" }); setDictShowForm(false); loadDict();
        }

        async function dictSaveEdit() {
          if (!dictEditing) return;
          await fetch("/api/hub/admin/dictionary", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: dictEditing.id, french: dictEditing.french, mandoa: dictEditing.mandoa }),
          });
          setDictEditing(null); loadDict();
        }

        async function dictDelete(id: string) {
          await fetch("/api/hub/admin/dictionary", {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          setDictDeleting(null); loadDict();
        }

        return (
          <div className="space-y-4">
            {dictConflict && (
              <div className="rounded-sm border-2 p-5 space-y-3" style={{ borderColor: "#78350f", background: "#78350f20" }}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#fbbf24" }}>Conflit détecté</h3>
                <p className="text-sm" style={{ color: "#d1d5db" }}>
                  Le mot <strong style={{ color: "#c9a84c" }}>&quot;{dictConflict.existing.french}&quot;</strong> existe déjà avec <strong style={{ color: "#c9a84c" }}>&quot;{dictConflict.existing.mandoa}&quot;</strong>.
                </p>
                <p className="text-sm" style={{ color: "#9ca3af" }}>
                  Remplacer par <strong style={{ color: "#fbbf24" }}>&quot;{dictConflict.newMandoa}&quot;</strong> ?
                </p>
                <div className="flex gap-2">
                  <button onClick={dictForceReplace} className="rounded-sm px-4 py-1.5 text-sm font-semibold" style={{ background: "#92400e", color: "#fff" }}>Remplacer</button>
                  <button onClick={() => setDictConflict(null)} className="rounded-sm px-3 py-1.5 text-sm" style={{ background: "#1a1a1a", color: "#9ca3af" }}>Annuler</button>
                </div>
              </div>
            )}

            {dictShowForm ? (
              <div className="rounded-sm border p-5 space-y-3" style={{ borderColor: "#c9a84c40", background: "#0d0d0d" }}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#c9a84c" }}>Ajouter un mot</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: "#6b7280" }}>Français</label>
                    <input value={dictForm.french} onChange={e => setDictForm({ ...dictForm, french: e.target.value })}
                      className="w-full rounded-sm border px-3 py-2 text-sm outline-none" style={inputStyle} placeholder="Ex: courage" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: "#6b7280" }}>Mando&apos;a</label>
                    <input value={dictForm.mandoa} onChange={e => setDictForm({ ...dictForm, mandoa: e.target.value })}
                      className="w-full rounded-sm border px-3 py-2 text-sm outline-none" style={inputStyle} placeholder="Ex: mirshko"
                      onKeyDown={e => { if (e.key === "Enter") dictCreate(); }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={dictCreate} className="rounded-sm px-4 py-1.5 text-sm font-semibold" style={{ background: "#166534", color: "#fff" }}>Ajouter</button>
                  <button onClick={() => { setDictShowForm(false); setDictConflict(null); }} className="rounded-sm px-3 py-1.5 text-sm" style={{ background: "#1a1a1a", color: "#9ca3af" }}>Annuler</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => setDictShowForm(true)} className="rounded-sm px-5 py-2 text-sm font-semibold uppercase tracking-[0.1em]"
                  style={{ background: "#c9a84c", color: "#000" }}>+ Ajouter un mot</button>
                <span className="text-sm" style={{ color: "#3a3a3a" }}>{dictEntries.length} mot(s)</span>
              </div>
            )}

            {dictEntries.length > 0 && (
              <input value={dictSearch} onChange={e => setDictSearch(e.target.value)}
                placeholder="Rechercher un mot..." className="rounded-sm border px-3 py-2 text-sm outline-none w-full max-w-sm" style={inputStyle} />
            )}

            {filtered.length === 0 && dictEntries.length > 0 && dictSearch && (
              <p className="text-sm" style={{ color: "#3a3a3a" }}>Aucun résultat pour &quot;{dictSearch}&quot;</p>
            )}

            <div className="space-y-2">
              {filtered.map(e => (
                <div key={e.id} className="rounded-sm border px-4 py-3 flex items-center justify-between" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
                  {dictEditing?.id === e.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input value={dictEditing.french} onChange={ev => setDictEditing({ ...dictEditing, french: ev.target.value })}
                        className="flex-1 rounded-sm border px-3 py-1.5 text-sm outline-none" style={inputStyle} />
                      <span style={{ color: "#3a3a3a" }}>→</span>
                      <input value={dictEditing.mandoa} onChange={ev => setDictEditing({ ...dictEditing, mandoa: ev.target.value })}
                        className="flex-1 rounded-sm border px-3 py-1.5 text-sm outline-none" style={inputStyle}
                        onKeyDown={ev => { if (ev.key === "Enter") dictSaveEdit(); }} />
                      <button onClick={dictSaveEdit} className="rounded-sm px-3 py-1.5 text-xs font-semibold" style={{ background: "#166534", color: "#fff" }}>OK</button>
                      <button onClick={() => setDictEditing(null)} className="rounded-sm px-3 py-1.5 text-xs" style={{ background: "#1a1a1a", color: "#9ca3af" }}>Annuler</button>
                    </div>
                  ) : dictDeleting === e.id ? (
                    <div className="flex flex-1 items-center justify-between">
                      <p className="text-sm" style={{ color: "#f87171" }}>Supprimer <strong>{e.french}</strong> → <strong>{e.mandoa}</strong> ?</p>
                      <div className="flex gap-2">
                        <button onClick={() => dictDelete(e.id)} className="rounded-sm px-3 py-1.5 text-xs" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>Confirmer</button>
                        <button onClick={() => setDictDeleting(null)} className="rounded-sm px-3 py-1.5 text-xs" style={{ background: "#1a1a1a", color: "#9ca3af" }}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" style={{ color: "#f2f2f5" }}>{e.french}</span>
                        <span style={{ color: "#3a3a3a" }}>→</span>
                        <span className="font-medium text-sm" style={{ color: "#c9a84c" }}>{e.mandoa}</span>
                        {e.isAuto && (
                          <span className="rounded-sm px-1.5 py-0.5 text-xs font-semibold"
                            style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>🤖 Auto</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setDictEditing(e)} className="rounded-sm px-3 py-1.5 text-xs" style={{ background: "#1a1a1a", color: "#9ca3af" }}>Modifier</button>
                        <button onClick={() => setDictDeleting(e.id)} className="rounded-sm px-3 py-1.5 text-xs" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>Supprimer</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Contacts ── */}
      {tab === "Contacts" && (() => {
        const unread = contacts.filter(c => !c.read).length;
        const typeLabels: Record<string, string> = { rgpd: "RGPD", recrutement: "Recrutement", bug: "Bug", autre: "Autre" };
        const displayed = contactFilter === "unread" ? contacts.filter(c => !c.read) : contacts;
        return (
          <div className="space-y-6">
            {/* Email notification */}
            <div className="rounded-sm border p-4 space-y-3" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>Email de notification</h3>
              <p className="text-xs" style={{ color: "#6b7280" }}>Recevez un email à chaque nouvelle demande de contact.</p>
              <div className="flex gap-2">
                <input value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                  className="flex-1 rounded-sm border px-3 py-2 text-sm outline-none max-w-xs" style={inputStyle}
                  placeholder="admin@exemple.com" type="email" />
                <button onClick={saveContactEmail} className="rounded-sm px-4 py-2 text-sm font-semibold"
                  style={{ background: "#f2f2f5", color: "#000" }}>Enregistrer</button>
              </div>
            </div>

            {/* Filtres */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-2">
                {(["unread", "all"] as const).map(f => (
                  <button key={f} onClick={() => setContactFilter(f)}
                    className="rounded-sm border px-3 py-1.5 text-xs font-semibold"
                    style={{ borderColor: contactFilter === f ? "#f2f2f5" : "#2a2a2a", color: contactFilter === f ? "#f2f2f5" : "#4a4a4a" }}>
                    {f === "unread" ? `Non lues (${unread})` : `Toutes (${contacts.length})`}
                  </button>
                ))}
              </div>
            </div>

            {displayed.length === 0 && <p className="py-8 text-center text-sm" style={{ color: "#4a4a4a" }}>Aucune demande.</p>}

            <div className="space-y-2">
              {displayed.map(c => (
                <div key={c.id} className="rounded-sm border" style={{ borderColor: c.read ? "#1a1a1a" : "#c9a84c30", background: c.read ? "#0a0a0a" : "#c9a84c08" }}>
                  <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setOpenContact(openContact === c.id ? null : c.id)}>
                    <div className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: c.read ? "#2a2a2a" : "#c9a84c" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "#c9a84c" }}>{typeLabels[c.type] ?? c.type}</span>
                        <span className="text-sm font-semibold" style={{ color: "#f2f2f5" }}>{c.name}</span>
                        <span className="text-xs" style={{ color: "#4a4a4a" }}>{c.email}</span>
                        <span className="text-xs ml-auto" style={{ color: "#3a3a3a" }}>{new Date(c.createdAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {c.subject && <p className="text-xs" style={{ color: "#6b7280" }}>{c.subject}</p>}
                    </div>
                  </div>
                  {openContact === c.id && (
                    <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: "#1a1a1a" }}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#e5e7eb" }}>{c.message}</p>
                      <div className="mt-3 flex gap-2">
                        {!c.read && (
                          <button onClick={() => markContactRead(c.id, true)} className="rounded-sm border px-3 py-1.5 text-xs"
                            style={{ borderColor: "#2a2a2a", color: "#9ca3af" }}>Marquer lu</button>
                        )}
                        <a href={`mailto:${c.email}?subject=Re: ${c.subject || "Votre demande"}`}
                          className="rounded-sm border px-3 py-1.5 text-xs" style={{ borderColor: "#2a2a2a", color: "#9ca3af" }}>
                          Répondre par email
                        </a>
                        <button onClick={() => deleteContact(c.id)} className="rounded-sm px-3 py-1.5 text-xs ml-auto"
                          style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>Supprimer</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
