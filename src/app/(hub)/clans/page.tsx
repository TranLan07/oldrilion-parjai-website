"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Tag = { id: string; name: string };
type Clan = {
  id: string; slug: string; name: string; description: string;
  colorPrimary: string; colorAccent: string; colorBg: string;
  tags: { tag: Tag }[];
  _count: { members: number };
};

export default function ClansPage() {
  const [clans, setClans] = useState<Clan[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/tags").then(r => r.json()).then(setTags).catch(() => {});
    // Fetch clans avec leurs tags
    fetch("/api/hub/clans").then(r => r.json()).then(setClans).catch(() => {});
  }, []);

  const filtered = clans.filter(clan => {
    const matchTag = !activeTag || clan.tags.some(ct => ct.tag.id === activeTag);
    const matchSearch = !search || clan.name.toLowerCase().includes(search.toLowerCase());
    return matchTag && matchSearch;
  });

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16">
      {/* Header */}
      <div className="mb-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>
          {clans.length} clan{clans.length > 1 ? "s" : ""} enregistré{clans.length > 1 ? "s" : ""}
        </p>
        <h1 className="text-4xl font-bold uppercase tracking-[0.14em]"
          style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
          Clans
        </h1>
      </div>

      {/* Filtres */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un clan..."
          className="rounded-sm border px-3 py-2 text-sm outline-none w-52"
          style={{ background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" }}
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTag(null)}
              className="rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition-all"
              style={{
                background: !activeTag ? "#f2f2f5" : "transparent",
                color: !activeTag ? "#000" : "#6b7280",
                border: "1px solid",
                borderColor: !activeTag ? "#f2f2f5" : "#2a2a2a",
              }}
            >Tous</button>
            {tags.map(tag => (
              <button key={tag.id}
                onClick={() => setActiveTag(activeTag === tag.id ? null : tag.id)}
                className="rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition-all"
                style={{
                  background: activeTag === tag.id ? "#f2f2f5" : "transparent",
                  color: activeTag === tag.id ? "#000" : "#6b7280",
                  border: "1px solid",
                  borderColor: activeTag === tag.id ? "#f2f2f5" : "#2a2a2a",
                }}
              >{tag.name}</button>
            ))}
          </div>
        )}
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <p className="py-20 text-center text-sm" style={{ color: "#4a4a4a" }}>
          {clans.length === 0 ? "Chargement..." : "Aucun clan ne correspond à cette recherche."}
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(clan => (
            <div key={clan.id} className="rounded-sm border overflow-hidden" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
              {/* Bande couleur */}
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${clan.colorAccent}, ${clan.colorPrimary})` }} />
              <div className="p-6">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: clan.colorPrimary }} />
                  <h2 className="text-xl font-bold uppercase tracking-[0.12em]"
                    style={{ fontFamily: "var(--font-display)", color: clan.colorPrimary }}>
                    {clan.name}
                  </h2>
                  <span className="ml-auto text-xs" style={{ color: "#4a4a4a" }}>
                    {clan._count.members} mbr
                  </span>
                </div>

                <p className="mb-4 text-sm leading-relaxed" style={{ color: "#6b7280" }}>
                  {clan.description || "Aucune description."}
                </p>

                {clan.tags.length > 0 && (
                  <div className="mb-5 flex flex-wrap gap-1.5">
                    {clan.tags.map(ct => (
                      <span key={ct.tag.id}
                        className="rounded-sm px-1.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em]"
                        style={{ background: "#161616", color: "#4a4a4a", border: "1px solid #222" }}>
                        {ct.tag.name}
                      </span>
                    ))}
                  </div>
                )}

                <Link href={`/clan/${clan.slug}`}
                  className="inline-block rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all"
                  style={{ borderColor: clan.colorPrimary, color: clan.colorPrimary }}
                >
                  Visiter →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
