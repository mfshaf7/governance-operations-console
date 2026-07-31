import assert from "node:assert/strict";
import test from "node:test";

import { projectPrototypeEffectiveRecord } from "../../src/domain-workspaces/prototype/local-runtime/prototype-effective-projection.ts";
import {
  getPrototypeRuntimeProjectionSnapshot,
  submitPrototypeProjectionCommand,
  submitPrototypeRequestCommand,
  subscribePrototypeRuntimeProjection,
} from "../../src/domain-workspaces/prototype/local-runtime/prototype-runtime.ts";
import { runPrototypeLandingSimulation } from "../../src/domain-workspaces/prototype/local-runtime/prototype-landing-runtime.ts";
import { getPrototypeWorkspaceReadModel } from "../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts";
import {
  prototypeLandingDraftFromRecord,
  prototypeLandingDraftKey,
} from "../../src/domain-workspaces/prototype/work-model/workflows/landing/prototype-landing-model.ts";
import { prototypeBaselineEvidenceAssessment } from "../../src/domain-workspaces/prototype/work-model/workflows/baseline-promotion/prototype-baseline-promotion-model.ts";

test("Prototype request capture is idempotent and retains the submitted draft", async () => {
  const draft = {
    basePlatform: "vite-react",
    dataMode: "synthetic",
    mutationBoundary: "prototype-local",
    name: "Runtime Contract Fixture",
    owner: "Prototype Studio",
    previewNeed: "local-dev-server",
    prototypeObjective: "Prove the typed Prototype runtime contract.",
    sourceContext: "Local synthetic runtime test.",
    sourceHome: "new-prototype-folder",
    supportProfile: "local-runtime",
    visibilityTier: "private-internal",
  };
  const options = {
    requestId: "prototype-runtime-test-request",
    submittedAt: "2026-07-11T01:00:00.000Z",
  };
  const first = await submitPrototypeRequestCommand(draft, options);
  const snapshotAfterFirst = getPrototypeRuntimeProjectionSnapshot();
  let duplicateEmissions = 0;
  const unsubscribe = subscribePrototypeRuntimeProjection(() => {
    duplicateEmissions += 1;
  });
  const retry = await submitPrototypeRequestCommand(draft, options);
  unsubscribe();
  const snapshot = getPrototypeRuntimeProjectionSnapshot();

  assert.equal(retry.record.id, first.record.id);
  assert.equal(retry.receipt.receiptId, first.receipt.receiptId);
  assert.equal(snapshot, snapshotAfterFirst);
  assert.equal(duplicateEmissions, 0);
  assert.deepEqual(first.receipt.appliedInput.draft, draft);
  assert.equal(
    snapshot.localRequestRecords.filter(
      (record) => record.id === first.record.id,
    ).length,
    1,
  );
  assert.equal(snapshot.receiptsByRecord[first.record.id].length, 1);

  await assert.rejects(
    submitPrototypeRequestCommand(
      { ...draft, name: "Different Runtime Contract Fixture" },
      options,
    ),
    /cannot be reused with different input/,
  );
});

test("Prototype Candidate Promotion applies through an immutable typed receipt", async () => {
  const record = getPrototypeWorkspaceReadModel().records.find(
    (candidate) => candidate.id === "prototype-candidate-promotion-fixture",
  );
  assert.ok(record);

  const input = {
    audience: {
      kind: "internal-user",
      label: "Prototype operator",
    },
    decision: "promote-candidate",
    objective: "Prove Candidate Promotion semantic projection.",
    proof: {
      criterion: "Candidate workflow and receipt projection tests.",
      method: "technical-validation",
    },
    scope: {
      excluded: ["Movement authority", "Platform authority"],
      included: ["Prototype-local Candidate Promotion"],
    },
  };
  const result = await submitPrototypeProjectionCommand({
    commandId: "record-candidate-promotion",
    input,
    record,
    submittedAt: "2026-07-11T01:10:00.000Z",
  });
  const projected = projectPrototypeEffectiveRecord({
    receipts: [result.receipt],
    record,
  });

  assert.equal(result.receipt.commandName, "prototype.record-candidate-promotion");
  assert.deepEqual(result.receipt.appliedInput, input);
  assert.equal(projected.lifecycle, "candidate");
  assert.equal(projected.candidate.audience.label, "Prototype operator");
  assert.equal(projected.candidate.lastReceiptRef.includes(result.receipt.receiptId), true);
  assert.equal(
    projected.baseline.missingItems.includes("candidate promotion receipt"),
    false,
  );

  const invalidBlock = await submitPrototypeProjectionCommand({
    commandId: "record-candidate-promotion",
    input: { ...input, decision: "block-promotion" },
    record,
    submittedAt: "2026-07-11T01:11:00.000Z",
  });

  assert.equal(invalidBlock.projected, false);
  assert.equal(invalidBlock.receipt.resultState, "blocked");
});

test("Prototype Landing applies only the matching Landing Run receipt", async () => {
  const request = await submitPrototypeRequestCommand(
    {
      basePlatform: "vite-react",
      dataMode: "synthetic",
      mutationBoundary: "prototype-local",
      name: "Landing Receipt Fixture",
      owner: "Prototype Studio",
      previewNeed: "local-dev-server",
      prototypeObjective: "Prove Landing Run receipt binding.",
      sourceContext: "Local synthetic Landing test.",
      sourceHome: "new-prototype-folder",
      supportProfile: "local-runtime",
      visibilityTier: "private-internal",
    },
    {
      requestId: "prototype-landing-binding-request",
      submittedAt: "2026-07-11T01:20:00.000Z",
    },
  );
  const draft = prototypeLandingDraftFromRecord(request.record);
  const draftKey = prototypeLandingDraftKey(draft);
  const simulation = await runPrototypeLandingSimulation({
    draft,
    draftKey,
    record: request.record,
  });

  await assert.rejects(
    submitPrototypeProjectionCommand({
      commandId: "land-prototype-request",
      input: {
        draft,
        simulationDraftKey: simulation.draftKey,
        simulationReceiptId: "missing-landing-receipt",
      },
      record: request.record,
    }),
    /current Landing Run receipt/,
  );

  const result = await submitPrototypeProjectionCommand({
    commandId: "land-prototype-request",
    input: {
      draft,
      simulationDraftKey: simulation.draftKey,
      simulationReceiptId: simulation.receipt.receipt.receiptId,
    },
    record: request.record,
    submittedAt: "2026-07-11T01:21:00.000Z",
  });
  const projected = projectPrototypeEffectiveRecord({
    receipts: [result.receipt],
    record: request.record,
  });

  assert.equal(projected.landing.state, "landed");
  assert.equal(
    projected.openIssues.some((issue) => issue.id === "issue-shape-request"),
    false,
  );
  assert.equal(projected.baseline.missingItems.includes("landing receipt"), false);
  assert.equal(
    projected.landing.lastLandingReceiptRef.includes(result.receipt.receiptId),
    true,
  );
  assert.equal(
    result.receipt.appliedInput.simulationReceiptId,
    simulation.receipt.receipt.receiptId,
  );
});

test("Prototype Baseline and impacted Closeout receipts retain their operator inputs", async () => {
  const record = getPrototypeWorkspaceReadModel().records.find(
    (candidate) => candidate.id === "prototype-governance-console",
  );
  assert.ok(record);

  const baselineInput = {
    baselineStatement: "The local console baseline is accepted for Prototype Studio proof.",
    baselineTitle: "Governance Operations Console baseline",
    decision: "approve-baseline",
    evidenceDisposition: "Current preview and typecheck refs are accepted locally.",
    issueDisposition: "Open follow-up items remain visible after baseline acceptance.",
  };
  const baselineResult = await submitPrototypeProjectionCommand({
    commandId: "record-baseline-promotion",
    input: baselineInput,
    record,
    submittedAt: "2026-07-11T01:30:00.000Z",
  });

  assert.deepEqual(baselineResult.receipt.appliedInput, baselineInput);
  assert.equal(baselineResult.nextRecord.lifecycle, "baseline-approved");
  assert.equal(
    baselineResult.nextRecord.baseline.baselineTitle,
    baselineInput.baselineTitle,
  );
  assert.equal(
    baselineResult.nextRecord.baseline.acceptedSummary,
    record.candidate.scope.included.join("; "),
  );
  assert.equal(
    baselineResult.nextRecord.baseline.excludedSummary,
    record.candidate.scope.excluded.join("; "),
  );
  assert.equal(
    baselineResult.nextRecord.movementRequest.gateSnapshot.find(
      (gate) => gate.gateKind === "prototype baseline evidence",
    ).status,
    "ready",
  );

  const closeoutInput = {
    decision: "prepare-impacted-request",
    explanation: "Linked delivery records require Movement Control review before closeout.",
    reason: "operator-decision",
    retention: "archive-source",
    supersededBy: "",
  };
  const closeoutResult = await submitPrototypeProjectionCommand({
    commandId: "record-closeout-retirement",
    input: closeoutInput,
    record,
    submittedAt: "2026-07-11T01:31:00.000Z",
  });

  assert.deepEqual(closeoutResult.receipt.appliedInput, closeoutInput);
  assert.equal(
    closeoutResult.nextRecord.movementRequest.requestReason,
    closeoutInput.explanation,
  );
  assert.equal(closeoutResult.nextRecord.movementRequest.movementType, "retire");
});

test("Prototype Baseline does not treat setup and validation plans as evidence", () => {
  const sourceRecord = getPrototypeWorkspaceReadModel().records.find(
    (candidate) => candidate.id === "prototype-governance-console",
  );
  assert.ok(sourceRecord);

  const record = {
    ...sourceRecord,
    baseline: {
      ...sourceRecord.baseline,
      evidenceRefs: [],
    },
    landing: {
      ...sourceRecord.landing,
      setupItems: ["planned setup"],
      validationPlan: ["planned validation"],
    },
  };
  const assessment = prototypeBaselineEvidenceAssessment(record);

  assert.equal(assessment.retainedEvidenceReady, false);
  assert.equal(assessment.ready, false);
  assert.equal(
    assessment.missingRequirements.includes("retained evidence"),
    true,
  );
});
