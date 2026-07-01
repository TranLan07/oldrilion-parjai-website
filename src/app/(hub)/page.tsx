import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function HubHome() {
  const clans = await prisma.clan.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-20">
      <div className="mb-16 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#6b7280" }}>
          Nar Shaddaa · Mandalore · Coruscant
        </p>
        <h1 className="mb-4 text-5xl font-bold uppercase tracking-[0.2em] sm:text-6xl"
          style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
          Le Hub
        </h1>
        <div className="mx-auto mb-6 h-px w-24" style={{ background: "linear-gradient(90deg, transparent, #4a4a4a, transparent)" }} />
        <p className="mx-auto max-w-xl text-base" style={{ color: "#9ca3af" }}>
          Réseau inter-clans mandalorien. Retrouvez ici les clans actifs du serveur RP Star Wars,
          leurs espaces, leurs membres, et les canaux de communication partagés.
        </p>
      </div>

      {clans.length === 0 ? (
        <p className="text-center text-sm" style={{ color: "#6b7280" }}>Aucun clan enregistré pour l'instant.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clans.map(clan => (
            <Link key={clan.id} href={`/clan/${clan.slug}`}
              className="group block rounded-sm border p-6 transition-all"
              style={{ borderColor: "#2a2a2a", background: "#111111" }}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: clan.colorPrimary }} />
                <h2 className="text-lg font-bold uppercase tracking-[0.14em]"
                  style={{ fontFamily: "var(--font-display)", color: clan.colorPrimary }}>
                  {clan.name}
                </h2>
              </div>
              <p className="text-sm" style={{ color: "#9ca3af" }}>
                {clan.description || "Aucune description."}
              </p>
              <div className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] transition-colors"
                style={{ color: "#6b7280" }}>
                Accéder →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
