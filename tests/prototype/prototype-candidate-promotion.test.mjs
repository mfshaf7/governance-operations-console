import assert from "node:assert/strict";
import test from "node:test";

import { prototypeWorkspaceReadModel } from "../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts";
import {
  prototypeCandidatePromotionInputComplete,
  prototypeRecordAfterCandidatePromotion,
} from "../../src/domain-workspaces/prototype/work-model/workflows/candidate-promotion/prototype-candidate-promotion-model.ts";
import { baselinePromotionDraftFromRecord } from "../../src/domain-workspaces/prototype/presentation/workflows/baseline-promotion/prototype-baseline-promotion-view-model.ts";
import { candidatePromotionDraftFromRecord } from "../../src/domain-workspaces/prototype/presentation/workflows/candidate-promotion/prototype-candidate-promotion-view-model.ts";

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
