import type { AdvisorEdit, AdvisorField } from "@/agent-console/model/advisor-drafts";
import { candidateAudienceOptions, candidateProofMethodOptions, type PrototypeCandidatePromotionDraft } from "../candidate-promotion/prototype-candidate-promotion-view-model.ts";
import type { PrototypeBaselinePromotionDraft } from "../baseline-promotion/prototype-baseline-promotion-view-model.ts";

export function candidateAdvisorFields(draft: PrototypeCandidatePromotionDraft): AdvisorField[] {
  return [
    { key: "objective", label: "Objective", value: draft.objective, maxLength: 240 },
    { key: "audience.kind", label: "Audience classification", value: draft.audience.kind, allowedValues: candidateAudienceOptions.map((item) => item.value) },
    { key: "audience.label", label: "Audience", value: draft.audience.label, maxLength: 96 },
    { key: "proof.method", label: "Proof method", value: draft.proof.method, allowedValues: candidateProofMethodOptions.map((item) => item.value) },
    { key: "proof.criterion", label: "Proof criterion", value: draft.proof.criterion, maxLength: 180 },
    { key: "scope.included", label: "Included scope: at most four lines, each at most 120 characters", value: draft.scope.included.join("\n"), maxLength: 483 },
    { key: "scope.excluded", label: "Excluded scope: at most four lines, each at most 120 characters", value: draft.scope.excluded.join("\n"), maxLength: 483 },
  ];
}

export function applyCandidateAdvisorEdits(draft: PrototypeCandidatePromotionDraft, edits: AdvisorEdit[]) {
  const next = structuredClone(draft);
  for (const edit of edits) {
    const value = String(edit.value);
    switch (edit.field) {
      case "objective": next.objective = value; break;
      case "audience.kind": next.audience.kind = value as typeof next.audience.kind; break;
      case "audience.label": next.audience.label = value; break;
      case "proof.method": next.proof.method = value as typeof next.proof.method; break;
      case "proof.criterion": next.proof.criterion = value; break;
      case "scope.included": case "scope.excluded": {
        const lines = value.split("\n");
        if (lines.length > 4 || lines.some((line) => line.length > 120)) throw Error("Candidate scope requires at most four items of 120 characters each.");
        next.scope[edit.field === "scope.included" ? "included" : "excluded"] = lines; break;
      }
      default: throw Error("This Candidate field is not available to the advisor.");
    }
  }
  return next;
}

export const baselineAdvisorKeys = ["baselineTitle", "baselineStatement", "evidenceDisposition", "issueDisposition"] as const;
export function baselineAdvisorFields(draft: PrototypeBaselinePromotionDraft): AdvisorField[] {
  return baselineAdvisorKeys.map((key) => ({ key, label: key.replace(/([A-Z])/g, " $1"), value: draft[key] }));
}
export function applyBaselineAdvisorEdits(draft: PrototypeBaselinePromotionDraft, edits: AdvisorEdit[]) {
  const next = { ...draft };
  for (const edit of edits) {
    if (!(baselineAdvisorKeys as readonly string[]).includes(edit.field)) throw Error("This Baseline field is not available to the advisor.");
    next[edit.field as typeof baselineAdvisorKeys[number]] = String(edit.value);
  }
  return next;
}
