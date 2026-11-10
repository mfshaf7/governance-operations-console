import type { PrototypeRecord } from "../../read-model/prototype-workspace-read-model.ts";
import type { PrototypeSourceProjection } from "../../live-runtime/prototype-source-types.ts";

export function prototypeSourceEligibility(record: PrototypeRecord): string | null {
  if (!/^record:\/\/prototypes\//.test(record.sourceRef) || record.landing.state !== "landed") return "Complete Landing before starting source work.";
  if (!["exploring", "candidate", "baseline-approved"].includes(record.lifecycle)) return "Source has moved beyond incubation. Inspect retained work here and continue changes through Delivery.";
  if (!record.sourceEvidence || !["create-studio-source", "use-existing-studio-source", "import-to-studio"].includes(record.sourceEvidence.posture)) return "This source is maintained outside Studio. Continue changes in its registered repository.";
  if (!["mock", "synthetic"].includes(record.dataMode) || !["private-internal", "operator-review"].includes(record.visibilityTier)) return "This data or visibility setting is outside the current Studio authoring boundary.";
  return null;
}

export function prototypeSourceOutcomeUncertain(current: PrototypeSourceProjection | null) {
  return Boolean(current && (["accepted", "generating", "applying", "apply-unknown"].includes(current.realization?.state ?? "") ||
    Object.values(current.source_delivery).some(value => value && ["pending", "unknown"].includes(value.state))));
}

export function prototypeSourceWorkLabel(state: string) {
  const labels: Record<string, string> = {
    "source-work": "Source work in progress", "succeeded": "Source work completed", "source-authorization-required": "Source access required",
    "not-started": "Ready to begin", "accepted": "Request accepted", "generating": "Preparing a draft", "draft-ready": "Draft ready for inspection",
    "failed": "Attempt failed", "cancelled": "Attempt cancelled", "applying": "Applying accepted source", "apply-unknown": "Source outcome needs recovery",
    "applied": "Source applied", "source-publish-required": "Ready to publish", "prototype-source-retry-available": "A retry is available",
  };
  return labels[state] ?? "Inspect retained source work";
}
