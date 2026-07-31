import assert from "node:assert/strict";
import test from "node:test";

import {
  getDeliveryEffectivePackageProjection,
} from "../../src/domain-workspaces/delivery/domain/delivery-package-posture.ts";
import { projectDeliveryEffectiveReadModel } from "../../src/domain-workspaces/delivery/local-runtime/projections/delivery-effective-projection.ts";
import { deliveryExecutionActionPosture } from "../../src/domain-workspaces/delivery/local-runtime/transitions/execution-transition.ts";
import {
  deliveryIntakeSourceVersion,
  deliveryPackageSourceVersion,
} from "../../src/domain-workspaces/delivery/local-runtime/transitions/transition-record.ts";

test("Delivery projects Refinement and Execution receipts through one read model", () => {
  const model = {
    intake_sources: [],
    packages: [
      deliveryPackage("refinement-1", "refinement"),
      deliveryPackage("execution-1", "execution"),
    ],
  };
  const effective = projectDeliveryEffectiveReadModel({
    model,
    runtimeProjection: {
      consumedIntakeRecords: {},
      executionActionRecords: {
        "execution-1": {
          actionType: "block",
          receiptId: "execution-receipt-1",
          recordedAt: "2026-07-11",
          sourceRecordVersion: deliveryPackageSourceVersion(model.packages[1]),
          sourceRevision: "delivery-v1",
          statusLabel: "Blocked",
          summary: "Execution blocker recorded.",
          tone: "danger",
        },
      },
      refinementApplyReceipts: {
        "refinement-1": {
          applied_at: "2026-07-11",
          lines: [],
          outcome: "accepted",
          receipt_id: "refinement-receipt-1",
          sourceRecordVersion: deliveryPackageSourceVersion(model.packages[0]),
          source_work_design_receipt_id: "work-design-receipt-1",
          tone: "ok",
        },
      },
      workDesignApplyRecords: {},
    },
  });

  assert.equal(
    effective.packages[0].local_workflow_projection.status_label,
    "Done",
  );
  assert.equal(
    effective.packages[1].local_workflow_projection.status_label,
    "Blocked",
  );
});

test("Delivery rejects stale local workflow records after source projection changes", () => {
  const model = {
    intake_sources: [],
    packages: [
      deliveryPackage("work-design-stale", "work_design"),
      deliveryPackage("refinement-stale", "refinement"),
      deliveryPackage("execution-stale", "execution"),
    ],
  };
  const effective = projectDeliveryEffectiveReadModel({
    model,
    runtimeProjection: {
      consumedIntakeRecords: {},
      executionActionRecords: {
        "execution-stale": {
          actionType: "block",
          receiptId: "execution-stale-receipt",
          recordedAt: "2026-07-11",
          sourceRecordVersion: "stale-source-version",
          sourceRevision: "delivery-v0",
          statusLabel: "Blocked",
          summary: "Stale execution blocker.",
          tone: "danger",
        },
      },
      refinementApplyReceipts: {
        "refinement-stale": {
          applied_at: "2026-07-11",
          lines: [],
          outcome: "accepted",
          receipt_id: "refinement-stale-receipt",
          sourceRecordVersion: "stale-source-version",
          source_work_design_receipt_id: "work-design-stale-receipt",
          tone: "ok",
        },
      },
      workDesignApplyRecords: {
        "work-design-stale": {
          appliedAt: "2026-07-11",
          appliedBy: "test operator",
          receiptId: "work-design-stale-receipt",
          sourceRecordVersion: "stale-source-version",
          targetTree: {},
        },
      },
    },
  });

  assert.equal(effective.packages.length, model.packages.length);
  assert.equal(
    effective.packages.some((deliveryPackage) =>
      Boolean(deliveryPackage.local_workflow_projection),
    ),
    false,
  );
});

test("Delivery rejects stale local intake consume evidence", () => {
  const source = deliveryIntakeSource("accepted-source-1");
  const changedSource = {
    ...source,
    summary: "The source projection changed after consume was recorded.",
  };
  const effective = projectDeliveryEffectiveReadModel({
    model: {
      intake_sources: [changedSource],
      packages: [],
    },
    runtimeProjection: {
      consumedIntakeRecords: {
        [source.accepted_source_id]: {
          consumedAt: "2026-07-11",
          consumedBy: "test operator",
          sourceRecordVersion: deliveryIntakeSourceVersion(source),
        },
      },
      executionActionRecords: {},
      refinementApplyReceipts: {},
      workDesignApplyRecords: {},
    },
  });

  assert.equal(effective.intake_sources[0].intake_status, "needs_consume");
  assert.equal(effective.packages.length, 0);
});

test("Delivery execution posture derives from command semantics", () => {
  assert.deepEqual(deliveryExecutionActionPosture("retire", "In Progress"), {
    statusLabel: "Retired",
    tone: "muted",
  });
  assert.deepEqual(deliveryExecutionActionPosture("open-details", "Ready"), {
    statusLabel: "Ready",
    tone: "info",
  });
});

test("accepted Refinement receipt projects Done without mutating source posture", () => {
  const sourcePackage = {
    ...deliveryPackage("refinement-applied", "refinement"),
    refinement_packet: {
      receipt: {
        outcome: "accepted",
        receipt_id: "REFINE-789-v1",
      },
      status: "applied",
    },
  };

  assert.deepEqual(getDeliveryEffectivePackageProjection(sourcePackage), {
    posture: "Done",
    summary:
      "Refinement apply receipt REFINE-789-v1 is recorded. This package is complete for the current Refinement pass.",
    tone: "ok",
  });
  assert.equal(sourcePackage.package_posture, "Ready");
});

test("unfinished Refinement packet preserves its source posture", () => {
  const sourcePackage = {
    ...deliveryPackage("refinement-ready", "refinement"),
    refinement_packet: {
      receipt: null,
      status: "ready_for_review",
    },
  };

  assert.deepEqual(getDeliveryEffectivePackageProjection(sourcePackage), {
    posture: "Ready",
    summary: "Source package summary.",
    tone: "info",
  });
});

test("failed Refinement receipt projects a blocked effective posture", () => {
  const sourcePackage = {
    ...deliveryPackage("refinement-failed", "refinement"),
  };

  assert.deepEqual(
    getDeliveryEffectivePackageProjection(sourcePackage, {
      refinementReceipt: {
        outcome: "failed",
        receipt_id: "REFINE-FAILED-v1",
      },
    }),
    {
      posture: "Blocked",
      summary:
        "Refinement apply receipt REFINE-FAILED-v1 did not complete. Review the receipt before retrying.",
      tone: "danger",
    },
  );
});

function deliveryPackage(id, workflowPhase) {
  return {
    available_actions: [],
    backend_status: "ready",
    delivery_package_id: id,
    display_name: id,
    legacy_epic_id: 1,
    open_child_count: 0,
    package_posture: "Ready",
    source_custody: {
      mode: "not-required",
      repo_ref: null,
      status: "resolved",
    },
    source_ref: `source://${id}`,
    summary: "Source package summary.",
    target_pi: null,
    tone: "info",
    tree_root_id: `tree-${id}`,
    workflow_phase: workflowPhase,
  };
}

function deliveryIntakeSource(id) {
  return {
    accepted_source_id: id,
    consumed_at: null,
    delivery_package_id: null,
    evidence_refs: [],
    expected_backend_route: "POST /delivery/intake",
    gate_summary: "Ready to consume.",
    intake_status: "needs_consume",
    owner: "Delivery",
    source_custody: {
      mode: "not-required",
      repo_ref: null,
      status: "resolved",
    },
    source_kind: "proposal",
    source_ref: "PR-1",
    status_label: "Accepted",
    summary: "Accepted source.",
    title: "Accepted source",
    tone: "warn",
    work_design_session_ref: null,
  };
}
