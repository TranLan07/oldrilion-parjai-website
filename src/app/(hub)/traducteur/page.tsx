"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

type WordResult = { original: string; translated: string; found: boolean };
type TranslationResult = {
  input: string; output: string;
  direction: "fr-to-mandoa" | "mandoa-to-fr";
  words: WordResult[];
};

export default function TraducteurPage() {
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [direction, setDirection] = useState<"fr-to-mandoa" | "mandoa-to-fr">("fr-to-mandoa");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [access, setAccess] = useState<"loading" | "granted" | "denied">("loading");

  useEffect(() => {
    if (!session) { setAccess("loading"); return; }
    // Vérification via un appel léger à l'API
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "test", direction: "fr-to-mandoa" }),
    }).then(r => {
      if (r.status === 403) setAccess("denied");
      else setAccess("granted");
    }).catch(() => setAccess("denied"));
  }, [session]);

  if (!session) return (
    <div className="p-12 text-center text-sm" style={{ color: "#6b7280" }}>Connectez-vous pour acceder au traducteur.</div>
  );

  if (access === "loading") return (
    <div className="p-12 text-center text-sm" style={{ color: "#6b7280" }}>Verification...</div>
  );

  if (access === "denied") return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Acces restreint</p>
      <h1 className="mb-6 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>Traducteur Mando&apos;a</h1>
      <div className="rounded-sm border p-8" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
        <p className="text-2xl mb-4" style={{ color: "#c9a84c" }}>Ret&apos;lini</p>
        <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
          Le traducteur Mando&apos;a est reserve aux membres de la culture mandalorienne.
          Si vous faites partie d&apos;un clan ou si un administrateur vous a accorde le statut mandalorien,
          vous pourrez y acceder.
        </p>
        <p className="mt-4 text-xs" style={{ color: "#3a3a3a" }}>
          Contactez un administrateur du Hub si vous pensez que c&apos;est une erreur.
        </p>
      </div>
    </div>
  );

  async function handleTranslate() {
    if (!text.trim()) return;
    setLoading(true);
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, direction }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  function swap() {
    setDirection(d => d === "fr-to-mandoa" ? "mandoa-to-fr" : "fr-to-mandoa");
    if (result) { setText(result.output); setResult(null); }
  }

  const inputSt = { background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" };

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Link href="/profil" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors"
        style={{ color: "#4a4a4a" }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#9ca3af"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#4a4a4a"; }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Profil
      </Link>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Hub</p>
      <h1 className="mb-2 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>Traducteur Mando&apos;a</h1>
      <p className="mb-10 text-sm" style={{ color: "#6b7280" }}>
        Traduisez du français vers le Mando&apos;a et inversement. Basé sur le lexique officiel enrichi par les clans.
      </p>

      {/* Direction */}
      <div className="mb-6 flex items-center gap-4">
        <span className="text-sm font-semibold uppercase tracking-[0.1em]"
          style={{ color: direction === "fr-to-mandoa" ? "#f2f2f5" : "#4a4a4a" }}>Français</span>
        <button onClick={swap}
          className="rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all"
          style={{ borderColor: "#3a3a3a", color: "#9ca3af" }}>
          ⇄ Inverser
        </button>
        <span className="text-sm font-semibold uppercase tracking-[0.1em]"
          style={{ color: direction === "mandoa-to-fr" ? "#f2f2f5" : "#4a4a4a" }}>Mando&apos;a</span>
      </div>

      {/* Input */}
      <div className="mb-4">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTranslate(); } }}
          placeholder={direction === "fr-to-mandoa" ? "Entrez du texte en français..." : "Entrez du texte en Mando'a..."}
          rows={4}
          className="w-full resize-none rounded-sm border px-4 py-3 text-sm outline-none"
          style={inputSt}
        />
      </div>

      <button onClick={handleTranslate} disabled={loading || !text.trim()}
        className="mb-8 rounded-sm px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] transition-all disabled:opacity-50"
        style={{ background: "#f2f2f5", color: "#000" }}>
        {loading ? "Traduction..." : "Traduire"}
      </button>

      {/* Résultat */}
      {result && (
        <div className="space-y-6">
          <div className="rounded-sm border p-5" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
            <p className="mb-1 text-xs uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>Traduction</p>
            <p className="text-lg font-semibold" style={{ color: "#f2f2f5" }}>{result.output || "—"}</p>
            <button
              onClick={() => navigator.clipboard.writeText(result.output)}
              className="mt-2 text-xs" style={{ color: "#6b7280" }}>
              Copier
            </button>
          </div>

          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>Détail mot par mot</p>
            <div className="flex flex-wrap gap-2">
              {result.words.map((w, i) => (
                <div key={i} className="rounded-sm border px-3 py-2 text-xs"
                  style={{
                    borderColor: w.found ? "#2a2a2a" : "#1a1a1a",
                    background: w.found ? "#111" : "#0a0a0a",
                    color: w.found ? "#e5e7eb" : "#3a3a3a",
                  }}>
                  <span style={{ color: "#6b7280" }}>{w.original}</span>
                  {" → "}
                  <span style={{ color: w.found ? "#c9a84c" : "#3a3a3a" }}>{w.translated}</span>
                  {!w.found && <span style={{ color: "#2a2a2a" }}> (non trouvé)</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
