import assert from "node:assert/strict";
import test from "node:test";

import { prototypeWorkspaceReadModel } from "../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts";
import {
  prototypeCandidatePromotionInputComplete,
  prototypeRecordAfterCandidatePromotion,
} from "../../src/domain-workspaces/prototype/work-model/workflows/candidate-promotion/prototype-candidate-promotion-model.ts";
import { baselinePromotionDraftFromRecord } from "../../src/domain-workspaces/prototype/presentation/workflows/baseline-promotion/prototype-baseline-promotion-view-model.ts";
import { candidatePromotionDraftFromRecord } from "../../src/domain-workspaces/prototype/presentation/workflows/candidate-promotion/prototype-candidate-promotion-view-model.ts";
import { candidateAdvisorFields, applyCandidateAdvisorEdits, baselineAdvisorFields, applyBaselineAdvisorEdits } from "../../src/domain-workspaces/prototype/presentation/workflows/shared/prototype-advisor-fields.ts";

test("governed maturity drafts expose narrative fields and preserve manual fields and separate promotion decisions", () => {
  const draft = candidatePromotionDraftFromRecord(null);
  draft.objective = "Manual objective"; draft.scope.included = ["Manual first line", "", ""];
  const fields = candidateAdvisorFields(draft);
  assert.ok(!fields.some((field) => field.key === "decision"));
  const next = applyCandidateAdvisorEdits(draft, [{ field: "proof.criterion", value: "Demonstrate the requested workflow" }]);
  assert.equal(next.objective, "Manual objective"); assert.equal(next.decision, draft.decision);
  assert.deepEqual(next.scope.included, draft.scope.included);
  assert.deepEqual(applyCandidateAdvisorEdits(next, [{ field: "scope.included", value: fields.find((field) => field.key === "scope.included").value }]).scope.included, draft.scope.included);
  assert.throws(() => applyCandidateAdvisorEdits(draft, [{ field: "objective", value: "Partial overwrite" }, { field: "scope.included", value: "x".repeat(121) }]));
  assert.equal(draft.objective, "Manual objective");
  assert.throws(() => applyCandidateAdvisorEdits(draft, [{ field: "decision", value: "promote-candidate" }]));
  const baseline = baselinePromotionDraftFromRecord(null);
  assert.ok(!baselineAdvisorFields(baseline).some((field) => field.key === "decision"));
  assert.equal(applyBaselineAdvisorEdits(baseline, [{ field: "baselineTitle", value: "Requested title" }]).decision, baseline.decision);
  assert.throws(() => applyBaselineAdvisorEdits(baseline, [{ field: "decision", value: "approve-baseline" }]));
});

test("Candidate Promotion requires structured audience, proof, and scope truth", () => {
  const record = prototypeWorkspaceReadModel.records.find(
    (candidate) => candidate.id === "prototype-candidate-promotion-fixture",
  );

  assert.ok(record);
  const draft = candidatePromotionDraftFromRecord(record);

  assert.deepEqual(draft.audience, {
    kind: "unassigned",
    label: "",
  });
  assert.deepEqual(draft.proof, {
    criterion: "",
    method: "unassigned",
  });
  assert.deepEqual(draft.scope, {
    excluded: [""],
    included: [""],
  });
  assert.equal(
    draft.audience.label,
    "",
    "record owner must not be reused as the intended audience",
  );
  assert.equal(
    draft.proof.criterion,
    "",
    "Landing evidence must not be reused as Candidate success proof",
  );

  assert.equal(
    prototypeCandidatePromotionInputComplete({
      audience: {
        kind: "unassigned",
        label: "Prototype operator",
      },
      decision: "promote-candidate",
      objective: "Prove the Candidate Promotion contract.",
      proof: {
        criterion: "Focused semantic tests pass.",
        method: "technical-validation",
      },
      scope: {
        excluded: ["Movement approval"],
        included: ["Candidate workflow"],
      },
    }),
    false,
  );
});

test("Candidate Promotion normalizes structured scope for Baseline consumption", () => {
  const record = prototypeWorkspaceReadModel.records.find(
    (candidate) => candidate.id === "prototype-candidate-promotion-fixture",
  );

  assert.ok(record);
  const input = {
    audience: {
      kind: "internal-user",
      label: " Prototype operator ",
    },
    decision: "promote-candidate",
    objective: " Prove the Candidate Promotion contract. ",
    proof: {
      criterion: " Focused semantic tests pass. ",
      method: "technical-validation",
    },
    scope: {
      excluded: ["Movement approval", "", "Movement approval"],
      included: ["Candidate workflow", "Semantic receipt", "Candidate workflow"],
    },
  };

  assert.equal(prototypeCandidatePromotionInputComplete(input), true);
  const projected = prototypeRecordAfterCandidatePromotion(
    record,
    "prototype-local://candidate/structured-receipt",
    input,
  );

  assert.equal(projected.lifecycle, "candidate");
  assert.deepEqual(projected.candidate.audience, {
    kind: "internal-user",
    label: "Prototype operator",
  });
  assert.deepEqual(projected.candidate.proof, {
    criterion: "Focused semantic tests pass.",
    method: "technical-validation",
  });
  assert.deepEqual(projected.candidate.scope, {
    excluded: ["Movement approval"],
    included: ["Candidate workflow", "Semantic receipt"],
  });

  const baselineDraft = baselinePromotionDraftFromRecord(projected);
  assert.equal(baselineDraft.baselineTitle, `${projected.name} baseline`);
  assert.equal(Object.hasOwn(baselineDraft, "acceptedSummary"), false);
  assert.equal(Object.hasOwn(baselineDraft, "excludedSummary"), false);
});
