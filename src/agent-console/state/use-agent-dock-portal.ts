"use client";
import { useEffect, useState } from "react";

// Keep the Agent/controller/provider mounted. Only its presentation enters the
// native top layer; nested review dialogs retain their own focus and Escape.
export function useAgentDockPortal(enabled: boolean) {
  const [surface, setSurface] = useState<{ host: HTMLElement | null; blocked: boolean }>({ host: null, blocked: false });
  useEffect(() => {
    if (!enabled) return;
    const update = () => {
      const dialogs = [...document.querySelectorAll<HTMLDialogElement>("dialog[open]:not(.model-dock-native)")];
      const top = dialogs.at(-1);
      const host = top?.querySelector<HTMLElement>(":scope > [data-agent-console-host]") ?? null;
      setSurface(current => {
        const nextHost = host ?? (top ? current.host : null);
        const blocked = Boolean(top && !host);
        return current.host === nextHost && current.blocked === blocked ? current : { host: nextHost, blocked };
      });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open"] });
    return () => observer.disconnect();
  }, [enabled]);
  return surface;
}
