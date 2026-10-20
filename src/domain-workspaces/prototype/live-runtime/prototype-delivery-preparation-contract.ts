import type { PrototypeDeliveryPreparation } from "./prototype-source-types.ts";

// Thin validation of intent only. Native Studio still proves the Baseline,
// Git provenance and deterministic packet. No caller-supplied receipt is read.
export function assertPrototypeDeliveryPreparation(value: unknown): PrototypeDeliveryPreparation {
  const root = object(value, ["kind", "work", "custody", "evidence_refs", "rationale", "decision_ref"]);
  const work = object(root.work, ["title", "objective", "included_scope", "excluded_scope", "remaining_work"]);
  const custody = object(root.custody, ["classification", "repository_mode", "repository_gate_state", "owner", "source_ref", "rationale"]);
  if (root.kind !== "delivery-packet") invalid();
  const classification = custody.classification;
  const source = classification === "existing-repo" || classification === "new-repo-required";
  if (source ? custody.repository_mode !== (classification === "existing-repo" ? "existing" : "new") || custody.repository_gate_state !== "resolved"
    : !["non-source-work", "platform-internal"].includes(String(classification)) || custody.repository_mode !== "not-required" || custody.repository_gate_state !== "not-required" || custody.source_ref !== null) invalid();
  const decision = text(root.decision_ref, 512);
  if (!/^record:\/\/[A-Za-z0-9._:/-]+$/.test(decision)) invalid();
  const result = { kind: "delivery-packet" as const, work: { title: text(work.title), objective: text(work.objective),
    included_scope: list(work.included_scope, true), excluded_scope: list(work.excluded_scope), remaining_work: list(work.remaining_work, true) },
    custody: { classification, repository_mode: custody.repository_mode, repository_gate_state: custody.repository_gate_state,
      owner: identifier(custody.owner), source_ref: source ? identifier(custody.source_ref) : null, rationale: text(custody.rationale) },
    evidence_refs: list(root.evidence_refs, true, identifier), rationale: text(root.rationale), decision_ref: decision };
  if (new TextEncoder().encode(JSON.stringify(result)).length > 65536) invalid();
  return result as PrototypeDeliveryPreparation;
}
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join(",") !== keys.sort().join(",")) invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 10000): string {
  if (typeof value !== "string" || !value.length || value.length > max) invalid();
  try { encodeURIComponent(value); } catch { invalid(); }
  return value;
}
function identifier(value: unknown): string { const result = text(value, 512); if (!/^[A-Za-z0-9][A-Za-z0-9._:/@+\-]{0,511}$/.test(result)) invalid(); return result; }
function list(value: unknown, required = false, parse: (value: unknown) => string = text): string[] {
  if (!Array.isArray(value) || value.length > 200 || (required && !value.length)) invalid();
  const result = value.map(item => parse(item)); if (new Set(result).size !== result.length) invalid(); return result;
}
function invalid(): never { throw new Error("Delivery preparation must retain its exact bounded work, resolved custody, evidence and operator decision; no caller baseline or Git coordinates."); }
