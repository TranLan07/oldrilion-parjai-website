"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

const publicLinks = [
  { href: "/", label: "Accueil", guestOnly: false },
  { href: "/lore", label: "Lore", guestOnly: false },
  { href: "/membres", label: "Membres", guestOnly: false },
  { href: "/regles", label: "Règles", guestOnly: false },
  { href: "/recrutement", label: "Recrutement", guestOnly: true },
];

const privateLinks = [
  { href: "/profil", label: "Profil", minPerm: 1 },
  { href: "/messagerie", label: "Messages", minPerm: 1 },
  { href: "/traducteur", label: "Mando'a", minPerm: 1 },
  { href: "/missions", label: "Missions", minPerm: 1 },
  { href: "/admin", label: "Admin", minPerm: 10 },
];

const linkStyle = "block px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] transition-colors";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const perm = (session as unknown as Record<string, unknown>)?.permissionLevel as number | undefined;
  const [open, setOpen] = useState(false);

  // Close menu on navigation
  useEffect(() => { setOpen(false); }, [pathname]);

  const visiblePublic = publicLinks.filter(({ guestOnly }) => !guestOnly || !session);
  const visiblePrivate = session && perm ? privateLinks.filter(l => perm >= l.minPerm) : [];

  function NavLink({ href, label }: { href: string; label: string }) {
    const active = pathname === href;
    return (
      <Link href={href} className={linkStyle}
        style={{ fontFamily: "var(--font-display)", color: active ? "var(--gold-500)" : "var(--beskar-200)" }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.color = "var(--gold-400)"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.color = "var(--beskar-200)"; }}
      >{label}</Link>
    );
  }

  return (
    <nav className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{ borderColor: "var(--beskar-600)", background: "rgba(16,16,22,0.95)" }}>
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 sm:px-6" style={{ height: "60px" }}>
        <Link href="/" className="text-xl font-bold tracking-[0.18em] sm:text-2xl"
          style={{ fontFamily: "var(--font-display)", color: "var(--gold-500)" }}>
          PARJAI
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-0.5 lg:flex">
          {visiblePublic.map(l => <li key={l.href}><NavLink {...l} /></li>)}
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
                style={{ fontFamily: "var(--font-display)", background: "var(--gold-500)", color: "#1a1408" }}
              >Connexion</Link>
            )}
          </li>
        </ul>

        {/* Mobile burger */}
        <button onClick={() => setOpen(!open)} className="flex flex-col gap-1.5 p-2 lg:hidden" aria-label="Menu">
          <span className="block h-0.5 w-6 transition-all" style={{
            background: "var(--beskar-200)",
            transform: open ? "rotate(45deg) translate(4px, 4px)" : "none",
          }} />
          <span className="block h-0.5 w-6 transition-all" style={{
            background: "var(--beskar-200)",
            opacity: open ? 0 : 1,
          }} />
          <span className="block h-0.5 w-6 transition-all" style={{
            background: "var(--beskar-200)",
            transform: open ? "rotate(-45deg) translate(4px, -4px)" : "none",
          }} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t px-4 pb-4 pt-2 lg:hidden"
          style={{ borderColor: "var(--beskar-600)", background: "var(--beskar-900)" }}>
          {visiblePublic.map(l => <NavLink key={l.href} {...l} />)}
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
                style={{ fontFamily: "var(--font-display)", background: "var(--gold-500)", color: "#1a1408" }}
              >Connexion</Link>
            )}
          </div>
        </div>
      )}

      <div className="h-px w-full" style={{ background: "var(--grad-edge)" }} />
    </nav>
  );
}
