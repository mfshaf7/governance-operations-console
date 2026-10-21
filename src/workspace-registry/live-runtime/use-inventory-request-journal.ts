"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceRegistryTarget } from "../model/workspace-registry-types.ts";
import { assertInventoryRequestJournal, inventoryJournalEndpoint,
  type InventoryRequestFamily, type InventoryRequestJournal } from "../workspace-registry-request-journal.ts";

export function useInventoryRequestJournal(family: InventoryRequestFamily, target: WorkspaceRegistryTarget, fixtureMode: boolean) {
  const [page, setPage] = useState<InventoryRequestJournal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const generation = useRef(0);
  const { kind, name, record_id } = target;
  const load = useCallback(async (cursor?: string) => {
    if (fixtureMode) return;
    const current = ++generation.current;
    setPending(true);
    setError(null);
    setPage(null);
    try {
      const exactTarget = { kind, name, record_id };
      const response = await fetch(`/api/workspace-registry/${inventoryJournalEndpoint(family, exactTarget, cursor)}`, { cache: "no-store", method: "GET" });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error("Original Inventory requests are unavailable. Refresh before starting another review.");
      const next = assertInventoryRequestJournal(body, family, exactTarget);
      if (current === generation.current) setPage(next);
    } catch (caught) {
      if (current === generation.current) setError(caught instanceof Error ? caught.message : "Original Inventory requests are unavailable.");
    } finally {
      if (current === generation.current) setPending(false);
    }
  }, [family, kind, name, record_id, fixtureMode]);
  useEffect(() => {
    void load();
    return () => { generation.current += 1; };
  }, [load]);
  return { page, error, pending, load,
    canStart: fixtureMode || Boolean(page && !pending && !error && page.pending_request_count === 0) };
}

export type InventoryRequestJournalRuntime = ReturnType<typeof useInventoryRequestJournal>;
