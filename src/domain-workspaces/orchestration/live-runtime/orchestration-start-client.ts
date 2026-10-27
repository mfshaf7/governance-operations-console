import { assertOosOrchestrationRun } from "./orchestration-live-contract.ts";
import { assertOrchestrationStartContext, assertOrchestrationStartReceipt, type OrchestrationStartDraft } from "../work-model/run-start/run-start-model.ts";

export class OrchestrationStartError extends Error {
  readonly code: string;
  readonly status: number | null;
  constructor(message: string, code: string, status: number | null) { super(message); this.code = code; this.status = status; }
}
export async function fetchOrchestrationStartContext(initiativeId: number) {
  return assertOrchestrationStartContext(await jsonRequest(`/api/orchestration/start?initiativeId=${initiativeId}`));
}
export async function submitOrchestrationStart(draft: OrchestrationStartDraft) {
  return assertOrchestrationStartReceipt(await jsonRequest("/api/orchestration/start", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
  }), draft.requestId);
}
export async function fetchOriginalOrchestrationRun(runId: string) {
  const run = assertOosOrchestrationRun(await jsonRequest(`/api/orchestration/runs/${encodeURIComponent(runId)}`));
  if (run.run_id !== runId) throw new Error("The returned original run identity does not match.");
  return run;
}
async function jsonRequest(url: string, init: RequestInit = {}) {
  let response: Response;
  try { response = await fetch(url, { ...init, cache: "no-store" }); }
  catch { throw new OrchestrationStartError("The owner outcome is unavailable. Retain the original run reference.", "orchestration_outcome_unknown", null); }
  const value = await response.json().catch(() => null);
  if (!response.ok) {
    const body = value && typeof value === "object" ? value as Record<string, unknown> : {};
    throw new OrchestrationStartError(typeof body.error === "string" ? body.error : "Run truth is unavailable.", typeof body.code === "string" ? body.code : "orchestration_outcome_unknown", response.status);
  }
  return value;
}
