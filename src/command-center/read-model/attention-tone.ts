import type {
  ConsoleAttentionCandidate,
  ConsoleAttentionClass,
  ConsoleAttentionFreshness,
} from "../../console-integration/attention-contract.ts";

type AttentionTone = "danger" | "info" | "ok" | "stale" | "warn";

export function attentionClassTone(attentionClass: ConsoleAttentionClass): AttentionTone {
  if (attentionClass === "recovery") return "danger";
  if (attentionClass === "decision" || attentionClass === "review") return "warn";
  return "info";
}

export function attentionFreshnessTone(freshness: ConsoleAttentionFreshness): AttentionTone {
  if (freshness === "current") return "ok";
  if (freshness === "unavailable") return "danger";
  if (freshness === "loading") return "info";
  return "stale";
}

// Item colour identifies its category. Urgency remains an independent label
// and ranking input; source reliability takes precedence over category colour.
export function attentionCandidateTone(candidate: ConsoleAttentionCandidate): AttentionTone {
  return candidate.source.freshness === "current"
    ? attentionClassTone(candidate.attentionClass)
    : attentionFreshnessTone(candidate.source.freshness);
}
