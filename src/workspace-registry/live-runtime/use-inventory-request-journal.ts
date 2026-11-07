"use client";
import {readRegisterWindow} from '../../console-integration/registers/read-register-window.ts';
import {useRegisterPageSize} from '../../console-integration/registers/use-register-page-size.ts';

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceRegistryTarget } from "../model/workspace-registry-types.ts";
import { assertInventoryRequestJournal, inventoryJournalEndpoint,
  type InventoryRequestFamily, type InventoryRequestJournal } from "../workspace-registry-request-journal.ts";

type Position = { cursor: string | null; offset: number };
export function useInventoryRequestJournal(family: InventoryRequestFamily, target: WorkspaceRegistryTarget, fixtureMode: boolean) {
  const {pageSize}=useRegisterPageSize("Inventory request history");
  const [page, setPage] = useState<InventoryRequestJournal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [position, setPosition] = useState<Position>({cursor:null,offset:0});
  const [previous, setPrevious] = useState<Position[]>([]);
  const generation = useRef(0), active = useRef<AbortController | null>(null);
  const { kind, name, record_id } = target;
  const load = useCallback(async (cursor?: string, trail: Position[] = [], offset = 0) => {
    if (fixtureMode) return;
    const current = ++generation.current;
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    setPending(true); setError(null); setPage(null);
    try {
      const exactTarget = { kind, name, record_id };
      const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]);let metadata:InventoryRequestJournal|null=null;
      const window=await readRegisterWindow({cursor:cursor??null,pageSize,scope:JSON.stringify([family,exactTarget]),signal,identity:(row:InventoryRequestJournal["records"][number])=>row.request_id,readPage:async nativeCursor=>{
      const response = await fetch(`/api/workspace-registry/${inventoryJournalEndpoint(family, exactTarget, nativeCursor ?? undefined)}`, {
        cache: "no-store", method: "GET", signal,
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error("Original Inventory requests are unavailable. Retry this page before starting another review.");
      const next = assertInventoryRequestJournal(body, family, exactTarget);
        if(metadata&&(metadata.revision!==next.revision||metadata.pending_request_count!==next.pending_request_count))throw Error("The request journal changed. Refresh the first page.");metadata=next;
        return {rows:next.records,nextCursor:next.next_cursor};
      }});
      const next={...metadata!,records:window.rows,next_cursor:window.nextCursor};
      if (current === generation.current) { setPage(next);setPosition({cursor:cursor ?? null,offset});setPrevious(trail); }
    } catch (caught) {
      if (current === generation.current && !controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Original Inventory requests are unavailable.");
    } finally { if (current === generation.current) setPending(false); }
  }, [family, kind, name, record_id, fixtureMode,pageSize]);
  useEffect(() => { setPosition({cursor:null,offset:0});setPrevious([]);void load();return () => { generation.current += 1;active.current?.abort(); }; }, [load]);
  return { page, error, pending, load, offset:position.offset,pageNumber:previous.length+1,hasPrevious:previous.length>0,
    refresh:()=>load(position.cursor ?? undefined,previous,position.offset),
    next:()=>page?.next_cursor&&!pending?load(page.next_cursor,[...previous,position],position.offset+page.records.length):Promise.resolve(),
    back:()=>{const prior=previous.at(-1);return prior&&!pending?load(prior.cursor ?? undefined,previous.slice(0,-1),prior.offset):Promise.resolve();},
    canStart: fixtureMode || Boolean(page && !pending && !error && page.pending_request_count === 0) };
}

export type InventoryRequestJournalRuntime = ReturnType<typeof useInventoryRequestJournal>;
