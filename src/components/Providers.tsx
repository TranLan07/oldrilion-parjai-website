"use client";

import { SessionProvider } from "next-auth/react";
import { DebugProvider } from "./DebugContext";
import DebugPanel from "./DebugPanel";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DebugProvider>
        {children}
        <DebugPanel />
      </DebugProvider>
    </SessionProvider>
  );
}
