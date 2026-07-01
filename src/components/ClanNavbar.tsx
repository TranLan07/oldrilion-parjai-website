"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

type Props = { slug: string; clanName: string };

const linkStyle = "block px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] transition-colors";

export default function ClanNavbar({ slug, clanName }: Props) {
  const base = `/clan/${slug}`;
  const pathname = usePathname();
  const { data: session } = useSession();
  const perm = (session as unknown as Record<string, unknown>)?.permissionLevel as number | undefined;
  const sessionClanSlug = (session as unknown as Record<string, unknown>)?.clanSlug as string | undefined;
  const hubRole = (session as unknown as Record<string, unknown>)?.hubRole as string | undefined;
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  // Niveau d'accès effectif dans ce clan
  // - membre du clan : permissionLevel
  // - utilisateur d'un autre clan connecté : niveau 1
  // - non connecté : 0
  const effectivePerm = session
    ? (sessionClanSlug === slug ? (perm ?? 1) : 1)
    : 0;

  const publicLinks = [
    { href: `${base}`, label: "Accueil" },
    { href: `${base}/lore`, label: "Lore" },
    { href: `${base}/membres`, label: "Membres" },
    { href: `${base}/regles`, label: "Règles" },
    ...(!session ? [{ href: `${base}/recrutement`, label: "Recrutement" }] : []),
  ];

  const privateLinks = [
    { href: `/profil`, label: "Profil", minPerm: 1 },
    { href: `${base}/messagerie`, label: "Messages", minPerm: 1 },
    { href: `${base}/missions`, label: "Missions", minPerm: 1 },
    { href: `${base}/evenements`, label: "Evenements", minPerm: 1 },
    { href: `${base}/admin`, label: "Admin", minPerm: 10 },
  ];

  const isAdmin = hubRole === "admin" || (sessionClanSlug === slug && (perm ?? 0) >= 10);

  const visiblePrivate = effectivePerm > 0
    ? privateLinks.filter(l => l.minPerm < 10 ? effectivePerm >= l.minPerm : isAdmin)
    : [];

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
      style={{ borderColor: "var(--beskar-600)", background: "rgba(16,16,22,0.95)" }}>
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
        <ul className="hidden items-center gap-0.5 lg:flex">
          {publicLinks.map(l => <li key={l.href}><NavLink {...l} /></li>)}
          {visiblePrivate.map(l => <li key={l.href}><NavLink {...l} /></li>)}
          <li className="ml-2">
            {session ? (
              <button onClick={() => signOut()}
                className="rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all"
                style={{ fontFamily: "var(--font-display)", borderColor: "var(--beskar-500)", color: "var(--beskar-300)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--red-600)"; e.currentTarget.style.color = "var(--red-400)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--beskar-500)"; e.currentTarget.style.color = "var(--beskar-300)"; }}
              >Déconnexion</button>
            ) : (
              <Link href="/login"
                className="rounded-sm px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ fontFamily: "var(--font-display)", background: "var(--clan-primary, var(--gold-500))", color: "#1a1408" }}
              >Connexion</Link>
            )}
          </li>
        </ul>

        {/* Mobile burger */}
        <button onClick={() => setOpen(!open)} className="flex flex-col gap-1.5 p-2 lg:hidden" aria-label="Menu">
          <span className="block h-0.5 w-6 transition-all" style={{ background: "var(--beskar-200)", transform: open ? "rotate(45deg) translate(4px, 4px)" : "none" }} />
          <span className="block h-0.5 w-6 transition-all" style={{ background: "var(--beskar-200)", opacity: open ? 0 : 1 }} />
          <span className="block h-0.5 w-6 transition-all" style={{ background: "var(--beskar-200)", transform: open ? "rotate(-45deg) translate(4px, -4px)" : "none" }} />
        </button>
      </div>

      {open && (
        <div className="border-t px-4 pb-4 pt-2 lg:hidden"
          style={{ borderColor: "var(--beskar-600)", background: "var(--beskar-900)" }}>
          {publicLinks.map(l => <NavLink key={l.href} {...l} />)}
          {visiblePrivate.length > 0 && (
            <>
              <div className="my-2 h-px" style={{ background: "var(--beskar-600)" }} />
              {visiblePrivate.map(l => <NavLink key={l.href} {...l} />)}
            </>
          )}
          <div className="mt-3">
            {session ? (
              <button onClick={() => signOut()}
                className="w-full rounded-sm border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ fontFamily: "var(--font-display)", borderColor: "var(--beskar-500)", color: "var(--beskar-300)" }}
              >Déconnexion</button>
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
