"use client";

import { useEffect, useState } from "react";
import { TerasLoadingState } from "./teras-loading-state";

export function TerasAdvisorWaiting({ startedAt, timeoutMs, providerBudgetMs }: {
  startedAt: number; timeoutMs: number; providerBudgetMs?: number;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.ceil((providerBudgetMs ?? timeoutMs) / 60_000);
  return <TerasLoadingState inline showSlowHint={false} label="Waiting for advisor…" detail={<>
    <span aria-hidden="true">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} elapsed · </span>
    {minutes}-minute reasoning allowance.
  </>} />;
}
