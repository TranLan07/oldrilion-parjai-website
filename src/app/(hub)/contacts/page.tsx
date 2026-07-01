"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type ContactTarget = {
  id: string; publicId: string; displayName: string; username: string; anonymous: boolean;
  clan: { name: string; slug: string; colorPrimary: string } | null;
};
type Contact = { id: string; nickname: string; target: ContactTarget };

export default function ContactsPage() {
  const { data: session } = useSession();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [publicIdInput, setPublicIdInput] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNick, setEditNick] = useState("");
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  useEffect(() => {
    if (session?.user?.id) load();
  }, [session]);

  async function load() {
    const r = await fetch("/api/contacts");
    if (r.ok) setContacts(await r.json());
  }

  async function addContact() {
    if (!publicIdInput.trim()) return;
    const r = await fetch("/api/contacts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId: publicIdInput.trim(), nickname: nicknameInput.trim() }),
    });
    const d = await r.json();
    if (!r.ok) { flash(d.error); return; }
    setPublicIdInput(""); setNicknameInput("");
    load(); flash("Contact ajoute.");
  }

  async function saveNickname(id: string) {
    await fetch("/api/contacts", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, nickname: editNick }),
    });
    setEditId(null);
    load();
  }

  async function removeContact(id: string) {
    await fetch("/api/contacts", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  if (!session) return <div className="p-12 text-center text-sm" style={{ color: "#6b7280" }}>Connectez-vous pour acceder au carnet de contacts.</div>;

  const inputSt = { background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" };
  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return !q || c.target.displayName.toLowerCase().includes(q) || c.target.publicId.toLowerCase().includes(q) || c.nickname.toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Hub</p>
      <h1 className="mb-8 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>Carnet de contacts</h1>

      {msg && <div className="mb-6 rounded-sm border px-4 py-3 text-sm" style={{ borderColor: "#2a2a2a", background: "#111", color: "#9ca3af" }}>{msg}</div>}

      {/* Ajouter un contact */}
      <section className="mb-8 rounded-sm border p-6" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#4a4a4a" }}>Ajouter par identifiant public</h2>
        <div className="flex gap-2 flex-wrap">
          <input value={publicIdInput} onChange={e => setPublicIdInput(e.target.value.toUpperCase())}
            className="rounded-sm border px-3 py-2 text-sm font-mono outline-none w-32" style={inputSt}
            placeholder="XXXXXX" maxLength={6} />
          <input value={nicknameInput} onChange={e => setNicknameInput(e.target.value)}
            className="flex-1 rounded-sm border px-3 py-2 text-sm outline-none min-w-[160px]" style={inputSt}
            placeholder="Surnom (optionnel)"
            onKeyDown={e => { if (e.key === "Enter") addContact(); }} />
          <button onClick={addContact} className="rounded-sm px-4 py-2 text-sm font-semibold"
            style={{ background: "#f2f2f5", color: "#000" }}>Ajouter</button>
        </div>
      </section>

      {/* Recherche */}
      {contacts.length > 0 && (
        <div className="mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="rounded-sm border px-3 py-2 text-sm outline-none w-64" style={inputSt}
            placeholder="Rechercher..." />
        </div>
      )}

      {/* Liste */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: "#4a4a4a" }}>
          {contacts.length === 0 ? "Aucun contact. Ajoutez des membres via leur identifiant public." : "Aucun resultat."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const name = c.target.anonymous ? "Anonyme" : c.target.displayName;
            const display = c.nickname ? `${c.nickname} (${name})` : name;
            return (
              <div key={c.id} className="rounded-sm border p-4 flex items-center gap-4"
                style={{ borderColor: "#1a1a1a", background: "#0d0d0d" }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold flex-shrink-0"
                  style={{ background: "#1a1a1a", color: "#f2f2f5", border: "1px solid #2a2a2a" }}>
                  {name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "#f2f2f5" }}>{display}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs" style={{ color: "#4a4a4a" }}>{c.target.publicId}</span>
                    {c.target.clan && (
                      <span className="text-xs" style={{ color: c.target.clan.colorPrimary }}>{c.target.clan.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {editId === c.id ? (
                    <>
                      <input value={editNick} onChange={e => setEditNick(e.target.value)}
                        className="rounded-sm border px-2 py-1 text-xs outline-none w-28" style={inputSt}
                        onKeyDown={e => { if (e.key === "Enter") saveNickname(c.id); }} autoFocus />
                      <button onClick={() => saveNickname(c.id)} className="text-xs px-2 py-1 rounded-sm"
                        style={{ background: "#f2f2f5", color: "#000" }}>OK</button>
                      <button onClick={() => setEditId(null)} className="text-xs" style={{ color: "#4a4a4a" }}>Ann</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditId(c.id); setEditNick(c.nickname); }}
                        className="text-xs px-2 py-1 rounded-sm border" style={{ borderColor: "#2a2a2a", color: "#6b7280" }}>
                        {c.nickname ? "Surnom" : "Renommer"}
                      </button>
                      <button onClick={() => removeContact(c.id)}
                        className="text-xs px-2 py-1 rounded-sm" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                        Retirer
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
