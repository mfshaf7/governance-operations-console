"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { TerasActionButton, TerasContentTray } from "@/teras";

const ConsoleReleaseContext = createContext(false);

export function ConsoleReleaseProvider({ children }: { children: ReactNode }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (updateAvailable) return;
    const mountedRelease = process.env.NEXT_PUBLIC_CONSOLE_RELEASE;
    if (!mountedRelease) return;

    const scope = new AbortController();
    let checking = false;
    async function checkRelease() {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const response = await fetch("/api/console/release", { cache: "no-store", signal: scope.signal });
        if (!response.ok) return;
        const { release } = await response.json();
        if (typeof release === "string" && /^[0-9a-f-]{36}$/.test(release) &&
            release !== mountedRelease && !scope.signal.aborted) setUpdateAvailable(true);
      } catch {
        // A failed read leaves the current tab in place.
      } finally {
        checking = false;
      }
    }
    const visibility = () => void checkRelease();
    void checkRelease();
    const timer = window.setInterval(visibility, 60000);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      scope.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [updateAvailable]);

  return <ConsoleReleaseContext.Provider value={updateAvailable}>{children}</ConsoleReleaseContext.Provider>;
}

export function ConsoleReleaseNotice({ workspaceOpen }: { workspaceOpen: boolean }) {
  if (!useContext(ConsoleReleaseContext)) return null;
  return <TerasContentTray role="status" title="Console update available"
    description={workspaceOpen
      ? "Save and close your workspace before reloading."
      : "Reload when you’re ready to use the updated controls."}
    actions={workspaceOpen ? null : <TerasActionButton emphasis="secondary" onClick={() => window.location.reload()}>
      Reload Console
    </TerasActionButton>} />;
}
