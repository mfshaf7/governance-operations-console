import type { NativeLifecycleOutcome } from "../../../console-integration/native-lifecycle-outcome.ts";
import type { PrototypeRecord } from "../domain/prototype-types.ts";
import type { PrototypeClosureResult } from "../live-runtime/prototype-closure-live-types.ts";

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

// Called only after the normal owner-result validator. Keep every retained
// qualifying outcome, independently of the latest Closure's current action.
export function prototypeClosureLifecycleOutcome(record: PrototypeRecord, closure: PrototypeClosureResult): NativeLifecycleOutcome[] {
  if (record.id !== `prototype-${closure.prototype_id}` || closure.status !== "succeeded" || closure.action !== "graduate-source" || !closure.receipt || !closure.source_snapshot || closure.receipt.outcome !== "completed" || closure.receipt.observed_lifecycle !== "graduated") return [];
  const authority = closure.resolved_authority;
  const deliveryReceipt = authority?.verification?.state === "accepted"
    ? authority.verification.evidence_refs.find(ref => /^oos:\/\/receipts\/prototype-delivery-application\/[a-f0-9]{64}$/.test(ref)) : null;
  if (!deliveryReceipt) return []; // Source-owner graduation alone is not a Delivery handoff.
  const readiness = object(object(closure.readiness).readiness);
  const evidence = Array.isArray(readiness.evidence) ? readiness.evidence.map(object) : [];
  const acceptedTarget = evidence.find(entry => entry.field === "accepted_delivery_target_receipt_ref" && entry.state === "accepted" && entry.owner_ref === "operator-orchestration-service" && entry.prototype_id === closure.prototype_id && entry.ref === deliveryReceipt && entry.digest === `sha256:${deliveryReceipt.split("/").at(-1)}` && typeof entry.subject_ref === "string" && /^openproject:\/\/work_packages\/[1-9][0-9]*$/.test(entry.subject_ref));
  return [{
    id: `native:prototype-to-delivery:${closure.receipt.receipt_id}`, routeId: "prototype-to-delivery",
    sourceId: record.id, sourceVersion: closure.source_snapshot.source_revision, title: record.name,
    owner: "workspace-prototype-studio", sourceRef: record.sourceRef,
    targetRef: acceptedTarget ? String(acceptedTarget.subject_ref) : authority?.target_delivery_ref ?? null,
    receiptRef: deliveryReceipt, recordedAt: closure.receipt.recorded_at,
    observationKind: "owner-confirmation", evidenceRefs: [closure.receipt.receipt_id, deliveryReceipt],
    detail: "Retained Prototype Closure confirms graduation and references the accepted native Delivery application. This is the owner confirmation time; original target application time and unprojected journal controls are not inferred.",
  }];
}
