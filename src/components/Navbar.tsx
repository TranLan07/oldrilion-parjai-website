"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

const linkStyle = "block px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] transition-colors";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const hubRole = (session as unknown as Record<string, unknown>)?.hubRole as string | undefined;
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  const publicLinks = [
    { href: "/", label: "Hub" },
    { href: "/clans", label: "Clans" },
  ];

  const privateLinks = [
    { href: "/profil", label: "Profil" },
    { href: "/messagerie", label: "Messages" },
    { href: "/missions", label: "Missions" },
    { href: "/notifications", label: "Notifications" },
    ...(hubRole === "admin" || hubRole === "moderator" ? [{ href: "/hub/admin", label: "Admin Hub" }] : []),
  ];

  function NavLink({ href, label }: { href: string; label: string }) {
    const active = pathname === href;
    return (
      <Link href={href} className={linkStyle}
        style={{ fontFamily: "var(--font-display)", color: active ? "#f2f2f5" : "#9ca3af" }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#e5e7eb"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#9ca3af"; }}
      >{label}</Link>
    );
  }

  return (
    <nav className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{ borderColor: "#2a2a2a", background: "rgba(10,10,10,0.97)" }}>
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 sm:px-6" style={{ height: "60px" }}>
        <Link href="/" className="text-xl font-bold tracking-[0.22em] sm:text-2xl"
          style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
          LE HUB
        </Link>

        {/* Desktop */}
        <ul className="hidden items-center gap-0.5 lg:flex">
          {publicLinks.map(l => <li key={l.href}><NavLink {...l} /></li>)}
          {session && privateLinks.map(l => <li key={l.href}><NavLink {...l} /></li>)}
          <li className="ml-2">
            {session ? (
              <button onClick={() => signOut()}
                className="rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all"
                style={{ fontFamily: "var(--font-display)", borderColor: "#3a3a3a", color: "#9ca3af" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#fca5a5"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#3a3a3a"; e.currentTarget.style.color = "#9ca3af"; }}
              >Déconnexion</button>
            ) : (
              <Link href="/login"
                className="rounded-sm border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all"
                style={{ fontFamily: "var(--font-display)", borderColor: "#4a4a4a", color: "#f2f2f5" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#f2f2f5"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#4a4a4a"; }}
              >Connexion</Link>
            )}
          </li>
        </ul>

        {/* Mobile burger */}
        <button onClick={() => setOpen(!open)} className="flex flex-col gap-1.5 p-2 lg:hidden" aria-label="Menu">
          <span className="block h-0.5 w-6 transition-all" style={{ background: "#9ca3af", transform: open ? "rotate(45deg) translate(4px, 4px)" : "none" }} />
          <span className="block h-0.5 w-6 transition-all" style={{ background: "#9ca3af", opacity: open ? 0 : 1 }} />
          <span className="block h-0.5 w-6 transition-all" style={{ background: "#9ca3af", transform: open ? "rotate(-45deg) translate(4px, -4px)" : "none" }} />
        </button>
      </div>

      {open && (
        <div className="border-t px-4 pb-4 pt-2 lg:hidden" style={{ borderColor: "#2a2a2a", background: "#0a0a0a" }}>
          {publicLinks.map(l => <NavLink key={l.href} {...l} />)}
          {session && privateLinks.length > 0 && (
            <>
              <div className="my-2 h-px" style={{ background: "#2a2a2a" }} />
              {privateLinks.map(l => <NavLink key={l.href} {...l} />)}
            </>
          )}
          <div className="mt-3">
            {session ? (
              <button onClick={() => signOut()}
                className="w-full rounded-sm border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ fontFamily: "var(--font-display)", borderColor: "#3a3a3a", color: "#9ca3af" }}
              >Déconnexion</button>
            ) : (
              <Link href="/login"
                className="block w-full rounded-sm border px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ fontFamily: "var(--font-display)", borderColor: "#4a4a4a", color: "#f2f2f5" }}
              >Connexion</Link>
            )}
          </div>
        </div>
      )}

      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #3a3a3a, transparent)" }} />
    </nav>
  );
}
