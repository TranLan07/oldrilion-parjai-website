import Link from "next/link";
import { prisma } from "@/lib/prisma";
import HeroButtons from "./HeroButtons";

export const metadata = { title: "Le Hub — Réseau Mandalorien" };

export default async function HubHome() {
  const clans = await prisma.clan.findMany({
    include: {
      tags: { include: { tag: true } },
      _count: { select: { members: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center px-6 text-center"
        style={{ background: "linear-gradient(180deg, #000000 0%, #0d0d0d 60%, #111111 100%)" }}>
        <div className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, #2a2a2a 39px, #2a2a2a 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #2a2a2a 39px, #2a2a2a 40px)" }} />

        <p className="relative mb-4 text-xs font-semibold uppercase tracking-[0.4em]" style={{ color: "#4a4a4a" }}>
          Réseau Inter-Clans · Serveur RP Star Wars
        </p>
        <h1 className="relative mb-4 text-6xl font-bold uppercase tracking-[0.25em] sm:text-7xl lg:text-8xl"
          style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
          Le Hub
        </h1>
        <div className="relative mx-auto mb-6 h-px w-32" style={{ background: "linear-gradient(90deg, transparent, #4a4a4a, transparent)" }} />
        <p className="relative mx-auto max-w-lg text-base leading-relaxed" style={{ color: "#6b7280" }}>
          Espace central regroupant les clans mandaloriens actifs.
          Rejoignez un clan, participez aux missions communes, échangez sur les canaux inter-clans.
        </p>
        <HeroButtons />
      </section>

      {/* ── Stats ── */}
      <section className="border-y py-10" style={{ borderColor: "#1a1a1a", background: "#0a0a0a" }}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-center gap-12 px-6 flex-wrap">
          <Stat value={clans.length} label="Clans" />
          <div className="h-8 w-px" style={{ background: "#2a2a2a" }} />
          <Stat value={clans.reduce((a, c) => a + c._count.members, 0)} label="Membres" />
          <div className="h-8 w-px" style={{ background: "#2a2a2a" }} />
          <Stat value="∞" label="Missions" />
        </div>
      </section>

      {/* ── Clans ── */}
      {clans.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-6 py-20">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Clans actifs</p>
              <h2 className="text-3xl font-bold uppercase tracking-[0.14em]"
                style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
                Les factions
              </h2>
            </div>
            <Link href="/clans" className="text-sm transition-colors" style={{ color: "#6b7280" }}
            >Voir tout →</Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clans.map(clan => <ClanCard key={clan.id} clan={clan} />)}
          </div>
        </section>
      )}

      {/* ── Comment rejoindre ── */}
      <section className="border-t py-20" style={{ borderColor: "#1a1a1a", background: "#080808" }}>
        <div className="mx-auto max-w-[800px] px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold uppercase tracking-[0.14em]"
            style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
            Rejoindre le réseau
          </h2>
          <p className="mb-8 text-base" style={{ color: "#6b7280" }}>
            Choisissez un clan, consultez sa page et postulez directement via le formulaire de recrutement.
            Une fois accepté, vous aurez accès à l&apos;espace privé du clan et aux canaux inter-clans du hub.
          </p>
          <Link href="/clans"
            className="inline-block rounded-sm border px-8 py-3 text-sm font-semibold uppercase tracking-[0.14em]"
            style={{ borderColor: "#3a3a3a", color: "#9ca3af" }}
          >
            Parcourir les clans
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>{label}</p>
    </div>
  );
}

type ClanData = {
  id: string; slug: string; name: string; description: string;
  colorPrimary: string; colorAccent: string; colorBg: string;
  tags: { tag: { id: string; name: string } }[];
  _count: { members: number };
};

function ClanCard({ clan }: { clan: ClanData }) {
  return (
    <Link href={`/clan/${clan.slug}`}
      className="group block rounded-sm border overflow-hidden transition-all hover:-translate-y-0.5"
      style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}
    >
      {/* Bande couleur clan */}
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${clan.colorAccent}, ${clan.colorPrimary})` }} />
      <div className="p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: clan.colorPrimary }} />
          <h3 className="text-lg font-bold uppercase tracking-[0.12em]"
            style={{ fontFamily: "var(--font-display)", color: clan.colorPrimary }}>
            {clan.name}
          </h3>
          <span className="ml-auto text-xs" style={{ color: "#4a4a4a" }}>
            {clan._count.members} mbr
          </span>
        </div>

        <p className="mb-4 text-sm leading-relaxed line-clamp-2" style={{ color: "#6b7280" }}>
          {clan.description || "Aucune description."}
        </p>

        {clan.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {clan.tags.map(ct => (
              <span key={ct.tag.id}
                className="rounded-sm px-1.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em]"
                style={{ background: "#161616", color: "#4a4a4a", border: "1px solid #222" }}>
                {ct.tag.name}
              </span>
            ))}
          </div>
        )}

        <span className="text-xs font-semibold uppercase tracking-[0.14em] transition-colors"
          style={{ color: clan.colorPrimary, opacity: 0.7 }}>
          Accéder →
        </span>
      </div>
    </Link>
  );
}
