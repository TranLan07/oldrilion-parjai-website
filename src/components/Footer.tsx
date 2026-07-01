import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: "#1a1a1a", background: "#080808" }}>
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-lg font-bold uppercase tracking-[0.22em]"
              style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
              Le Hub
            </p>
            <p className="mt-1 text-xs italic" style={{ color: "#3a3a3a" }}>
              Réseau inter-clans mandaloriens
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs">
            <Link href="/clans" style={{ color: "#6b7280" }}>Clans</Link>
            <Link href="/traducteur" style={{ color: "#6b7280" }}>Mando'a</Link>
            <Link href="/contact" style={{ color: "#6b7280" }}>Contact &amp; RGPD</Link>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center" style={{ borderColor: "#1a1a1a" }}>
          <p className="text-xs" style={{ color: "#2a2a2a" }}>
            Site fictif dans le cadre d'un serveur RP Star Wars · Aucune donnée commerciale
          </p>
        </div>
      </div>
    </footer>
  );
}
