"use client";
import { useEffect, useState } from "react";
import { consoleOperatorAccountFixture } from "../fixtures/console-operator.fixture";
import { operatorAccountSnapshot, unavailableOperatorIdentity } from "./operator-account-snapshot";
import type { OperatorIdentitySnapshot } from "./operator-identity-model";
import type { OperatorAccountSnapshot } from "./operator-account-model";

export function useOperatorAccountSnapshot() {
  function snapshot(identity: OperatorIdentitySnapshot) {
    const next = operatorAccountSnapshot(identity);
    return { ...next, profile: { ...consoleOperatorAccountFixture.profile, displayName: identity.principal.displayName } };
  }
  const [account, setAccount] = useState<OperatorAccountSnapshot>(() => snapshot(unavailableOperatorIdentity));
  useEffect(() => {
    if (account.identity.source.mode !== "live") return;
    const delay = Date.parse(account.identity.session.expiresAt ?? "") - Date.now();
    if (!Number.isFinite(delay)) { setAccount(current => ({ ...current, identity: unavailableOperatorIdentity })); return; }
    const timer = setTimeout(() => setAccount(current => ({ ...current, identity: unavailableOperatorIdentity })), Math.max(0, Math.min(delay, 2_147_483_647)));
    return () => clearTimeout(timer);
  }, [account.identity]);
  useEffect(() => {
    const lifetime = new AbortController(); let busy = false;
    async function refresh() {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      try {
        const response = await fetch("/api/console/operator-identity", { cache: "no-store", signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(12000)]) });
        const body = await response.json();
        if (!response.ok) throw new Error("Identity unavailable");
        if (body.mode !== "disconnected-preview" && (body.mode !== "live" || !body.identity?.session || !body.identity?.source || !Array.isArray(body.identity?.access?.roles) || !Array.isArray(body.identity?.access?.authorities))) throw new Error("Identity unavailable");
        if (!lifetime.signal.aborted) setAccount(body.mode === "disconnected-preview" ? consoleOperatorAccountFixture : snapshot(body.identity as OperatorIdentitySnapshot));
      } catch { if (!lifetime.signal.aborted) setAccount(snapshot(unavailableOperatorIdentity)); }
      finally { busy = false; }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => { lifetime.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  // Never keep an authenticated badge beyond the source-issued expiry while hidden.
  const expires = Date.parse(account.identity.session.expiresAt ?? "");
  return account.identity.source.mode === "live" && (!Number.isFinite(expires) || expires <= Date.now())
    ? { ...account, identity: unavailableOperatorIdentity } : account;
}
