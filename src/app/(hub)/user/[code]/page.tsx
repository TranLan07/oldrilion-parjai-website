"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

type ClanInfo = {
  clan: { slug: string; name: string; colorBg: string; colorPrimary: string; colorAccent: string };
  grade: string; role: string; specialization: string; specializationSecret: boolean;
};
type PublicProfile = {
  accessible: true; isOwner: boolean; publicId: string; displayName: string; mandalorien: boolean;
  discours: string | null; bio: string | null; clanInfo: ClanInfo | null;
};
type Inaccessible = { accessible: false; reason: "clan_private" };

export default function PublicProfilePage() {
  const params = useParams();
  const code = (params.code as string || "").toUpperCase();
  const { status } = useSession();
  const [data, setData] = useState<PublicProfile | Inaccessible | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    fetch(`/api/user/${code}`).then(async r => {
      if (r.status === 404) { setNotFound(true); setLoading(false); return; }
      const d = await r.json();
      setData(d);
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, [code, status]);

  if (loading) return <div className="p-16 text-center text-sm" style={{ color: "#6b7280" }}>Chargement...</div>;
  if (notFound) return <div className="p-16 text-center text-sm" style={{ color: "#6b7280" }}>Profil introuvable.</div>;
  if (!data) return null;

  if (!data.accessible) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#4a4a4a" }}>Profil</p>
        <h1 className="mb-4 text-2xl font-bold uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
          Profil non accessible
        </h1>
        <p className="text-sm" style={{ color: "#6b7280" }}>
          Le clan de cet utilisateur a rendu les profils de ses membres privés. Seuls les administrateurs peuvent le consulter.
        </p>
      </div>
    );
  }

  const { publicId, displayName, mandalorien, discours, bio, clanInfo, isOwner } = data;
  const clan = clanInfo?.clan;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      {isOwner && (
        <div className="mb-6 rounded-sm border px-4 py-3 text-sm" style={{ borderColor: "#c9a84c40", background: "rgba(201,168,76,0.06)", color: "#c9a84c" }}>
          C&apos;est votre profil public tel que les autres le voient. <Link href="/profil" className="underline">Modifier la visibilité →</Link>
        </div>
      )}

      <section className="mb-6 rounded-sm border p-6" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold flex-shrink-0"
            style={{ background: "#1a1a1a", color: "#f2f2f5", border: "1px solid #2a2a2a" }}>
            {displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
              {displayName}
            </h1>
            <p className="font-mono text-xs" style={{ color: "#4a4a4a" }}>{publicId}{mandalorien && <span className="ml-2" style={{ color: "#c9a84c" }}>Mandalorien</span>}</p>
          </div>
        </div>
        {discours && (
          <p className="mt-4 border-l-2 pl-3 text-sm italic" style={{ borderColor: "#c9a84c60", color: "#d1d5db" }}>
            “{discours}”
          </p>
        )}
      </section>

      {bio && (
        <section className="mb-6 rounded-sm border p-6" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#4a4a4a" }}>Biographie</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "#e5e7eb" }}>{bio}</p>
        </section>
      )}

      {clanInfo && clan && (
        <section className="overflow-hidden rounded-sm border"
          style={{ borderColor: clan.colorPrimary + "55", background: `linear-gradient(160deg, ${clan.colorPrimary}12, ${clan.colorBg})` }}>
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${clan.colorAccent}, ${clan.colorPrimary})` }} />
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: clan.colorPrimary, opacity: 0.7 }}>Clan</p>
                <h2 className="text-xl font-bold uppercase tracking-[0.12em]" style={{ fontFamily: "var(--font-display)", color: clan.colorPrimary }}>{clan.name}</h2>
              </div>
              <Link href={`/clan/${clan.slug}`}
                className="rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]"
                style={{ borderColor: clan.colorPrimary + "55", color: clan.colorPrimary }}>
                Espace clan →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniCard label="Grade" value={clanInfo.grade || "—"} accent={clan.colorPrimary} />
              <MiniCard label="Rôle" value={clanInfo.role || "membre"} accent={clan.colorPrimary} />
              <MiniCard label="Spécialisation" value={clanInfo.specialization} accent={clan.colorPrimary} badge={clanInfo.specializationSecret ? "secrète" : undefined} />
            </div>
          </div>
        </section>
      )}

      {!discours && !bio && !clanInfo && (
        <p className="py-8 text-center text-sm" style={{ color: "#3a3a3a" }}>Ce membre n&apos;a rendu aucune information publique.</p>
      )}
    </div>
  );
}

function MiniCard({ label, value, accent, badge }: { label: string; value: string; accent: string; badge?: string }) {
  return (
    <div className="rounded-sm px-4 py-3" style={{ background: "rgba(0,0,0,0.35)", border: `1px solid ${accent}33` }}>
      <div className="flex items-center gap-2">
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: accent, opacity: 0.7 }}>{label}</p>
        {badge && <span className="rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ background: `${accent}22`, color: accent }}>{badge}</span>}
      </div>
      <p className="mt-1 text-sm font-semibold" style={{ color: "#f2f2f5" }}>{value}</p>
    </div>
  );
}
