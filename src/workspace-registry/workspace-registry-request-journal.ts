import {
  assertWorkspaceInventoryLifecycleRequestId,
  assertWorkspaceInventoryRequestId,
  assertWorkspaceRegistryTarget,
  WorkspaceRegistryContractError,
} from "./workspace-registry-contract.ts";
import type {
  WorkspaceInventoryLifecycleAction,
  WorkspaceInventoryStatus,
  WorkspaceRegistryTarget,
} from "./model/workspace-registry-types.ts";

export type InventoryRequestFamily = "promotion" | "lifecycle";
export type InventoryRequestLocator = Readonly<{
  request_id: string; status: WorkspaceInventoryStatus; revision: number;
  requested_at: string; updated_at: string; action?: WorkspaceInventoryLifecycleAction;
}>;
export type InventoryRequestJournal = Readonly<{
  schema_version: 1; workflow_id: "workspace-inventory-promotion" | "workspace-inventory-lifecycle";
  target: WorkspaceRegistryTarget; revision: number; pending_request_count: number;
  updated_at: string | null; records: readonly InventoryRequestLocator[];
  next_cursor: string | null; canonical_mutation: false;
}>;
const statuses = new Set(["accepted", "evaluating", "preparing", "review-required", "cancelling", "cancelled", "rejected", "blocked", "stale", "succeeded"]);
const actions = new Set(["update", "suspend", "restore", "retire"]);
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  return value as Record<string, unknown>;
}
function invalid() { return new WorkspaceRegistryContractError("Inventory original-request journal is invalid or mismatched."); }
function date(value: unknown): value is string { return typeof value === "string" && Number.isFinite(Date.parse(value)); }

export function assertInventoryRequestJournal(value: unknown, family: InventoryRequestFamily, expected: WorkspaceRegistryTarget): InventoryRequestJournal {
  if (family !== "promotion" && family !== "lifecycle") throw invalid();
  const body = object(value);
  const target = assertWorkspaceRegistryTarget(body.target);
  if (Object.keys(body).sort().join(",") !== "canonical_mutation,next_cursor,pending_request_count,records,revision,schema_version,target,updated_at,workflow_id" ||
      body.schema_version !== 1 || body.workflow_id !== `workspace-inventory-${family}` || body.canonical_mutation !== false ||
      target.kind !== expected.kind || target.name !== expected.name || target.record_id !== expected.record_id ||
      !Number.isInteger(body.revision) || Number(body.revision) < 0 || !Number.isInteger(body.pending_request_count) || Number(body.pending_request_count) < 0 ||
      (body.updated_at !== null && !date(body.updated_at)) ||
      (body.next_cursor !== null && (typeof body.next_cursor !== "string" || !/^[0-9a-f]{64}$/.test(body.next_cursor))) ||
      !Array.isArray(body.records) || body.records.length > 25 || new TextEncoder().encode(JSON.stringify(body.records)).length > 32768) throw invalid();
  const ids = new Set<string>();
  const records = body.records.map(value => {
    const row = object(value);
    if (Object.keys(row).sort().join(",") !== (family === "lifecycle" ? "action,request_id,requested_at,revision,status,updated_at" : "request_id,requested_at,revision,status,updated_at") ||
        !statuses.has(String(row.status)) || !Number.isInteger(row.revision) || Number(row.revision) < 1 ||
        !date(row.requested_at) || !date(row.updated_at) || (family === "lifecycle" && !actions.has(String(row.action)))) throw invalid();
    const requestId = family === "lifecycle" ? assertWorkspaceInventoryLifecycleRequestId(row.request_id) : assertWorkspaceInventoryRequestId(row.request_id);
    if (ids.has(requestId)) throw invalid();
    ids.add(requestId);
    return { request_id: requestId, status: row.status as WorkspaceInventoryStatus, revision: Number(row.revision),
      requested_at: row.requested_at, updated_at: row.updated_at,
      ...(family === "lifecycle" ? { action: row.action as WorkspaceInventoryLifecycleAction } : {}) };
  });
  const terminal = new Set(["succeeded", "cancelled", "rejected", "blocked", "stale"]);
  if ((body.next_cursor !== null && !records.length) || (records.length && body.updated_at === null) ||
      Number(body.revision) < records.reduce((sum, row) => sum + row.revision, 0) ||
      Number(body.pending_request_count) < records.filter(row => !terminal.has(row.status)).length ||
      Number(body.pending_request_count) > Number(body.revision)) throw invalid();
  return { schema_version: 1, workflow_id: body.workflow_id as InventoryRequestJournal["workflow_id"], target,
    canonical_mutation: false, revision: Number(body.revision), pending_request_count: Number(body.pending_request_count),
    updated_at: body.updated_at as string | null, records, next_cursor: body.next_cursor as string | null };
}

export function inventoryJournalEndpoint(family: InventoryRequestFamily, target: WorkspaceRegistryTarget, cursor?: string) {
  assertWorkspaceRegistryTarget(target);
  if (family !== "promotion" && family !== "lifecycle") throw invalid();
  if (cursor !== undefined && !/^[0-9a-f]{64}$/.test(cursor)) throw invalid();
  const query = new URLSearchParams({ target_kind: target.kind, target_name: target.name });
  if (cursor !== undefined) query.set("cursor", cursor);
  return `${family === "lifecycle" ? "lifecycle/requests" : "promotions"}?${query}`;
}
