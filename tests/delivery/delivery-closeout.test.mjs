import assert from "node:assert/strict";
import test from "node:test";

import { submitDeliveryCloseoutCommand } from "../../src/domain-workspaces/delivery/local-runtime/commands/delivery-closeout-runtime.ts";
import { deliveryCloseoutBlockers } from "../../src/domain-workspaces/delivery/work-model/closeout/delivery-closeout-model.ts";

test("Delivery closeout blocks packages without an Execution handoff", () => {
  const deliveryPackage = executionPackage("closeout-blocked");
  delete deliveryPackage.execution_handoff;
  deliveryPackage.workflow_phase = "refinement";
  const closeout = closeoutCommand(deliveryPackage, { kind: "none" });
  closeout.readiness.readyForCloseout = false;

  const blockers = deliveryCloseoutBlockers({ closeout, deliveryPackage });

  assert.ok(
    blockers.includes("Delivery closeout requires an execution-phase package."),
  );
  assert.ok(
    blockers.includes(
      "Delivery closeout requires an accepted Refinement-to-Execution handoff.",
    ),
  );
  assert.ok(
    blockers.includes("The initiative is not ready for final closeout."),
  );
});

test("ordinary Delivery closeout always records history and replays idempotently", async () => {
  const deliveryPackage = executionPackage("closeout-ordinary");
  const closeout = closeoutCommand(deliveryPackage, { kind: "none" });
  const submittedAt = "2026-07-30T10:00:00.000Z";

  const first = await submitDeliveryCloseoutCommand({
    closeout,
    deliveryPackage,
    submittedAt,
  });
  const replay = await submitDeliveryCloseoutCommand({
    closeout,
    deliveryPackage,
    submittedAt: "2026-07-30T10:05:00.000Z",
  });

  assert.equal(first.run.state, "completed");
  assert.ok(first.receipt);
  assert.equal(first.receipt.receipt.outcome.impact.kind, "none");
  assert.match(
    first.receipt.receipt.outcome.historyRef,
    /^prototype-local:\/\/delivery\/history\/closeout-ordinary\//,
  );
  assert.equal(replay.run.runId, first.run.runId);
  assert.equal(replay.receipt?.receiptId, first.receipt.receiptId);
});

test("workspace entrant closeout binds the candidate to outcome evidence", async () => {
  const deliveryPackage = executionPackage("closeout-entrant");
  const correlationId = "delivery-closeout:closeout-entrant";
  const closeout = closeoutCommand(
    deliveryPackage,
    {
      candidate: {
        candidateRef:
          "prototype-local://delivery/product-candidates/focus-timer",
        candidateVersion: "prototype-local-v1",
        canonicalKey: "focus-timer",
        correlationRef: correlationId,
        entrantKind: "product",
        evidenceRefs: ["prototype-local://evidence/focus-timer"],
        intakeMetadata: {
          intendedEndpoint: "prototype-local-preview",
          platformOwner: "platform-engineering",
          runtimeOwner: "workspace-prototype-studio",
          securityOwner: "security-architecture",
          sourceOwners: ["workspace-prototype-studio"],
          validationBehavior: {
            catalogRefs: ["component-contracts", "review-coverage"],
            notes: "Focused closeout proof remains owner-repo validated.",
            posture: "covered-by-owner-repo",
            wgcfGraphRole: "product-readiness-aggregate",
          },
        },
        name: "Focus Timer",
        sourceOwnerRef: "workspace-prototype-studio",
      },
      kind: "workspace-entrant",
    },
    correlationId,
  );

  const result = await submitDeliveryCloseoutCommand({
    closeout,
    deliveryPackage,
    submittedAt: "2026-07-30T11:00:00.000Z",
  });

  assert.equal(result.run.state, "completed");
  assert.ok(result.receipt);
  assert.equal(result.receipt.receipt.outcome.impact.kind, "workspace-entrant");
  assert.ok(
    result.receipt.receipt.outcome.impact.candidate.evidenceRefs.includes(
      result.receipt.receipt.outcome.outcomeRef,
    ),
  );
  assert.ok(
    result.receipt.receipt.outcome.impact.candidate.evidenceRefs.includes(
      result.receipt.receipt.outcome.closeoutReceiptRef,
    ),
  );
});

test("existing-product change requires the canonical active registry ref", async () => {
  const deliveryPackage = executionPackage("closeout-product-change");
  const closeout = closeoutCommand(deliveryPackage, {
    activeProduct: {
      productId: "focus-timer",
      registryRef: "workspace-governance://products/wrong-product",
      registryVersion: "registry-v3",
    },
    changeSummary: "Publish the completed timer accessibility update.",
    kind: "existing-product-change",
    productOwnerRef: "owner://focus-timer",
  });

  const blockers = deliveryCloseoutBlockers({ closeout, deliveryPackage });

  assert.deepEqual(blockers, [
    "Existing-product change requires an active product id, matching registry ref and version, product owner, and change summary.",
  ]);

  closeout.impact.activeProduct.registryRef =
    "workspace-governance://products/focus-timer";
  const result = await submitDeliveryCloseoutCommand({
    closeout,
    deliveryPackage,
    submittedAt: "2026-07-30T12:00:00.000Z",
  });

  assert.equal(result.run.state, "completed");
  assert.ok(result.receipt);
  assert.deepEqual(result.receipt.receipt.outcome.impact, {
    activeProduct: {
      productId: "focus-timer",
      registryRef: "workspace-governance://products/focus-timer",
      registryVersion: "registry-v3",
    },
    changeSummary: "Publish the completed timer accessibility update.",
    deliveryOutcomeRef: result.receipt.receipt.outcome.outcomeRef,
    kind: "existing-product-change",
    productOwnerRef: "owner://focus-timer",
  });
});

function executionPackage(deliveryPackageId) {
  return {
    available_actions: [],
    backend_status: "in-progress",
    delivery_package_id: deliveryPackageId,
    display_name: "Delivery closeout proof",
    execution_handoff: {
      authority: "prototype-local",
      evidence_refs: [
        `prototype-local://delivery/refinement/${deliveryPackageId}`,
      ],
      handed_off_at: "2026-07-30T09:00:00.000Z",
      source_package_id: `${deliveryPackageId}-refinement`,
      source_package_version: "local-refinement-v1",
      source_refinement_receipt_id:
        `prototype-local://delivery/refinement/${deliveryPackageId}/receipt`,
      tree_snapshot_ref:
        `prototype-local://delivery/tree/${deliveryPackageId}/snapshot`,
    },
    legacy_epic_id: 1001,
    open_child_count: 0,
    package_posture: "Ready",
    source_custody: {
      kind: "prototype-local",
    },
    source_ref: "OpenProject Epic #1001",
    summary: "Execution is complete and ready for closeout.",
    target_pi: "PI-2026-04",
    tone: "info",
    tree_root_id: "node-1001",
    workflow_phase: "execution",
  };
}

function closeoutCommand(
  deliveryPackage,
  impact,
  correlationId = `delivery-closeout:${deliveryPackage.delivery_package_id}`,
) {
  const readinessRef =
    `prototype-local://delivery/closeout-readiness/` +
    deliveryPackage.delivery_package_id;

  return {
    actorRef: "operator://delivery-closeout-test",
    correlationId,
    evidence: {
      changedSurfaces: "- Delivery closeout test fixture.",
      completionSummary: "The scoped Delivery work is complete.",
      demoEvidence: "The bounded outcome was demonstrated.",
      demoOutcome: "reviewed",
      demoSummary: "The approved behavior was observed.",
      inspectActionItems: "- No unresolved action remains.",
      inspectSummary: "The closeout review accepted the outcome.",
      testResultEvidence: "- PASS: focused closeout proof.",
      validationEvidence: "- PASS: closeout invariants.",
    },
    impact,
    readiness: {
      blockedItemRefs: [],
      deliveryPackageId: deliveryPackage.delivery_package_id,
      evidenceRefs: [`${readinessRef}/execution-complete`],
      openDescendantCount: 0,
      readinessRef,
      readyForClosing: true,
      readyForCloseout: true,
      reasons: [],
      sourceVersion: "oos-closeout-readiness-v1",
    },
  };
}
