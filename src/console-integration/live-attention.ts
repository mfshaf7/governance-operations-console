import type { ConsoleAttentionCandidate, ConsoleAttentionSourceRegistration, ConsoleAttentionSourceSnapshot } from "./attention-contract.ts";
import type { ConsoleNavigationTarget } from "../console-architecture.ts";

export type ConsoleOwnerRead = Readonly<{ payload: unknown; state: "current" | "preview" | "unavailable"; capturedAt: string }>;
export type ConsoleOwnerReads = Readonly<Record<string, ConsoleOwnerRead | undefined>>;

export function currentOwnerRead(read: ConsoleOwnerRead | undefined, now = Date.now()) {
  const age = read ? now - Date.parse(read.capturedAt) : Infinity;
  return Boolean(read?.state === "current" && Number.isFinite(age) && age >= 0 && age <= 120_000);
}

export function ownerAttentionSnapshot(
  registration: ConsoleAttentionSourceRegistration,
  read: ConsoleOwnerRead | undefined,
  authority: string,
  project: (payload: unknown, observedAt: string) => readonly ConsoleAttentionCandidate[],
  now = Date.now(),
): ConsoleAttentionSourceSnapshot {
  const observedAt = new Date(now).toISOString();
  const source = { authority, freshness: "unavailable" as const, mode: "live" as const, observedAt: null, projectedAt: observedAt, ref: `console://attention/${registration.id}`, version: "unavailable" };
  if (!currentOwnerRead(read, now)) return { schemaVersion: 1, registration, candidates: [], source };
  try {
    const candidates = project(read!.payload, read!.capturedAt).map(candidate => ({
      ...candidate,
      source: { ...candidate.source, authority, freshness: "current" as const, mode: "live" as const, observedAt: read!.capturedAt, projectedAt: read!.capturedAt },
    }));
    return { schemaVersion: 1, registration, candidates, source: { ...source, freshness: "current", observedAt: read!.capturedAt, projectedAt: read!.capturedAt, version: read!.capturedAt } };
  } catch {
    return { schemaVersion: 1, registration, candidates: [], source };
  }
}

export function attentionRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Owner object missing");
  return value as Record<string, unknown>;
}
export function attentionRows(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Owner collection missing");
  return value;
}

export function ownerActionCandidate(input: Readonly<{
  id: string; title: string; subjectRef: string; move: string; reason: string;
  owner: string; observedAt: string; target: ConsoleNavigationTarget;
  recovery?: boolean; evidenceRefs?: readonly string[];
}>): ConsoleAttentionCandidate {
  return {
    schemaVersion: 1, candidateId: input.id, dedupeKey: input.id,
    attentionClass: input.recovery ? "recovery" : "required-action", urgency: input.recovery ? "high" : "normal", ownerRank: input.recovery ? 10 : 40,
    owner: { label: input.owner, ref: input.owner }, reason: input.reason,
    requiredMove: { id: input.id, label: input.move },
    subject: { kind: "owner-record", ref: input.subjectRef, title: input.title },
    source: { authority: input.owner, freshness: "current", mode: "live", observedAt: input.observedAt, projectedAt: input.observedAt, ref: input.subjectRef, version: input.observedAt },
    route: { availability: "available", label: `Open ${input.target.kind === "workspace" ? "Environment" : "owner"}`, entryIntent: { target: input.target, mode: input.recovery ? "resolve" : "review", subjectRef: input.subjectRef, requiredMoveRef: input.id }, externalHref: null, unavailableReason: null },
    dueAt: null, reviewAt: null, correlationRef: null, receiptRefs: [], evidenceRefs: input.evidenceRefs ?? [],
  };
}
