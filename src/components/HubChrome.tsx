"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Navbar from "./Navbar";
import ClanNavbar from "./ClanNavbar";

type ClanTheme = {
  name: string; colorBg: string; colorPrimary: string; colorAccent: string;
  premium: boolean; logoUrl: string | null; diplomacyPublic: boolean;
};

// Le header générique du hub, sauf quand on consulte la messagerie depuis l'onglet
// "Clan" ouvert via le header d'un clan (?tab=clan&clan=<slug>) : dans ce cas on
// garde le header (et le thème) du clan, pour ne pas perdre le contexte visuel
// en cliquant sur "Messages" depuis ClanNavbar.
export default function HubChrome() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const clanSlug = pathname === "/messagerie" && searchParams.get("tab") === "clan" ? searchParams.get("clan") : null;
  const [theme, setTheme] = useState<ClanTheme | null>(null);

  useEffect(() => {
    if (!clanSlug) { setTheme(null); return; }
    let cancelled = false;
    fetch(`/api/clan/${clanSlug}/public`).then(r => r.ok ? r.json() : null).then(d => {
      if (!cancelled && d) setTheme(d);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [clanSlug]);

  if (clanSlug && theme) {
    const themeVars = `
      :root {
        --clan-bg: ${theme.colorBg};
        --clan-primary: ${theme.colorPrimary};
        --clan-accent: ${theme.colorAccent};
        --accent: ${theme.colorPrimary};
        --accent-dim: ${theme.colorAccent};
      }
    `;
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: themeVars }} />
        <ClanNavbar slug={clanSlug} clanName={theme.name} diplomacyPublic={theme.diplomacyPublic} premium={theme.premium} logoUrl={theme.logoUrl} />
      </>
    );
  }

  return <Navbar />;
}
