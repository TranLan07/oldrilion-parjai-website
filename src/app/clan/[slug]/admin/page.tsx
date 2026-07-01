"use client";
"use client";

import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

type User = { id: string; username: string; displayName: string; role: string; grade: string; specialization: string; permissionLevel: number };
type Recruitment = { id: string; rpName: string; discord: string; experience: string; motivation: string; specialization: string; status: string; tempPassword?: string };
type ChannelMemberAdmin = { muted: boolean; user: { id: string; displayName: true; grade: string; specialization: string } };
type Channel = { id: string; name: string; description: string; isPrivate: boolean; members: ChannelMemberAdmin[]; _count: { messages: number } };
type Mission = { id: string; title: string; description: string; status: string; confidentiality: string; maxParticipants: number; members: { user: { id: string; displayName: string } }[] };
type PagePerm = { id: string; path: string; label: string; minPermission: number };
type ContentSection = { id: string; order: number; title: string; description: string };
type Grade = { id: string; name: string; defaultPermission: number; order: number; _count: { users: number } };
type DictEntry = { id: string; french: string; mandoa: string };
type Spec = { id: string; name: string; description: string; defaultPermission: number; secret: boolean; order: number; _count: { users: number } };

type Tab = "users" | "recruitment" | "channels" | "missions" | "pages" | "lore" | "rules" | "grades" | "specs" | "dictionary";

const inp = "w-full rounded border border-accent-dim/30 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent";
const btnDanger = "rounded bg-red-900/30 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/50";
const btnPrimary = "rounded bg-accent px-5 py-2 text-sm font-medium uppercase tracking-wider text-background hover:bg-accent-dim";
const btnSecondary = "rounded bg-surface-light px-3 py-1.5 text-sm text-foreground/70 hover:text-accent";
const btnGreen = "rounded bg-green-800 px-4 py-1.5 text-sm text-white hover:bg-green-700";

const statusLabels: Record<string, string> = { en_cours: "En cours", validee: "Validée", abandonnee: "Abandonnée", ratee: "Ratée" };

export default function AdminPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  const perm = ((session as unknown as Record<string, unknown>)?.permissionLevel as number) || 0;
  const [tab, setTab] = useState<Tab>("users");

  const [users, setUsers] = useState<User[]>([]);
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [pages, setPages] = useState<PagePerm[]>([]);
  const [loreSections, setLoreSections] = useState<ContentSection[]>([]);
  const [ruleSections, setRuleSections] = useState<ContentSection[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [dictEntries, setDictEntries] = useState<DictEntry[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);

  const apiMap: Record<Tab, string> = {
    users: "/api/clan/${slug}/admin/users", recruitment: "/api/clan/${slug}/admin/recruitment", channels: "/api/clan/${slug}/admin/channels",
    missions: "/api/clan/${slug}/admin/missions", pages: "/api/clan/${slug}/admin/pages",
    lore: "/api/clan/${slug}/admin/lore", rules: "/api/clan/${slug}/admin/rules", grades: "/api/clan/${slug}/admin/grades", specs: "/api/clan/${slug}/admin/specializations", dictionary: "/api/clan/${slug}/admin/dictionary",
  };

  const load = useCallback(async () => {
    const res = await fetch(apiMap[tab]);
    if (!res.ok) return;
    const data = await res.json();
    const m: Record<Tab, (d: unknown) => void> = {
      users: (d) => setUsers(d as User[]), recruitment: (d) => setRecruitments(d as Recruitment[]),
      channels: (d) => setChannels(d as Channel[]), missions: (d) => setMissions(d as Mission[]),
      pages: (d) => setPages(d as PagePerm[]), lore: (d) => setLoreSections(d as ContentSection[]),
      rules: (d) => setRuleSections(d as ContentSection[]), grades: (d) => setGrades(d as Grade[]),
      dictionary: (d) => setDictEntries(d as DictEntry[]),
      specs: (d) => setSpecs(d as Spec[]),
    };
    m[tab]?.(data);
    if (tab === "users" || tab === "channels") {
      const [gr, sp, us] = await Promise.all([
        fetch("/api/clan/${slug}/admin/grades"),
        fetch("/api/clan/${slug}/admin/specializations"),
        tab === "channels" ? fetch("/api/clan/${slug}/admin/users") : Promise.resolve(null),
      ]);
      if (gr.ok) setGrades(await gr.json());
      if (sp.ok) setSpecs(await sp.json());
      if (us?.ok) setUsers(await us.json());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => { if (perm >= 10) load(); }, [perm, load]);

  if (!session || perm < 10) {
    return <div className="p-12 text-center text-foreground/50">Accès réservé aux administrateurs (niveau 10)</div>;
  }

  async function api(endpoint: string, method: string, body?: object) {
    await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    load();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "users", label: "Utilisateurs" }, { key: "recruitment", label: "Recrutement" },
    { key: "grades", label: "Grades" }, { key: "channels", label: "Canaux" },
    { key: "missions", label: "Missions" }, { key: "lore", label: "Lore" },
    { key: "rules", label: "Règles" }, { key: "specs", label: "Spécialisations" },
    { key: "dictionary", label: "Dictionnaire" }, { key: "pages", label: "Permissions" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-8 text-4xl font-bold tracking-widest text-accent">ADMIN</h1>
      <div className="mb-8 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded px-4 py-2 text-sm font-medium uppercase tracking-wider transition-colors ${tab === t.key ? "bg-accent text-background" : "bg-surface text-foreground/70 hover:text-accent"}`}
          >{t.label}</button>
        ))}
      </div>

      {tab === "users" && <UsersTab users={users} grades={grades} specs={specs} api={api} load={load} />}
      {tab === "recruitment" && <RecruitmentTab recruitments={recruitments} load={load} />}
      {tab === "grades" && <GradesTab grades={grades} api={api} />}
      {tab === "channels" && <ChannelsTab channels={channels} users={users} grades={grades} specs={specs} api={api} load={load} />}
      {tab === "missions" && <MissionsTab missions={missions} api={api} />}
      {tab === "lore" && <ContentTab sections={loreSections} endpoint="/api/clan/${slug}/admin/lore" label="Lore" api={api} />}
      {tab === "rules" && <ContentTab sections={ruleSections} endpoint="/api/clan/${slug}/admin/rules" label="Règle" api={api} />}
      {tab === "specs" && <SpecsTab specs={specs} api={api} />}
      {tab === "dictionary" && <DictionaryTab entries={dictEntries} load={load} />}
      {tab === "pages" && <PagesTab pages={pages} api={api} />}
    </div>
  );
}

// ── Users ──
function UsersTab({ users, grades, specs, api, load }: { users: User[]; grades: Grade[]; specs: Spec[]; api: (e: string, m: string, b?: object) => Promise<void>; load: () => void }) {
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <div key={u.id} className="rounded-lg border border-accent-dim/20 bg-surface p-4">
          {editing?.id === u.id ? (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div><label className="mb-1 block text-xs text-foreground/50">Nom affiché</label><input value={editing.displayName} onChange={(e) => setEditing({ ...editing, displayName: e.target.value })} className={inp} /></div>
                <div><label className="mb-1 block text-xs text-foreground/50">Rôle</label><input value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} className={inp} /></div>
                <div><label className="mb-1 block text-xs text-foreground/50">Grade</label>
                  <select value={editing.grade} onChange={(e) => {
                    const g = grades.find(g => g.name === e.target.value);
                    const specPerm = specs.find(s => s.name === editing.specialization)?.defaultPermission || 0;
                    const gradePerm = g?.defaultPermission || 0;
                    setEditing({ ...editing, grade: e.target.value, permissionLevel: Math.max(gradePerm, specPerm) });
                  }} className={inp}>
                    <option value="">— Choisir un grade —</option>
                    {grades.map((g) => <option key={g.id} value={g.name}>{g.name} (perm {g.defaultPermission})</option>)}
                  </select>
                </div>
                <div><label className="mb-1 block text-xs text-foreground/50">Spécialisation</label>
                  <select value={editing.specialization} onChange={(e) => {
                    const sp = specs.find(s => s.name === e.target.value);
                    const gradePerm = grades.find(g => g.name === editing.grade)?.defaultPermission || 0;
                    const specPerm = sp?.defaultPermission || 0;
                    setEditing({ ...editing, specialization: e.target.value, permissionLevel: Math.max(gradePerm, specPerm) });
                  }} className={inp}>
                    <option value="">— Aucune —</option>
                    {specs.map(s => <option key={s.id} value={s.name}>{s.name} (perm {s.defaultPermission})</option>)}
                  </select>
                </div>
                <div><label className="mb-1 block text-xs text-foreground/50">Permission individuelle (0-10)</label><input type="number" value={editing.permissionLevel} onChange={(e) => setEditing({ ...editing, permissionLevel: parseInt(e.target.value) || 0 })} className={inp} min={0} max={10} /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={async () => { await api("/api/clan/${slug}/admin/users", "PUT", editing); setEditing(null); }} className={btnGreen}>Sauvegarder</button>
                <button onClick={() => setEditing(null)} className={btnSecondary}>Annuler</button>
              </div>
            </div>
          ) : deleting === u.id ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-400">Supprimer <strong>{u.displayName}</strong> ? Cette action est irréversible.</p>
              <div className="flex gap-2">
                <button onClick={async () => { await api("/api/clan/${slug}/admin/users", "DELETE", { id: u.id }); setDeleting(null); }} className={btnDanger}>Confirmer</button>
                <button onClick={() => setDeleting(null)} className={btnSecondary}>Annuler</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{u.displayName}</span>
                <span className="ml-2 text-sm text-foreground/50">@{u.username}</span>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-foreground/50">
                  <span className="rounded bg-accent/10 px-2 py-0.5 text-accent">{u.role}</span>
                  <span>{u.grade}</span>
                  {u.specialization && <span>• {u.specialization}</span>}
                  <span>• Perm: {u.permissionLevel}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { load(); setEditing(u); }} className={btnSecondary}>Modifier</button>
                <button onClick={() => setDeleting(u.id)} className={btnDanger}>Supprimer</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Recruitment ──
function RecruitmentTab({ recruitments, load }: { recruitments: Recruitment[]; load: () => void }) {
  async function handle(id: string, action: "approve" | "reject") {
    const res = await fetch("/api/clan/${slug}/admin/recruitment", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    const data = await res.json();
    if (action === "approve" && data.tempPassword) {
      // Will show in the UI via tempPassword field
    }
    load();
    // Show the result inline
    if (action === "approve" && data.username) {
      const el = document.getElementById(`recruit-result-${id}`);
      if (el) el.textContent = `✓ Compte créé — Login: ${data.username} — MDP: ${data.tempPassword}`;
    }
  }
  return (
    <div className="space-y-4">
      {recruitments.length === 0 && <p className="text-foreground/50">Aucune candidature en attente.</p>}
      {recruitments.map((r) => (
        <div key={r.id} className="rounded-lg border border-accent-dim/20 bg-surface p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-accent">{r.rpName}</h3>
              <p className="text-sm text-foreground/50">Discord: {r.discord} {r.specialization && `• Spé: ${r.specialization}`}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs ${r.status === "pending" ? "bg-yellow-900/30 text-yellow-400" : r.status === "approved" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
              {r.status === "pending" ? "En attente" : r.status === "approved" ? "Approuvée" : "Rejetée"}
            </span>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-foreground/70 sm:grid-cols-2">
            <div><span className="font-medium text-foreground/50">Expérience RP:</span><p className="mt-0.5">{r.experience}</p></div>
            <div><span className="font-medium text-foreground/50">Motivation:</span><p className="mt-0.5">{r.motivation}</p></div>
          </div>
          {r.tempPassword && <p className="mt-3 rounded bg-accent/10 px-3 py-2 text-sm text-accent">MDP temporaire: <strong className="select-all">{r.tempPassword}</strong></p>}
          <p id={`recruit-result-${r.id}`} className="mt-2 text-sm font-medium text-green-400"></p>
          {r.status === "pending" && (
            <div className="mt-3 flex gap-2">
              <button onClick={() => handle(r.id, "approve")} className={btnGreen}>Approuver</button>
              <button onClick={() => handle(r.id, "reject")} className={btnDanger}>Rejeter</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Grades ──
function GradesTab({ grades, api }: { grades: Grade[]; api: (e: string, m: string, b?: object) => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", defaultPermission: 1, order: 0 });
  const [deleting, setDeleting] = useState<string | null>(null);

  async function create() {
    if (!form.name) return;
    await api("/api/clan/${slug}/admin/grades", "POST", form);
    setForm({ name: "", defaultPermission: 1, order: 0 });
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      {showForm ? (
        <div className="rounded-lg border border-accent/30 bg-surface p-5 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">Nouveau grade</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="mb-1 block text-xs text-foreground/50">Nom</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} placeholder="Ex: Exécuteur" /></div>
            <div><label className="mb-1 block text-xs text-foreground/50">Permission par défaut</label>
              <select value={form.defaultPermission} onChange={(e) => setForm({ ...form, defaultPermission: parseInt(e.target.value) })} className={inp}>
                {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div><label className="mb-1 block text-xs text-foreground/50">Ordre</label><input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} className={inp} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={create} className={btnGreen}>Créer</button>
            <button onClick={() => setShowForm(false)} className={btnSecondary}>Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className={btnPrimary}>+ Nouveau grade</button>
      )}

      {grades.map((g) => (
        <div key={g.id} className="flex items-center justify-between rounded-lg border border-accent-dim/20 bg-surface p-4">
          {deleting === g.id ? (
            <div className="flex flex-1 items-center justify-between">
              <p className="text-sm text-red-400">Supprimer le grade <strong>{g.name}</strong> ?</p>
              <div className="flex gap-2">
                <button onClick={async () => { await api("/api/clan/${slug}/admin/grades", "DELETE", { id: g.id }); setDeleting(null); }} className={btnDanger}>Confirmer</button>
                <button onClick={() => setDeleting(null)} className={btnSecondary}>Annuler</button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <span className="font-semibold text-accent">{g.name}</span>
                <span className="ml-3 text-sm text-foreground/50">{g._count.users} utilisateur(s)</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-foreground/50">Ordre:</label>
                <input type="number" value={g.order} onChange={(e) => api("/api/clan/${slug}/admin/grades", "PUT", { id: g.id, order: parseInt(e.target.value) })} className={`w-16 ${inp}`} />
                <label className="text-xs text-foreground/50">Perm:</label>
                <select value={g.defaultPermission} onChange={(e) => api("/api/clan/${slug}/admin/grades", "PUT", { id: g.id, defaultPermission: parseInt(e.target.value) })} className={`w-16 ${inp}`}>
                  {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
                </select>
                <button onClick={() => setDeleting(g.id)} className={btnDanger}>Supprimer</button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Channels ──
function ChannelsTab({ channels, users, grades, specs, api, load }: {
  channels: Channel[]; users: User[]; grades: Grade[]; specs: Spec[];
  api: (e: string, m: string, b?: object) => Promise<void>; load: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", isPrivate: false });
  const [selMembers, setSelMembers] = useState<string[]>([]);
  const [selGrades, setSelGrades] = useState<string[]>([]);
  const [selSpecs, setSelSpecs] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [managing, setManaging] = useState<string | null>(null);
  const [addUserId, setAddUserId] = useState("");

  async function create() {
    if (!form.name) return;
    await api("/api/clan/${slug}/admin/channels", "POST", {
      ...form,
      memberIds: form.isPrivate ? selMembers : [],
      grades: form.isPrivate ? selGrades : [],
      specializations: form.isPrivate ? selSpecs : [],
    });
    setForm({ name: "", description: "", isPrivate: false });
    setSelMembers([]); setSelGrades([]); setSelSpecs([]);
    setShowForm(false);
  }

  function toggleArray<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
  }

  async function addMember(channelId: string) {
    if (!addUserId) return;
    await fetch("/api/clan/${slug}/admin/channels", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: channelId, action: "addMember", userId: addUserId }) });
    setAddUserId("");
    load();
  }

  async function removeMember(channelId: string, userId: string) {
    await fetch("/api/clan/${slug}/admin/channels", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: channelId, action: "removeMember", userId }) });
    load();
  }

  return (
    <div className="space-y-4">
      {showForm ? (
        <div className="rounded-sm border p-5 space-y-4" style={{ borderColor: "var(--gold-500)", background: "var(--beskar-800)" }}>
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-display)", color: "var(--gold-500)" }}>Nouveau canal</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs text-foreground/50">Nom</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inp} placeholder="général" /></div>
            <div><label className="mb-1 block text-xs text-foreground/50">Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inp} placeholder="Description du canal" /></div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--beskar-200)" }}>
            <input type="checkbox" checked={form.isPrivate} onChange={e => setForm({ ...form, isPrivate: e.target.checked })} className="accent-accent" />
            Canal privé
          </label>

          {form.isPrivate && (
            <div className="space-y-3 rounded-sm p-4" style={{ background: "var(--beskar-700)", border: "1px solid var(--beskar-600)" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-display)", color: "var(--gold-500)" }}>Accès au canal</p>

              {/* By grade */}
              <div>
                <p className="mb-1.5 text-xs" style={{ color: "var(--beskar-300)" }}>Par grade :</p>
                <div className="flex flex-wrap gap-1.5">
                  {grades.map(g => (
                    <button key={g.id} onClick={() => setSelGrades(toggleArray(selGrades, g.name))}
                      className="rounded-sm px-2.5 py-1 text-xs transition-colors"
                      style={{
                        background: selGrades.includes(g.name) ? "var(--gold-500)" : "var(--beskar-800)",
                        color: selGrades.includes(g.name) ? "#1a1408" : "var(--beskar-200)",
                        border: `1px solid ${selGrades.includes(g.name) ? "var(--gold-500)" : "var(--beskar-500)"}`,
                      }}>{g.name}</button>
                  ))}
                </div>
              </div>

              {/* By specialization */}
              <div>
                <p className="mb-1.5 text-xs" style={{ color: "var(--beskar-300)" }}>Par spécialisation :</p>
                <div className="flex flex-wrap gap-1.5">
                  {specs.map(s => (
                    <button key={s.id} onClick={() => setSelSpecs(toggleArray(selSpecs, s.name))}
                      className="rounded-sm px-2.5 py-1 text-xs transition-colors"
                      style={{
                        background: selSpecs.includes(s.name) ? (s.secret ? "#6b21a8" : "var(--gold-500)") : "var(--beskar-800)",
                        color: selSpecs.includes(s.name) ? "#fff" : "var(--beskar-200)",
                        border: `1px solid ${selSpecs.includes(s.name) ? (s.secret ? "#6b21a8" : "var(--gold-500)") : "var(--beskar-500)"}`,
                      }}>{s.name}</button>
                  ))}
                </div>
              </div>

              {/* Individual users */}
              <div>
                <p className="mb-1.5 text-xs" style={{ color: "var(--beskar-300)" }}>Membres individuels :</p>
                <div className="flex flex-wrap gap-1.5">
                  {users.map(u => (
                    <button key={u.id} onClick={() => setSelMembers(toggleArray(selMembers, u.id))}
                      className="rounded-sm px-2.5 py-1 text-xs transition-colors"
                      style={{
                        background: selMembers.includes(u.id) ? "var(--gold-500)" : "var(--beskar-800)",
                        color: selMembers.includes(u.id) ? "#1a1408" : "var(--beskar-200)",
                        border: `1px solid ${selMembers.includes(u.id) ? "var(--gold-500)" : "var(--beskar-500)"}`,
                      }}>{u.displayName}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={create} className={btnGreen}>Créer</button>
            <button onClick={() => setShowForm(false)} className={btnSecondary}>Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className={btnPrimary}>+ Nouveau canal</button>
      )}

      {channels.map(c => (
        <div key={c.id} className="rounded-sm p-4" style={{ background: "var(--beskar-800)", border: `1px solid ${c.isPrivate ? "rgba(201,168,76,0.3)" : "var(--beskar-600)"}` }}>
          {deleting === c.id ? (
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: "var(--red-400)" }}>Supprimer <strong>#{c.name}</strong> et tous ses messages ?</p>
              <div className="flex gap-2">
                <button onClick={async () => { await api("/api/clan/${slug}/admin/channels", "DELETE", { id: c.id }); setDeleting(null); }} className={btnDanger}>Confirmer</button>
                <button onClick={() => setDeleting(null)} className={btnSecondary}>Annuler</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--beskar-100)" }}>
                    <span style={{ color: "var(--beskar-400)" }}># </span>{c.name}
                    {c.isPrivate && <span className="ml-2 rounded-sm px-1.5 py-0.5 text-xs" style={{ background: "rgba(201,168,76,0.15)", color: "var(--gold-500)", border: "1px solid rgba(201,168,76,0.3)" }}>privé</span>}
                  </h3>
                  <p className="text-sm" style={{ color: "var(--beskar-400)" }}>{c.description} — {c.members.length} membres — {c._count.messages} msg</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setManaging(managing === c.id ? null : c.id)} className={btnSecondary}>{managing === c.id ? "Fermer" : "Gérer"}</button>
                  <button onClick={() => setDeleting(c.id)} className={btnDanger}>Supprimer</button>
                </div>
              </div>

              {/* Member list always visible */}
              {c.members.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.members.map(m => (
                    <span key={m.user.id} className="flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs"
                      style={{ background: m.muted ? "rgba(197,57,47,0.15)" : "var(--beskar-700)", color: m.muted ? "var(--red-400)" : "var(--beskar-200)", border: "1px solid var(--beskar-600)" }}>
                      {m.user.displayName}
                      {m.muted && <span>🔇</span>}
                    </span>
                  ))}
                </div>
              )}

              {/* Manage panel */}
              {managing === c.id && (
                <div className="mt-3 rounded-sm p-3 space-y-2" style={{ background: "var(--beskar-700)", border: "1px solid var(--beskar-600)" }}>
                  {/* Add member */}
                  <div className="flex items-center gap-2">
                    <select value={addUserId} onChange={e => setAddUserId(e.target.value)} className={`flex-1 ${inp}`}>
                      <option value="">Ajouter un membre...</option>
                      {users.filter(u => !c.members.some(m => m.user.id === u.id)).map(u => (
                        <option key={u.id} value={u.id}>{u.displayName} ({u.grade})</option>
                      ))}
                    </select>
                    {addUserId && <button onClick={() => addMember(c.id)} className={btnGreen}>Ajouter</button>}
                  </div>

                  {/* Members with remove */}
                  {c.members.map(m => (
                    <div key={m.user.id} className="flex items-center justify-between py-1">
                      <span className="text-sm" style={{ color: "var(--beskar-200)" }}>{m.user.displayName} <span className="text-xs" style={{ color: "var(--beskar-400)" }}>— {m.user.grade} / {m.user.specialization || "—"}</span></span>
                      <button onClick={() => removeMember(c.id, m.user.id)} className="text-xs hover:underline" style={{ color: "var(--red-400)" }}>Retirer</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Missions ──
function MissionsTab({ missions, api }: { missions: Mission[]; api: (e: string, m: string, b?: object) => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", confidentiality: "standard", maxParticipants: 0 });
  const [deleting, setDeleting] = useState<string | null>(null);

  async function create() {
    if (!form.title) return;
    await api("/api/clan/${slug}/admin/missions", "POST", form);
    setForm({ title: "", description: "", confidentiality: "standard", maxParticipants: 0 });
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      {showForm ? (
        <div className="rounded-lg border border-accent/30 bg-surface p-5 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">Nouvelle mission</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs text-foreground/50">Titre</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inp} placeholder="Nom de la mission" /></div>
            <div><label className="mb-1 block text-xs text-foreground/50">Confidentialité</label>
              <select value={form.confidentiality} onChange={(e) => setForm({ ...form, confidentiality: e.target.value })} className={inp}>
                <option value="standard">Standard</option>
                <option value="secret">Secret</option>
                <option value="top_secret">Top Secret</option>
              </select>
            </div>
            <div><label className="mb-1 block text-xs text-foreground/50">Max participants (0 = illimité)</label>
              <input type="number" value={form.maxParticipants} onChange={(e) => setForm({ ...form, maxParticipants: parseInt(e.target.value) || 0 })} className={inp} min={0} />
            </div>
          </div>
          <div><label className="mb-1 block text-xs text-foreground/50">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={`resize-none ${inp}`} placeholder="Détails de la mission..." />
          </div>
          <div className="flex gap-2">
            <button onClick={create} className={btnGreen}>Créer</button>
            <button onClick={() => setShowForm(false)} className={btnSecondary}>Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className={btnPrimary}>+ Nouvelle mission</button>
      )}

      {missions.map((m) => (
        <div key={m.id} className="rounded-lg border border-accent-dim/20 bg-surface p-4">
          {deleting === m.id ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-400">Supprimer la mission <strong>{m.title}</strong> ?</p>
              <div className="flex gap-2">
                <button onClick={async () => { await api("/api/clan/${slug}/admin/missions", "DELETE", { id: m.id }); setDeleting(null); }} className={btnDanger}>Confirmer</button>
                <button onClick={() => setDeleting(null)} className={btnSecondary}>Annuler</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{m.title} <span className="ml-1 text-xs text-foreground/40">({m.confidentiality}) {m.maxParticipants > 0 && `• Max: ${m.maxParticipants}`}</span></h3>
                  <p className="text-sm text-foreground/50">{m.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={m.status} onChange={(e) => api("/api/clan/${slug}/admin/missions", "PUT", { id: m.id, status: e.target.value })} className={`${inp} w-auto`}>
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button onClick={() => setDeleting(m.id)} className={btnDanger}>Supprimer</button>
                </div>
              </div>
              {m.members.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.members.map((p) => <span key={p.user.id} className="rounded-full bg-surface-light px-2 py-0.5 text-xs">{p.user.displayName}</span>)}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Content (Lore / Rules) ──
function ContentTab({ sections, endpoint, label, api }: { sections: ContentSection[]; endpoint: string; label: string; api: (e: string, m: string, b?: object) => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ order: sections.length + 1, title: "", description: "" });
  const [editing, setEditing] = useState<ContentSection | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function create() {
    if (!form.title) return;
    await api(endpoint, "POST", form);
    setForm({ order: sections.length + 2, title: "", description: "" });
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      {showForm ? (
        <div className="rounded-lg border border-accent/30 bg-surface p-5 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">Nouvelle section {label}</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <div><label className="mb-1 block text-xs text-foreground/50">Ordre</label><input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} className={inp} /></div>
            <div className="sm:col-span-3"><label className="mb-1 block text-xs text-foreground/50">Titre</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inp} placeholder={`Titre de la section ${label}`} /></div>
          </div>
          <div><label className="mb-1 block text-xs text-foreground/50">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} className={`resize-none ${inp}`} placeholder="Contenu de la section..." />
          </div>
          <div className="flex gap-2">
            <button onClick={create} className={btnGreen}>Créer</button>
            <button onClick={() => setShowForm(false)} className={btnSecondary}>Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className={btnPrimary}>+ Nouvelle section {label}</button>
      )}

      {sections.map((s) => (
        <div key={s.id} className="rounded-lg border border-accent-dim/20 bg-surface p-4">
          {editing?.id === s.id ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <div><label className="mb-1 block text-xs text-foreground/50">Ordre</label><input type="number" value={editing.order} onChange={(e) => setEditing({ ...editing, order: parseInt(e.target.value) || 0 })} className={inp} /></div>
                <div className="sm:col-span-3"><label className="mb-1 block text-xs text-foreground/50">Titre</label><input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={inp} /></div>
              </div>
              <div><label className="mb-1 block text-xs text-foreground/50">Description</label>
                <textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={5} className={`resize-none ${inp}`} />
              </div>
              <div className="flex gap-2">
                <button onClick={async () => { await api(endpoint, "PUT", editing); setEditing(null); }} className={btnGreen}>Sauvegarder</button>
                <button onClick={() => setEditing(null)} className={btnSecondary}>Annuler</button>
              </div>
            </div>
          ) : deleting === s.id ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-400">Supprimer la section <strong>{s.title}</strong> ?</p>
              <div className="flex gap-2">
                <button onClick={async () => { await api(endpoint, "DELETE", { id: s.id }); setDeleting(null); }} className={btnDanger}>Confirmer</button>
                <button onClick={() => setDeleting(null)} className={btnSecondary}>Annuler</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">{s.order}</span>
                <span className="font-semibold">{s.title}</span>
                <p className="mt-1 text-sm text-foreground/60 line-clamp-2">{s.description}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setEditing(s)} className={btnSecondary}>Modifier</button>
                <button onClick={() => setDeleting(s.id)} className={btnDanger}>Supprimer</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Pages ──
function PagesTab({ pages, api }: { pages: PagePerm[]; api: (e: string, m: string, b?: object) => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ path: "", label: "", minPermission: 0 });
  const [deleting, setDeleting] = useState<string | null>(null);

  async function create() {
    if (!form.path || !form.label) return;
    await api("/api/clan/${slug}/admin/pages", "POST", form);
    setForm({ path: "", label: "", minPermission: 0 });
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      {showForm ? (
        <div className="rounded-lg border border-accent/30 bg-surface p-5 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">Nouvelle permission de page</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="mb-1 block text-xs text-foreground/50">Chemin</label><input value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} className={inp} placeholder="/ma-page" /></div>
            <div><label className="mb-1 block text-xs text-foreground/50">Label</label><input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inp} placeholder="Ma page" /></div>
            <div><label className="mb-1 block text-xs text-foreground/50">Permission min</label>
              <select value={form.minPermission} onChange={(e) => setForm({ ...form, minPermission: parseInt(e.target.value) })} className={inp}>
                {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}{i === 0 ? " (visiteur)" : ""}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={create} className={btnGreen}>Créer</button>
            <button onClick={() => setShowForm(false)} className={btnSecondary}>Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className={btnPrimary}>+ Nouvelle page</button>
      )}

      {pages.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-lg border border-accent-dim/20 bg-surface p-4">
          {deleting === p.id ? (
            <div className="flex flex-1 items-center justify-between">
              <p className="text-sm text-red-400">Supprimer la permission pour <strong>{p.path}</strong> ?</p>
              <div className="flex gap-2">
                <button onClick={async () => { await api("/api/clan/${slug}/admin/pages", "DELETE", { id: p.id }); setDeleting(null); }} className={btnDanger}>Confirmer</button>
                <button onClick={() => setDeleting(null)} className={btnSecondary}>Annuler</button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <span className="font-mono text-accent">{p.path}</span>
                <span className="ml-2 text-foreground/50">{p.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground/50">Perm:</span>
                <select value={p.minPermission} onChange={(e) => api("/api/clan/${slug}/admin/pages", "PUT", { id: p.id, minPermission: parseInt(e.target.value) })} className={`w-20 ${inp}`}>
                  {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}{i === 0 ? " (public)" : ""}</option>)}
                </select>
                <button onClick={() => setDeleting(p.id)} className={btnDanger}>Supprimer</button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Dictionary ──
function DictionaryTab({ entries, load }: { entries: DictEntry[]; load: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ french: "", mandoa: "" });
  const [editing, setEditing] = useState<DictEntry | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ existing: DictEntry; newMandoa: string } | null>(null);
  const [search, setSearch] = useState("");

  const filtered = search
    ? entries.filter(e => e.french.includes(search.toLowerCase()) || e.mandoa.toLowerCase().includes(search.toLowerCase()))
    : entries;

  async function create() {
    if (!form.french.trim() || !form.mandoa.trim()) return;
    const res = await fetch("/api/clan/${slug}/admin/dictionary", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ french: form.french, mandoa: form.mandoa }),
    });
    if (res.status === 409) {
      const data = await res.json();
      setConflict({ existing: data.existing, newMandoa: form.mandoa.trim() });
      return;
    }
    setForm({ french: "", mandoa: "" });
    setShowForm(false);
    load();
  }

  async function forceReplace() {
    if (!conflict) return;
    await fetch("/api/clan/${slug}/admin/dictionary", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ french: conflict.existing.french, mandoa: conflict.newMandoa, force: true }),
    });
    setConflict(null);
    setForm({ french: "", mandoa: "" });
    setShowForm(false);
    load();
  }

  async function saveEdit() {
    if (!editing) return;
    await fetch("/api/clan/${slug}/admin/dictionary", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, french: editing.french, mandoa: editing.mandoa }),
    });
    setEditing(null);
    load();
  }

  async function deleteEntry(id: string) {
    await fetch("/api/clan/${slug}/admin/dictionary", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    load();
  }

  return (
    <div className="space-y-4">
      {conflict && (
        <div className="rounded-lg border-2 border-yellow-600/50 bg-yellow-900/20 p-5 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-yellow-400">Conflit détecté</h3>
          <p className="text-sm text-foreground/80">
            Le mot <strong className="text-accent">&quot;{conflict.existing.french}&quot;</strong> existe déjà avec la traduction <strong className="text-accent">&quot;{conflict.existing.mandoa}&quot;</strong>.
          </p>
          <p className="text-sm text-foreground/60">
            Voulez-vous le remplacer par <strong className="text-yellow-300">&quot;{conflict.newMandoa}&quot;</strong> ?
          </p>
          <div className="flex gap-2">
            <button onClick={forceReplace} className="rounded bg-yellow-700 px-4 py-1.5 text-sm text-white hover:bg-yellow-600">Remplacer</button>
            <button onClick={() => setConflict(null)} className={btnSecondary}>Annuler</button>
          </div>
        </div>
      )}

      {showForm ? (
        <div className="rounded-lg border border-accent/30 bg-surface p-5 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">Ajouter un mot</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-foreground/50">Français</label>
              <input value={form.french} onChange={(e) => setForm({ ...form, french: e.target.value })} className={inp} placeholder="Ex: courage" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground/50">Mando&apos;a</label>
              <input value={form.mandoa} onChange={(e) => setForm({ ...form, mandoa: e.target.value })} className={inp} placeholder="Ex: mirshko"
                onKeyDown={(e) => { if (e.key === "Enter") create(); }} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={create} className={btnGreen}>Ajouter</button>
            <button onClick={() => { setShowForm(false); setConflict(null); }} className={btnSecondary}>Annuler</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button onClick={() => setShowForm(true)} className={btnPrimary}>+ Ajouter un mot</button>
          <span className="text-sm text-foreground/40">{entries.length} mot(s) personnalisé(s)</span>
        </div>
      )}

      {entries.length > 0 && (
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un mot..." className={`${inp} max-w-sm`} />
      )}

      {filtered.length === 0 && entries.length > 0 && search && (
        <p className="text-sm text-foreground/40">Aucun résultat pour &quot;{search}&quot;</p>
      )}

      <div className="space-y-2">
        {filtered.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-lg border border-accent-dim/20 bg-surface px-4 py-3">
            {editing?.id === e.id ? (
              <div className="flex flex-1 items-center gap-2">
                <input value={editing.french} onChange={(ev) => setEditing({ ...editing, french: ev.target.value })} className={`flex-1 ${inp}`} />
                <span className="text-foreground/30">→</span>
                <input value={editing.mandoa} onChange={(ev) => setEditing({ ...editing, mandoa: ev.target.value })} className={`flex-1 ${inp}`}
                  onKeyDown={(ev) => { if (ev.key === "Enter") saveEdit(); }} />
                <button onClick={saveEdit} className={btnGreen}>OK</button>
                <button onClick={() => setEditing(null)} className={btnSecondary}>Annuler</button>
              </div>
            ) : deleting === e.id ? (
              <div className="flex flex-1 items-center justify-between">
                <p className="text-sm text-red-400">Supprimer <strong>{e.french}</strong> → <strong>{e.mandoa}</strong> ?</p>
                <div className="flex gap-2">
                  <button onClick={() => deleteEntry(e.id)} className={btnDanger}>Confirmer</button>
                  <button onClick={() => setDeleting(null)} className={btnSecondary}>Annuler</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{e.french}</span>
                  <span className="text-foreground/30">→</span>
                  <span className="font-medium text-accent">{e.mandoa}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(e)} className={btnSecondary}>Modifier</button>
                  <button onClick={() => setDeleting(e.id)} className={btnDanger}>Supprimer</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Specializations ──
function SpecsTab({ specs, api }: { specs: Spec[]; api: (e: string, m: string, b?: object) => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", defaultPermission: 1, secret: false, order: 0 });
  const [editing, setEditing] = useState<Spec | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function create() {
    if (!form.name) return;
    await api("/api/clan/${slug}/admin/specializations", "POST", form);
    setForm({ name: "", description: "", defaultPermission: 1, secret: false, order: 0 });
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      {showForm ? (
        <div className="rounded-sm border bg-surface p-5 space-y-3" style={{ borderColor: "var(--gold-500)" }}>
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-display)", color: "var(--gold-500)" }}>Nouvelle spécialisation</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs text-foreground/50">Nom</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inp} /></div>
            <div><label className="mb-1 block text-xs text-foreground/50">Permission par défaut</label>
              <select value={form.defaultPermission} onChange={e => setForm({ ...form, defaultPermission: parseInt(e.target.value) })} className={inp}>
                {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div><label className="mb-1 block text-xs text-foreground/50">Ordre</label><input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} className={inp} /></div>
            <div className="flex items-end"><label className="flex items-center gap-2 text-sm text-foreground/60 cursor-pointer pb-2">
              <input type="checkbox" checked={form.secret} onChange={e => setForm({ ...form, secret: e.target.checked })} className="accent-purple-500" /> Spé secrète
            </label></div>
          </div>
          <div><label className="mb-1 block text-xs text-foreground/50">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className={`resize-none ${inp}`} placeholder="Description visible sur le site (sauf si secrète)" />
          </div>
          <div className="flex gap-2">
            <button onClick={create} className={btnGreen}>Créer</button>
            <button onClick={() => setShowForm(false)} className={btnSecondary}>Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className={btnPrimary}>+ Nouvelle spécialisation</button>
      )}

      {specs.map(s => (
        <div key={s.id} className="rounded-sm border p-4" style={{ borderColor: s.secret ? "rgba(162,89,224,0.3)" : "var(--beskar-600)", background: "var(--beskar-800)" }}>
          {editing?.id === s.id ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div><label className="mb-1 block text-xs text-foreground/50">Nom</label><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className={inp} /></div>
                <div><label className="mb-1 block text-xs text-foreground/50">Perm</label>
                  <select value={editing.defaultPermission} onChange={e => setEditing({ ...editing, defaultPermission: parseInt(e.target.value) })} className={inp}>
                    {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-foreground/60 cursor-pointer pb-2">
                    <input type="checkbox" checked={editing.secret} onChange={e => setEditing({ ...editing, secret: e.target.checked })} className="accent-purple-500" /> Secrète
                  </label>
                  <input type="number" value={editing.order} onChange={e => setEditing({ ...editing, order: parseInt(e.target.value) || 0 })} className={`w-16 ${inp}`} title="Ordre" />
                </div>
              </div>
              <textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={3} className={`resize-none w-full ${inp}`} />
              <div className="flex gap-2">
                <button onClick={async () => { await api("/api/clan/${slug}/admin/specializations", "PUT", editing); setEditing(null); }} className={btnGreen}>Sauvegarder</button>
                <button onClick={() => setEditing(null)} className={btnSecondary}>Annuler</button>
              </div>
            </div>
          ) : deleting === s.id ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-400">Supprimer <strong>{s.name}</strong> ?</p>
              <div className="flex gap-2">
                <button onClick={async () => { await api("/api/clan/${slug}/admin/specializations", "DELETE", { id: s.id }); setDeleting(null); }} className={btnDanger}>Confirmer</button>
                <button onClick={() => setDeleting(null)} className={btnSecondary}>Annuler</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ fontFamily: "var(--font-display)", color: s.secret ? "#a259e0" : "var(--gold-500)" }}>{s.name}</span>
                  {s.secret && <span className="rounded-full bg-purple-900/30 px-2 py-0.5 text-xs text-purple-400">Secrète</span>}
                  <span className="text-xs" style={{ color: "var(--beskar-400)" }}>Perm: {s.defaultPermission} • {s._count.users} membre(s)</span>
                </div>
                {s.description && <p className="mt-1 text-sm line-clamp-2" style={{ color: "var(--beskar-200)" }}>{s.description}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setEditing(s)} className={btnSecondary}>Modifier</button>
                <button onClick={() => setDeleting(s.id)} className={btnDanger}>Supprimer</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
