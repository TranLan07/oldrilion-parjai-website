"use client";

import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

type User = { id: string; username: string; displayName: string; role: string; grade: string; specialization: string; permissionLevel: number };
type Recruitment = { id: string; rpName: string; discord: string; experience: string; motivation: string; specialization: string; status: string; tempPassword?: string; customAnswers?: string };
type ChannelMemberAdmin = { muted: boolean; user: { id: string; displayName: string; grade: string; specialization: string } };
type Channel = { id: string; name: string; description: string; isPrivate: boolean; members: ChannelMemberAdmin[]; _count: { messages: number } };
type Mission = { id: string; title: string; description: string; status: string; confidentiality: string; maxParticipants: number; visibility: string; members: { user: { id: string; displayName: string } }[] };
type PagePerm = { id: string; path: string; label: string; minPermission: number };
type ContentSection = { id: string; order: number; title: string; description: string };
type Grade = { id: string; name: string; defaultPermission: number; order: number; _count: { users: number } };
type Spec = { id: string; name: string; description: string; defaultPermission: number; secret: boolean; color: string | null; order: number; _count: { users: number } };

type Tab = "users" | "recruitment" | "channels" | "missions" | "evenements" | "pages" | "lore" | "rules" | "grades" | "specs" | "tags" | "whitelist" | "theme" | "settings";

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
  const hubRole = (session as unknown as Record<string, unknown>)?.hubRole as string | undefined;
  // Les admins hub ont accès à l'admin de TOUS les clans, quel que soit leur niveau.
  const canAdmin = perm >= 10 || hubRole === "admin";
  const [tab, setTab] = useState<Tab>("users");
  const [clanPremium, setClanPremium] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [pages, setPages] = useState<PagePerm[]>([]);
  const [loreSections, setLoreSections] = useState<ContentSection[]>([]);
  const [ruleSections, setRuleSections] = useState<ContentSection[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);

  const apiMap: Record<Tab, string> = {
    users: `/api/clan/${slug}/admin/users`, recruitment: `/api/clan/${slug}/admin/recruitment`, channels: `/api/clan/${slug}/admin/channels`,
    missions: `/api/clan/${slug}/admin/missions`, evenements: `/api/clan/${slug}/admin/evenements`, pages: `/api/clan/${slug}/admin/pages`,
    lore: `/api/clan/${slug}/admin/lore`, rules: `/api/clan/${slug}/admin/rules`, grades: `/api/clan/${slug}/admin/grades`, specs: `/api/clan/${slug}/admin/specializations`, tags: `/api/clan/${slug}/admin/tags`,
    whitelist: `/api/clan/${slug}/admin/whitelist`, theme: `/api/clan/${slug}/admin/settings`, settings: `/api/clan/${slug}/admin/settings`,
  };

  const load = useCallback(async () => {
    const res = await fetch(apiMap[tab]);
    if (!res.ok) return;
    const data = await res.json();
    const m: Record<Tab, (d: unknown) => void> = {
      users: (d) => setUsers(d as User[]), recruitment: (d) => setRecruitments(d as Recruitment[]),
      channels: (d) => setChannels(d as Channel[]), missions: (d) => setMissions(d as Mission[]), evenements: () => {},
      whitelist: () => {}, theme: () => {}, settings: () => {},
      pages: (d) => setPages(d as PagePerm[]), lore: (d) => setLoreSections(d as ContentSection[]),
      rules: (d) => setRuleSections(d as ContentSection[]), grades: (d) => setGrades(d as Grade[]),
      specs: (d) => setSpecs(d as Spec[]),
      tags: () => {},
    };
    m[tab]?.(data);
    if (tab === "users" || tab === "channels") {
      const [gr, sp, us] = await Promise.all([
        fetch(`/api/clan/${slug}/admin/grades`),
        fetch(`/api/clan/${slug}/admin/specializations`),
        tab === "channels" ? fetch(`/api/clan/${slug}/admin/users`) : Promise.resolve(null),
      ]);
      if (gr.ok) setGrades(await gr.json());
      if (sp.ok) setSpecs(await sp.json());
      if (us?.ok) setUsers(await us.json());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => { if (canAdmin) load(); }, [canAdmin, load]);

  useEffect(() => {
    if (canAdmin && slug) {
      fetch(`/api/clan/${slug}/admin/settings`).then(r => r.ok ? r.json() : null).then(d => { if (d) setClanPremium(d.premium); });
    }
  }, [canAdmin, slug]);

  if (!session || !canAdmin) {
    return <div className="p-12 text-center text-foreground/50">Accès réservé aux administrateurs (niveau 10)</div>;
  }

  async function api(endpoint: string, method: string, body?: object) {
    const url = endpoint.replace("${slug}", slug);
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    load();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "users", label: "Utilisateurs" }, { key: "recruitment", label: "Recrutement" },
    { key: "grades", label: "Grades" }, { key: "channels", label: "Canaux" },
    { key: "missions", label: "Missions" }, { key: "evenements", label: "Evenements" }, { key: "lore", label: "Lore" },
    { key: "rules", label: "Règles" }, { key: "specs", label: "Spécialisations" },
    { key: "pages", label: "Permissions" }, { key: "tags", label: "Tags" },
    { key: "whitelist", label: "Whitelist" }, { key: "theme", label: "Theme" }, { key: "settings", label: "Parametres" },
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
      {tab === "recruitment" && <RecruitmentTab recruitments={recruitments} slug={slug} premium={clanPremium} load={load} />}
      {tab === "grades" && <GradesTab grades={grades} api={api} />}
      {tab === "channels" && <ChannelsTab channels={channels} users={users} grades={grades} specs={specs} slug={slug} premium={clanPremium} api={api} load={load} />}
      {tab === "missions" && <MissionsTab missions={missions} premium={clanPremium} api={api} />}
      {tab === "evenements" && <EvenementsTab slug={slug} />}
      {tab === "whitelist" && <WhitelistTab slug={slug} />}
      {tab === "theme" && <ThemeTab slug={slug} premium={clanPremium} />}
      {tab === "settings" && <SettingsTab slug={slug} />}
      {tab === "lore" && <ContentTab sections={loreSections} endpoint={`/api/clan/${slug}/admin/lore`} label="Lore" api={api} />}
      {tab === "rules" && <ContentTab sections={ruleSections} endpoint={`/api/clan/${slug}/admin/rules`} label="Règle" api={api} />}
      {tab === "specs" && <SpecsTab specs={specs} premium={clanPremium} api={api} />}
      {tab === "pages" && <PagesTab pages={pages} api={api} />}
      {tab === "tags" && <TagsTab slug={slug} />}
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
function RecruitmentTab({ recruitments, slug, premium, load }: { recruitments: Recruitment[]; slug: string; premium: boolean; load: () => void }) {
  async function handle(id: string, action: "approve" | "reject") {
    const res = await fetch(`/api/clan/${slug}/admin/recruitment`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    const data = await res.json();
    load();
    if (action === "approve" && data.username) {
      const el = document.getElementById(`recruit-result-${id}`);
      if (el) el.textContent = `✓ Compte créé — Login: ${data.username} — MDP: ${data.tempPassword}`;
    }
  }
  function parseAnswers(s?: string): Array<{ label: string; value: string }> {
    if (!s) return [];
    try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
  }
  return (
    <div className="space-y-6">
      <RecruitmentFieldsBuilder slug={slug} premium={premium} />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--gold-500)" }}>Candidatures</h3>
        {recruitments.length === 0 && <p className="text-foreground/50">Aucune candidature en attente.</p>}
        {recruitments.map((r) => {
          const answers = parseAnswers(r.customAnswers).filter(a => a.value);
          return (
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
                {answers.map((a, i) => (
                  <div key={i}><span className="font-medium text-foreground/50">{a.label}:</span><p className="mt-0.5">{a.value}</p></div>
                ))}
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
          );
        })}
      </div>
    </div>
  );
}

type RField = { label: string; type: string; options: string[]; required: boolean };
const FIELD_TYPES = [
  { v: "text", l: "Texte court" },
  { v: "textarea", l: "Texte long" },
  { v: "radio", l: "Choix unique (radio)" },
  { v: "checkbox", l: "Choix multiple (cases)" },
  { v: "specialization", l: "Spécialisation du clan" },
  { v: "grade", l: "Grade du clan" },
];

// Form builder des champs custom du recrutement (premium, max 10 champs).
function RecruitmentFieldsBuilder({ slug, premium }: { slug: string; premium: boolean }) {
  const [fields, setFields] = useState<RField[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/clan/${slug}/admin/recruitment-fields`).then(r => r.ok ? r.json() : null).then(d => {
      if (d) setFields((d.fields || []).map((f: RField) => ({ label: f.label, type: f.type, options: f.options || [], required: f.required })));
      setLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(i: number, patch: Partial<RField>) { setFields(fs => fs.map((f, j) => j === i ? { ...f, ...patch } : f)); }
  function addField() { if (fields.length < 10) setFields(fs => [...fs, { label: "", type: "text", options: [], required: false }]); }
  function removeField(i: number) { setFields(fs => fs.filter((_, j) => j !== i)); }
  function move(i: number, dir: -1 | 1) {
    setFields(fs => { const n = [...fs]; const j = i + dir; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j], n[i]]; return n; });
  }
  function setOption(i: number, oi: number, val: string) { update(i, { options: fields[i].options.map((o, k) => k === oi ? val : o) }); }
  function addOption(i: number) { if (fields[i].options.length < 5) update(i, { options: [...fields[i].options, ""] }); }
  function removeOption(i: number, oi: number) { update(i, { options: fields[i].options.filter((_, k) => k !== oi) }); }

  async function save() {
    setSaving(true); setMsg("");
    const r = await fetch(`/api/clan/${slug}/admin/recruitment-fields`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }),
    });
    const d = await r.json();
    setSaving(false);
    setMsg(r.ok ? "Formulaire enregistré." : (d.error || "Erreur"));
    setTimeout(() => setMsg(""), 3000);
  }

  if (!loaded) return null;

  return (
    <div className="rounded-lg border p-5 space-y-4" style={{ borderColor: "rgba(201,168,76,0.25)", background: "rgba(201,168,76,0.04)" }}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>★ Formulaire de recrutement</h3>
        <span className="text-xs" style={{ color: "var(--beskar-400)" }}>{fields.length}/10 champs</span>
      </div>

      {!premium ? (
        <p className="text-sm" style={{ color: "var(--beskar-400)" }}>
          L&apos;ajout de champs personnalisés (jusqu&apos;à 10 : texte, zone de texte, choix unique/multiple) est réservé aux clans premium.
          Les champs par défaut (Nom RP, Discord, Spécialisation, Expérience, Motivation) restent toujours actifs.
        </p>
      ) : (
        <>
          <p className="text-xs" style={{ color: "var(--beskar-400)" }}>
            Ces champs s&apos;ajoutent aux champs par défaut. Types : texte, zone de texte, choix unique/multiple (max 5 options).
          </p>
          {fields.map((f, i) => (
            <div key={i} className="rounded border p-3 space-y-2" style={{ borderColor: "var(--beskar-700)", background: "var(--beskar-900)" }}>
              <div className="flex flex-wrap items-center gap-2">
                <input value={f.label} onChange={e => update(i, { label: e.target.value })} placeholder="Intitulé du champ"
                  className={`flex-1 min-w-[160px] ${inp}`} />
                <select value={f.type} onChange={e => {
                  const t = e.target.value;
                  const needsOptions = t === "radio" || t === "checkbox";
                  update(i, { type: t, options: needsOptions ? (f.options.length === 0 ? [""] : f.options) : [] });
                }} className={inp} style={{ width: "auto" }}>
                  {FIELD_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
                <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--beskar-300)" }}>
                  <input type="checkbox" checked={f.required} onChange={e => update(i, { required: e.target.checked })} /> Requis
                </label>
                <button onClick={() => move(i, -1)} className="px-2 text-xs" style={{ color: "var(--beskar-400)" }} title="Monter">▲</button>
                <button onClick={() => move(i, 1)} className="px-2 text-xs" style={{ color: "var(--beskar-400)" }} title="Descendre">▼</button>
                <button onClick={() => removeField(i)} className="px-2 text-xs" style={{ color: "#ef4444" }} title="Supprimer">✕</button>
              </div>
              {(f.type === "radio" || f.type === "checkbox") && (
                <div className="space-y-1.5 pl-2">
                  <p className="text-xs" style={{ color: "var(--beskar-500)" }}>Options ({f.options.length}/5)</p>
                  {f.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input value={o} onChange={e => setOption(i, oi, e.target.value)} placeholder={`Option ${oi + 1}`} className={`flex-1 ${inp}`} />
                      <button onClick={() => removeOption(i, oi)} className="px-2 text-xs" style={{ color: "#ef4444" }}>✕</button>
                    </div>
                  ))}
                  {f.options.length < 5 && <button onClick={() => addOption(i)} className="text-xs" style={{ color: "#c9a84c" }}>+ Option</button>}
                </div>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            {fields.length < 10 && <button onClick={addField} className={btnSecondary}>+ Ajouter un champ</button>}
            <button onClick={save} disabled={saving} className={btnPrimary + " disabled:opacity-50"}>{saving ? "..." : "Enregistrer le formulaire"}</button>
            {msg && <span className="text-xs" style={{ color: msg.includes("enregistré") ? "#22c55e" : "#ef4444" }}>{msg}</span>}
          </div>
        </>
      )}
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
function ChannelsTab({ channels, users, grades, specs, slug, premium, api, load }: {
  channels: Channel[]; users: User[]; grades: Grade[]; specs: Spec[]; slug: string; premium: boolean;
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
    await fetch(`/api/clan/${slug}/admin/channels`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: channelId, action: "addMember", userId: addUserId }) });
    setAddUserId("");
    load();
  }

  async function removeMember(channelId: string, userId: string) {
    await fetch(`/api/clan/${slug}/admin/channels`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: channelId, action: "removeMember", userId }) });
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
        <>
          <button onClick={() => setShowForm(true)} className={btnPrimary}>+ Nouveau canal</button>
          {!premium && channels.length >= 1 && <p className="mt-2 text-xs" style={{ color: "#c9a84c" }}>★ Fonctionnalité premium : un seul canal disponible en version gratuite.</p>}
        </>
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
function MissionsTab({ missions, premium, api }: { missions: Mission[]; premium: boolean; api: (e: string, m: string, b?: object) => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", confidentiality: "standard", maxParticipants: 0, visibility: "internal" });
  const [deleting, setDeleting] = useState<string | null>(null);

  async function create() {
    if (!form.title) return;
    await api("/api/clan/${slug}/admin/missions", "POST", form);
    setForm({ title: "", description: "", confidentiality: "standard", maxParticipants: 0, visibility: "internal" });
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
          <label className="flex items-center gap-2 text-sm text-foreground/60 cursor-pointer">
            <input type="checkbox" checked={form.visibility === "global"} onChange={e => setForm({ ...form, visibility: e.target.checked ? "global" : "internal" })} disabled={!premium} />
            Publier sur le Hub inter-clans {!premium && <span style={{ color: "#c9a84c", fontSize: "11px" }}>★ Premium</span>}
          </label>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: m.visibility === "global" ? "var(--gold-500)" : "var(--clan-primary)" }}>
                    <input type="checkbox" checked={m.visibility === "global"} onChange={(e) => api("/api/clan/${slug}/admin/missions", "PUT", { id: m.id, visibility: e.target.checked ? "global" : "internal" })} />
                    Hub
                  </label>
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

// ── Specializations ──
function SpecsTab({ specs, premium, api }: { specs: Spec[]; premium: boolean; api: (e: string, m: string, b?: object) => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", defaultPermission: 1, secret: false, color: "#c9a84c", order: 0 });
  const [editing, setEditing] = useState<Spec | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function create() {
    if (!form.name) return;
    await api("/api/clan/${slug}/admin/specializations", "POST", { ...form, color: premium ? form.color : null });
    setForm({ name: "", description: "", defaultPermission: 1, secret: false, color: "#c9a84c", order: 0 });
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
              <input type="checkbox" checked={form.secret} onChange={e => setForm({ ...form, secret: e.target.checked })} disabled={!premium} className="accent-purple-500" /> Spé secrète {!premium && <span style={{ color: "#c9a84c" }}>★</span>}
            </label></div>
            <div>
              <label className="mb-1 block text-xs text-foreground/50">Couleur {!premium && <span style={{ color: "#c9a84c" }}>★ premium</span>}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} disabled={!premium} onChange={e => setForm({ ...form, color: e.target.value })}
                  className="h-9 w-14 cursor-pointer rounded border border-accent-dim/30 bg-background p-0.5 disabled:opacity-40" />
                <input value={form.color} disabled={!premium} onChange={e => setForm({ ...form, color: e.target.value })} className={`w-24 font-mono ${inp} disabled:opacity-40`} maxLength={7} />
              </div>
            </div>
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
              {premium && (
                <div>
                  <label className="mb-1 block text-xs text-foreground/50">Couleur</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editing.color ?? "#c9a84c"} onChange={e => setEditing({ ...editing, color: e.target.value })}
                      className="h-9 w-14 cursor-pointer rounded border border-accent-dim/30 bg-background p-0.5" />
                    <input value={editing.color ?? ""} onChange={e => setEditing({ ...editing, color: e.target.value })} className={`w-24 font-mono ${inp}`} placeholder="#c9a84c" maxLength={7} />
                  </div>
                </div>
              )}
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
                  {s.color && <span className="h-3 w-3 rounded-full shrink-0" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}80` }} />}
                  <span className="font-semibold" style={{ fontFamily: "var(--font-display)", color: s.color ?? (s.secret ? "#a259e0" : "var(--gold-500)") }}>{s.name}</span>
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

function TagsTab({ slug }: { slug: string }) {
  const [allTags, setAllTags] = useState<{ id: string; name: string }[]>([]);
  const [clanTags, setClanTags] = useState<{ id: string; name: string }[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/tags").then(r => r.json()).then(setAllTags).catch(() => {});
    fetch(`/api/clan/${slug}/admin/tags`).then(r => r.json()).then(setClanTags).catch(() => {});
  }, [slug]);

  const clanTagIds = new Set(clanTags.map(t => t.id));

  async function addTag(tagId: string) {
    const r = await fetch(`/api/clan/${slug}/admin/tags`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    const d = await r.json();
    if (!r.ok) { setMsg(d.error); return; }
    setMsg("");
    fetch(`/api/clan/${slug}/admin/tags`).then(r => r.json()).then(setClanTags);
  }

  async function removeTag(tagId: string) {
    await fetch(`/api/clan/${slug}/admin/tags`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    fetch(`/api/clan/${slug}/admin/tags`).then(r => r.json()).then(setClanTags);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-display)", color: "var(--gold-500)" }}>Tags du clan</h3>
        {clanTags.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--beskar-400)" }}>Aucun tag assigné.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {clanTags.map(tag => (
              <div key={tag.id} className="flex items-center gap-2 rounded-sm border px-3 py-1.5"
                style={{ borderColor: "var(--beskar-600)", background: "var(--beskar-800)" }}>
                <span className="text-sm" style={{ color: "var(--beskar-100)" }}>{tag.name}</span>
                <button onClick={() => removeTag(tag.id)} className="text-xs" style={{ color: "var(--beskar-400)" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      {msg && <p className="text-sm" style={{ color: "var(--red-600)" }}>{msg}</p>}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-display)", color: "var(--beskar-300)" }}>Tags disponibles</h3>
        <div className="flex flex-wrap gap-2">
          {allTags.filter(t => !clanTagIds.has(t.id)).map(tag => (
            <button key={tag.id} onClick={() => addTag(tag.id)}
              className="rounded-sm border px-3 py-1.5 text-sm transition-colors"
              style={{ borderColor: "var(--beskar-600)", color: "var(--beskar-300)", background: "transparent" }}
            >+ {tag.name}</button>
          ))}
          {allTags.filter(t => !clanTagIds.has(t.id)).length === 0 && (
            <p className="text-sm" style={{ color: "var(--beskar-500)" }}>Tous les tags sont déjà assignés, ou aucun tag n&apos;existe (créez-en depuis l&apos;Admin Hub).</p>
          )}
        </div>
      </div>
    </div>
  );
}

// -- EvenementsTab --
function EvenementsTab({ slug }: { slug: string }) {
  type AdminEvent = { id: string; title: string; status: string; visibility: string; hubStatus: string; _count: { members: number } };
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [form, setForm] = useState({ title: "", description: "", status: "a_venir", visibility: "internal", maxParticipants: "", startAt: "" });

  const loadEv = async () => {
    const r = await fetch(`/api/clan/${slug}/admin/evenements`);
    if (r.ok) setEvents(await r.json());
  };
  useEffect(() => { loadEv(); }, []);

  async function create() {
    if (!form.title.trim()) return;
    await fetch(`/api/clan/${slug}/admin/evenements`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null, startAt: form.startAt || null }),
    });
    setForm({ title: "", description: "", status: "a_venir", visibility: "internal", maxParticipants: "", startAt: "" });
    loadEv();
  }

  async function del(id: string) {
    await fetch(`/api/clan/${slug}/admin/evenements`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadEv();
  }

  const inp2 = "w-full rounded border border-accent-dim/30 bg-background px-3 py-2 text-sm text-foreground outline-none";

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Creer un evenement</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <input placeholder="Titre" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inp2} />
          <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inp2} />
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inp2}>
            <option value="a_venir">A venir</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Termine</option>
          </select>
          <select value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })} className={inp2}>
            <option value="internal">Interne (membres clan)</option>
            <option value="global">Global (tous les membres hub)</option>
            <option value="private">Prive (inscrits uniquement)</option>
          </select>
          <input placeholder="Max participants (vide = illimite)" type="number" value={form.maxParticipants} onChange={e => setForm({ ...form, maxParticipants: e.target.value })} className={inp2} />
          <input type="datetime-local" value={form.startAt} onChange={e => setForm({ ...form, startAt: e.target.value })} className={inp2} />
        </div>
        <button onClick={create} className={btnPrimary}>Creer</button>
      </div>
      <div className="space-y-2">
        {events.map(ev => (
          <div key={ev.id} className="flex items-center justify-between rounded border border-accent-dim/20 bg-surface p-3">
            <div>
              <p className="font-semibold text-sm text-foreground">{ev.title}</p>
              <p className="text-xs text-foreground/40">{ev.status} · {ev.visibility} · {ev._count.members} participants</p>
              {ev.hubStatus !== "none" && (
                <p className="text-xs" style={{ color: ev.hubStatus === "approved" ? "#22c55e" : "#c9a84c" }}>
                  Hub: {ev.hubStatus === "approved" ? "Approuvé ✓" : "En attente..."}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: ev.hubStatus !== "none" ? "#c9a84c" : "var(--clan-primary)" }}>
                <input type="checkbox" checked={ev.hubStatus !== "none"}
                  onChange={async (e) => {
                    await fetch(`/api/clan/${slug}/admin/evenements`, {
                      method: "PUT", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: ev.id, proposeHub: e.target.checked }),
                    });
                    loadEv();
                  }} />
                Hub
              </label>
              <button onClick={() => del(ev.id)} className={btnDanger}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- WhitelistTab --
function WhitelistTab({ slug }: { slug: string }) {
  type WLEntry = { id: string; accessLevel: number; user: { id: string; publicId: string; displayName: string; username: string; clan: { name: string; colorPrimary: string } | null } };
  const [list, setList] = useState<WLEntry[]>([]);
  const [publicId, setPublicId] = useState("");
  const [accessLevel, setAccessLevel] = useState("1");
  const [msg, setMsg] = useState("");

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3000); }
  const loadWl = async () => {
    const r = await fetch(`/api/clan/${slug}/admin/whitelist`);
    if (r.ok) setList(await r.json());
  };
  useEffect(() => { loadWl(); }, []);

  async function add() {
    if (!publicId.trim()) return;
    const r = await fetch(`/api/clan/${slug}/admin/whitelist`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId: publicId.trim().toUpperCase(), accessLevel: Number(accessLevel) }),
    });
    const d = await r.json();
    if (!r.ok) { flash(d.error); return; }
    setPublicId(""); loadWl(); flash("Utilisateur ajoute a la whitelist.");
  }

  async function remove(id: string) {
    await fetch(`/api/clan/${slug}/admin/whitelist`, {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    loadWl();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-foreground/50">La whitelist permet a des utilisateurs d&apos;autres clans d&apos;acceder a certaines pages selon le niveau defini.</p>
      {msg && <p className="text-sm" style={{ color: "var(--clan-primary, #c9a84c)" }}>{msg}</p>}
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Identifiant public</label>
          <input value={publicId} onChange={e => setPublicId(e.target.value.toUpperCase())} maxLength={6}
            className={inp + " w-28 font-mono"} placeholder="XXXXXX" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Niveau (1-9)</label>
          <input type="number" min={1} max={9} value={accessLevel} onChange={e => setAccessLevel(e.target.value)}
            className={inp + " w-20"} />
        </div>
        <button onClick={add} className={btnPrimary}>Ajouter</button>
      </div>
      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-foreground/40">Aucun utilisateur en whitelist.</p>}
        {list.map(e => (
          <div key={e.id} className="flex items-center justify-between rounded border border-accent-dim/20 bg-surface p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">{e.user.displayName}</span>
              <span className="font-mono text-xs text-foreground/40">{e.user.publicId}</span>
              {e.user.clan && <span className="text-xs" style={{ color: e.user.clan.colorPrimary }}>{e.user.clan.name}</span>}
              <span className="rounded px-1.5 py-0.5 text-xs bg-surface-light text-foreground/60">Niv. {e.accessLevel}</span>
            </div>
            <button onClick={() => remove(e.id)} className={btnDanger}>Retirer</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- ThemeTab --
function ThemeTab({ slug, premium }: { slug: string; premium: boolean }) {
  const [colors, setColors] = useState({ colorBg: "#000000", colorPrimary: "#c9a84c", colorAccent: "#c0392b", colorText: "#e8e6e3", colorCard: "#0d0d0d" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/clan/${slug}/admin/settings`).then(r => r.ok ? r.json() : null).then(d => {
      if (d) setColors({ colorBg: d.colorBg, colorPrimary: d.colorPrimary, colorAccent: d.colorAccent, colorText: d.colorText ?? "#e8e6e3", colorCard: d.colorCard ?? "#0d0d0d" });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    await fetch(`/api/clan/${slug}/admin/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(colors),
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  const baseFields = [
    { field: "colorBg" as const, label: "Fond du clan", hint: "Arrière-plan des pages" },
    { field: "colorPrimary" as const, label: "Primaire", hint: "Titres, accents, liens" },
    { field: "colorAccent" as const, label: "Accent", hint: "Dégradés, badges" },
  ];
  const premiumFields = [
    { field: "colorText" as const, label: "Texte", hint: "Couleur de texte custom" },
    { field: "colorCard" as const, label: "Surface", hint: "Fond du header, du footer et des cartes" },
  ];

  function Picker({ field, label, hint }: { field: keyof typeof colors; label: string; hint: string }) {
    return (
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/50">{label}</label>
        <p className="mb-2 text-[10px] text-foreground/30">{hint}</p>
        <div className="flex items-center gap-3">
          <input type="color" value={colors[field]} onChange={e => setColors(c => ({ ...c, [field]: e.target.value }))}
            className="h-10 w-16 cursor-pointer rounded border border-accent-dim/30 bg-background p-0.5" />
          <input value={colors[field]} onChange={e => setColors(c => ({ ...c, [field]: e.target.value }))}
            className={inp + " w-28 font-mono"} placeholder="#000000" maxLength={7} />
          <div className="h-8 w-8 rounded border border-accent-dim/30" style={{ background: colors[field] }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md">
      <p className="text-sm text-foreground/50">Personnalisez la direction artistique de votre espace clan.</p>
      <div className="space-y-5">
        {baseFields.map(f => <Picker key={f.field} {...f} />)}
      </div>

      <div className="rounded border border-accent-dim/20 p-4 space-y-5" style={{ background: "rgba(201,168,76,0.04)" }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#c9a84c" }}>★ Personnalisation premium</span>
        </div>
        {premium ? (
          premiumFields.map(f => <Picker key={f.field} {...f} />)
        ) : (
          <p className="text-xs text-foreground/40">Couleur de texte et de cartes personnalisées — réservé aux clans premium. Les couleurs des spécialisations se règlent dans l&apos;onglet Spécialisations.</p>
        )}
      </div>

      {/* Aperçu */}
      <div className="rounded border border-accent-dim/20 p-4" style={{ background: colors.colorBg }}>
        <p className="mb-2 text-xs uppercase tracking-wider" style={{ color: colors.colorPrimary, opacity: 0.6 }}>Aperçu</p>
        <div className="h-2 rounded mb-3" style={{ background: `linear-gradient(90deg, ${colors.colorAccent}, ${colors.colorPrimary})` }} />
        <p className="font-bold uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-display)", color: colors.colorPrimary }}>Nom du clan</p>
        <div className="rounded-sm p-3" style={{ background: premium ? colors.colorCard : "#0d0d0d", border: `1px solid ${colors.colorPrimary}30` }}>
          <p className="text-sm" style={{ color: premium ? colors.colorText : "#e8e6e3" }}>Exemple de texte dans une carte du clan.</p>
        </div>
      </div>

      <button onClick={save} disabled={saving} className={btnPrimary + " disabled:opacity-50"}>
        {saving ? "Sauvegarde..." : saved ? "Sauvegardé !" : "Appliquer"}
      </button>
    </div>
  );
}

// -- SettingsTab --
function SettingsTab({ slug }: { slug: string }) {
  const [form, setForm] = useState({ description: "", anonRevealLevel: 5 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/clan/${slug}/admin/settings`).then(r => r.ok ? r.json() : null).then(d => {
      if (d) setForm({ description: d.description ?? "", anonRevealLevel: d.anonRevealLevel ?? 5 });
    });
  }, []);

  async function save() {
    setSaving(true);
    await fetch(`/api/clan/${slug}/admin/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground/50">Description du clan</label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={4} className={inp + " resize-y"} placeholder="Decrivez votre clan..." />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground/50">
          Niveau minimum pour reveler un profil anonyme (1-10)
        </label>
        <p className="mb-2 text-xs text-foreground/40">
          Les membres avec ce niveau de permission peuvent voir le vrai nom des membres en mode anonyme.
        </p>
        <input type="number" min={1} max={10} value={form.anonRevealLevel} onChange={e => setForm(f => ({ ...f, anonRevealLevel: Number(e.target.value) }))}
          className={inp + " w-24"} />
      </div>
      <button onClick={save} disabled={saving} className={btnPrimary + " disabled:opacity-50"}>
        {saving ? "Sauvegarde..." : saved ? "Sauvegarde !" : "Enregistrer"}
      </button>
    </div>
  );
}
