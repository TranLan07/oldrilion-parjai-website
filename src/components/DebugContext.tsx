"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Mode debug : permet de simuler ce que verrait un utilisateur avec d'autres
// paramètres (niveau d'accès, grade, spécialisation). Purement côté client —
// n'altère aucune donnée serveur ; sert à prévisualiser l'affichage.
type DebugState = {
  enabled: boolean;
  perm: number | null; // null = utilise la vraie valeur
  grade: string;
  spec: string;
};

type DebugCtx = DebugState & {
  set: (patch: Partial<DebugState>) => void;
};

const Ctx = createContext<DebugCtx | null>(null);
const KEY = "parjai-debug";

export function useDebug() {
  return useContext(Ctx);
}

// Renvoie le niveau de permission effectif : la valeur simulée si le mode debug
// est actif, sinon la valeur réelle passée en argument.
export function useEffectivePerm(realPerm: number): number {
  const dbg = useDebug();
  if (dbg?.enabled && dbg.perm !== null) return dbg.perm;
  return realPerm;
}

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DebugState>({ enabled: false, perm: null, grade: "", spec: "" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ enabled: false, perm: null, grade: "", spec: "", ...JSON.parse(raw) });
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
