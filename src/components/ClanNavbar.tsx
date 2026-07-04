"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

type Props = { slug: string; clanName: string; diplomacyPublic?: boolean };

const linkStyle = "block px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] transition-colors";

export default function ClanNavbar({ slug, clanName, diplomacyPublic }: Props) {
  const base = `/clan/${slug}`;
  const pathname = usePathname();
  const { data: session } = useSession();
  const perm = (session as unknown as Record<string, unknown>)?.permissionLevel as number | undefined;
  const sessionClanSlug = (session as unknown as Record<string, unknown>)?.clanSlug as string | undefined;
  const hubRole = (session as unknown as Record<string, unknown>)?.hubRole as string | undefined;
  const [open, setOpen] = useState(false);
  const [appOpen, setAppOpen] = useState(false);

  useEffect(() => { setOpen(false); setAppOpen(false); }, [pathname]);

  const effectivePerm = session
    ? (sessionClanSlug === slug ? (perm ?? 1) : 1)
    : 0;

  const isAdmin = hubRole === "admin" || (sessionClanSlug === slug && (perm ?? 0) >= 10);

  // Liens toujours visibles (statiques / partagés en lien externe)
  const publicLinks = [
    { href: `${base}`, label: "Accueil" },
    { href: `${base}/lore`, label: "Lore" },
    { href: `${base}/regles`, label: "Règles" },
    { href: `${base}/membres`, label: "Membres" },
    ...(diplomacyPublic ? [{ href: `${base}/diplomatie`, label: "Diplomatie" }] : []),
    ...(!session ? [{ href: `${base}/recrutement`, label: "Recrutement" }] : []),
  ];

  // Liens dans le dropdown "App" (fonctionnalités actives, membres connectés)
  const appLinks = [
    { href: `${base}/messagerie`, label: "Messages", minPerm: 1 },
    { href: `${base}/missions`, label: "Missions", minPerm: 1 },
    { href: `${base}/evenements`, label: "Événements", minPerm: 1 },
    { href: `${base}/banque`, label: "Banque", minPerm: 1 },
    ...(!diplomacyPublic ? [{ href: `${base}/diplomatie`, label: "Diplomatie", minPerm: 1 }] : []),
  ];

  // Liens hors dropdown (points d'entrée externes + admin)
  // Le traducteur Mando'a est volontairement absent des clans : il n'existe que dans le hub.
  const extraLinks = [
    ...(session ? [{ href: `${base}/recrutement`, label: "Recrutement" }] : []),
  ];

  const visibleApp = effectivePerm > 0
    ? appLinks.filter(l => effectivePerm >= l.minPerm)
    : [];

  const appActive = appLinks.some(l => pathname === l.href);

  function NavLink({ href, label }: { href: string; label: string }) {
    const active = pathname === href;
    return (
      <Link href={href} className={linkStyle}
        style={{ fontFamily: "var(--font-display)", color: active ? "var(--clan-primary, var(--gold-500))" : "var(--beskar-200)" }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.color = "var(--clan-primary, var(--gold-400))"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.color = "var(--beskar-200)"; }}
      >{label}</Link>
    );
  }

  return (
    <nav className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{ borderColor: "var(--clan-primary, var(--beskar-600))", background: "rgba(16,16,22,0.95)" }}>
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 sm:px-6" style={{ height: "60px" }}>
        <div className="flex items-center gap-3">
          <Link href="/clans" className="text-xs font-semibold uppercase tracking-[0.14em] transition-colors"
            style={{ fontFamily: "var(--font-display)", color: "var(--beskar-400)" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--beskar-200)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--beskar-400)"; }}
          >Hub</Link>
          <span style={{ color: "var(--beskar-600)" }}>›</span>
          <Link href={base} className="text-xl font-bold tracking-[0.18em] sm:text-2xl"
            style={{ fontFamily: "var(--font-display)", color: "var(--clan-primary, var(--gold-500))" }}>
            {clanName.toUpperCase()}
          </Link>
        </div>

        {/* Desktop */}
        <ul className="hidden items-center gap-0.5 xl:flex">
          {publicLinks.map(l => <li key={l.href}><NavLink {...l} /></li>)}

          {/* Dropdown "App" */}
          {visibleApp.length > 0 && (
            <li className="relative" onMouseEnter={() => setAppOpen(true)} onMouseLeave={() => setAppOpen(false)}>
              <button className={`${linkStyle} inline-flex items-center gap-1`}
                style={{ fontFamily: "var(--font-display)", color: appActive ? "var(--clan-primary, var(--gold-500))" : "var(--beskar-200)" }}>
                App
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {appOpen && (
                <div className="absolute left-0 top-full z-50 min-w-[160px] rounded-sm border py-1 shadow-lg"
                  style={{ background: "#0e0e12", borderColor: "var(--clan-primary, var(--beskar-600))" }}>
                  {visibleApp.map(l => (
                    <Link key={l.href} href={l.href}
                      className="block px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] transition-colors"
                      style={{ fontFamily: "var(--font-display)", color: pathname === l.href ? "var(--clan-primary, var(--gold-500))" : "var(--beskar-200)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--clan-primary, var(--gold-400))"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.03)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = pathname === l.href ? "var(--clan-primary, var(--gold-500))" : "var(--beskar-200)"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}>
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          )}

          {extraLinks.map(l => <li key={l.href}><NavLink {...l} /></li>)}
          {isAdmin && <li><NavLink href={`${base}/admin`} label="Admin" /></li>}

          <li className="ml-2">
            {session ? (
              <Link href="/profil" className="relative flex items-center justify-center rounded-full transition-all"
                style={{ width: "34px", height: "34px", background: "#1a1a1a", border: "1px solid var(--beskar-600)", color: "var(--beskar-300)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--clan-primary, #c9a84c)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--clan-primary, #c9a84c)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--beskar-600)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--beskar-300)"; }}
                title="Mon profil">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
              </Link>
            ) : (
              <Link href="/login"
                className="rounded-sm px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ fontFamily: "var(--font-display)", background: "var(--clan-primary, var(--gold-500))", color: "#1a1408" }}
              >Connexion</Link>
            )}
          </li>
        </ul>

        {/* Mobile burger */}
        <button onClick={() => setOpen(!open)} className="flex flex-col gap-1.5 p-2 xl:hidden" aria-label="Menu">
          <span className="block h-0.5 w-6 transition-all" style={{ background: "var(--beskar-200)", transform: open ? "rotate(45deg) translate(4px, 4px)" : "none" }} />
          <span className="block h-0.5 w-6 transition-all" style={{ background: "var(--beskar-200)", opacity: open ? 0 : 1 }} />
          <span className="block h-0.5 w-6 transition-all" style={{ background: "var(--beskar-200)", transform: open ? "rotate(-45deg) translate(4px, -4px)" : "none" }} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t px-4 pb-4 pt-2 xl:hidden"
          style={{ borderColor: "var(--beskar-600)", background: "var(--beskar-900)" }}>
          {publicLinks.map(l => <NavLink key={l.href} {...l} />)}
          {visibleApp.length > 0 && (
            <>
              <div className="my-2 h-px" style={{ background: "var(--beskar-600)" }} />
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--beskar-500)" }}>App</p>
              {visibleApp.map(l => <NavLink key={l.href} {...l} />)}
            </>
          )}
          {(extraLinks.length > 0 || isAdmin) && (
            <>
              <div className="my-2 h-px" style={{ background: "var(--beskar-600)" }} />
              {extraLinks.map(l => <NavLink key={l.href} {...l} />)}
              {isAdmin && <NavLink href={`${base}/admin`} label="Admin" />}
            </>
          )}
          <div className="mt-3">
            {session ? (
              <Link href="/profil"
                className="block w-full rounded-sm border px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ fontFamily: "var(--font-display)", borderColor: "var(--beskar-500)", color: "var(--beskar-300)" }}
              >Mon profil</Link>
            ) : (
              <Link href="/login"
                className="block w-full rounded-sm px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ fontFamily: "var(--font-display)", background: "var(--clan-primary, var(--gold-500))", color: "#1a1408" }}
              >Connexion</Link>
            )}
          </div>
        </div>
      )}

      <div className="h-px w-full" style={{ background: "var(--grad-edge)" }} />
    </nav>
  );
}
