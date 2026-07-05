"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

// Mode debug : permet de simuler ce que verrait un utilisateur avec d'autres
// paramètres. Purement côté client — n'altère aucune donnée serveur.
type DebugState = {
  enabled: boolean;
  visitor: boolean;    // vision d'un visiteur sans compte
  hubRole: string;     // "" = réel | "member" | "admin"
  clanSlug: string;    // "" = réel | slug d'un clan
  clanId: string;      // accompagne clanSlug
  grade: string;       // "" = réel | nom de grade
  spec: string;        // "" = réel | nom de spé
  name: string;        // "" = réel | nom affiché
  customPerm: boolean; // active le niveau de permission custom
  perm: number;        // niveau de permission clan simulé
};

type DebugCtx = DebugState & {
  set: (patch: Partial<DebugState>) => void;
};

const DEFAULT: DebugState = { enabled: false, visitor: false, hubRole: "", clanSlug: "", clanId: "", grade: "", spec: "", name: "", customPerm: false, perm: 1 };

const Ctx = createContext<DebugCtx | null>(null);
const KEY = "parjai-debug";

export function useDebug() {
  return useContext(Ctx);
}

// Identité effective (réelle ou simulée) consommée par les navbars et les pages.
export type EffectiveIdentity = {
  loggedIn: boolean;
  hubRole: string;
  clanSlug: string | null;
  permissionLevel: number;
  displayName: string | null;
  grade: string;
  specialization: string;
  simulated: boolean;
};

export function useEffectiveSession(): EffectiveIdentity {
  const { data: session } = useSession();
  const dbg = useDebug();
  const s = session as unknown as Record<string, unknown> | null;

  const real: EffectiveIdentity = {
    loggedIn: !!session,
    hubRole: (s?.hubRole as string) ?? "member",
    clanSlug: (s?.clanSlug as string) ?? null,
    permissionLevel: (s?.permissionLevel as number) ?? 0,
    displayName: (session?.user?.name as string) ?? null,
    grade: (s?.grade as string) ?? "",
    specialization: (s?.specialization as string) ?? "",
    simulated: false,
  };

  if (!dbg?.enabled) return real;

  // Vision d'un visiteur sans compte : tout est vide / déconnecté.
  if (dbg.visitor) {
    return { loggedIn: false, hubRole: "member", clanSlug: null, permissionLevel: 0, displayName: null, grade: "", specialization: "", simulated: true };
  }

  return {
    loggedIn: true,
    hubRole: dbg.hubRole || real.hubRole,
    clanSlug: dbg.clanSlug || real.clanSlug,
    permissionLevel: dbg.customPerm ? dbg.perm : real.permissionLevel,
    displayName: dbg.name || real.displayName,
    grade: dbg.grade || real.grade,
    specialization: dbg.spec || real.specialization,
    simulated: true,
  };
}

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DebugState>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...DEFAULT, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  function set(patch: Partial<DebugState>) {
    setState(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  return <Ctx.Provider value={{ ...state, set }}>{children}</Ctx.Provider>;
}
