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
  const clanSlug = (session as unknown as Record<string, unknown>)?.clanSlug as string | undefined;
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!session) return;
    const fetchCount = () => fetch("/api/notifications/count").then(r => r.ok ? r.json() : { count: 0 }).then(d => setUnread(d.count));
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => clearInterval(t);
  }, [session]);

  const publicLinks = [
    { href: "/", label: "Hub" },
    { href: "/clans", label: "Clans" },
  ];

  const privateLinks = [
    { href: "/messagerie", label: "Messages" },
    { href: "/missions", label: "Missions" },
    { href: "/evenements", label: "Événements" },
    { href: "/traducteur", label: "Mando'a" },
    ...(hubRole === "admin" || hubRole === "moderator" ? [{ href: "/hub/admin", label: "Admin Hub" }] : []),
  ];

  function NavLink({ href, label, badge }: { href: string; label: string; badge?: number }) {
    const active = pathname === href;
    return (
      <Link href={href} className={`${linkStyle} relative inline-flex items-center gap-1.5`}
        style={{ fontFamily: "var(--font-display)", color: active ? "#f2f2f5" : "#9ca3af" }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#e5e7eb"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#9ca3af"; }}
      >
        {label}
        {badge != null && (
          <span className="rounded-full text-xs font-bold leading-none px-1.5 py-0.5"
            style={{ background: "#ef4444", color: "#fff", fontSize: "10px" }}>
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
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
          {session && privateLinks.map(l => <li key={l.href}><NavLink href={l.href} label={l.label} badge={(l as {badge?: number}).badge} /></li>)}
          {session && clanSlug && (
            <li>
              <Link href={`/clan/${clanSlug}`}
                className="rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all"
                style={{ fontFamily: "var(--font-display)", borderColor: "#c9a84c40", color: "#c9a84c" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#c9a84c"; e.currentTarget.style.background = "#c9a84c10"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#c9a84c40"; e.currentTarget.style.background = "transparent"; }}
              >Mon Clan</Link>
            </li>
          )}
          <li className="ml-2">
            {session ? (
              <Link href="/profil" className="relative flex items-center justify-center rounded-full transition-all"
                style={{ width: "34px", height: "34px", background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#9ca3af" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#f2f2f5"; (e.currentTarget as HTMLAnchorElement).style.color = "#f2f2f5"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#2a2a2a"; (e.currentTarget as HTMLAnchorElement).style.color = "#9ca3af"; }}
                title="Mon profil">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold leading-none"
                    style={{ background: "#ef4444", color: "#fff", fontSize: "9px" }}>
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
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
              {privateLinks.map(l => <NavLink key={l.href} href={l.href} label={l.label} badge={(l as {badge?: number}).badge} />)}
            </>
          )}
          <div className="mt-3 flex flex-col gap-2">
            {session && clanSlug && (
              <Link href={`/clan/${clanSlug}`}
                className="block w-full rounded-sm border px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ fontFamily: "var(--font-display)", borderColor: "#c9a84c40", color: "#c9a84c" }}
              >Mon Clan</Link>
            )}
            {session ? (
              <Link href="/profil"
                className="block w-full rounded-sm border px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ fontFamily: "var(--font-display)", borderColor: "#2a2a2a", color: "#9ca3af" }}
              >Mon profil {unread > 0 && `(${unread})`}</Link>
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
