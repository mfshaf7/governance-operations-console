import type { DeliveryPackageFixture } from "../../../../domain/delivery-types.ts";

import { readOnlyActions } from "../actions.fixture.ts";

export const deliveryWorkDesignBlockerPackageFixtures: DeliveryPackageFixture[] =
  [
    {
      active_blocker: {
        decision_path: "remove",
        discovered_on: "2026-05-27",
        impact:
          "Work Design cannot prove Apply Draft completion because the OpenProject Epic has no valid apply receipt link.",
        justification:
          "The blocker must stay active until a valid existing receipt is linked or Apply Draft is rerun or rolled back through the approved path.",
        owner: "workspace-prototype-studio",
        statement:
          "OpenProject Epic #732 is missing the apply receipt link for the reviewed draft.",
      },
      available_actions: readOnlyActions,
      backend_status: "blocked",
      delivery_package_id: "pkg-design-732",
      display_name: "Apply Receipt Link Case",
      legacy_epic_id: 732,
      open_child_count: 0,
      package_posture: "Blocked",
      source_ref: "OpenProject Epic #732",
      summary:
        "Reviewed draft exists, but OpenProject Epic #732 has no apply receipt link. Use Blocker Recovery to diagnose, link a valid receipt, rerun apply, rollback, keep blocked, or accept risk.",
      target_pi: null,
      tone: "danger",
      tree_root_id: "node-design-732",
      work_design_blocker: {
        can_repair_locally: false,
        check_locations: [
          "Apply Run Log for OpenProject Epic #732",
          "Work Design Receipt Archive for package pkg-design-732",
          "OpenProject Epic #732 activity, attachments, or receipt field",
        ],
        issue_kind: "receipt_persist_failed",
        possible_causes: [
          "Apply completed, but the receipt link was not attached back to OpenProject Epic #732.",
          "A receipt exists in the apply log or receipt archive, but the package read model did not project it.",
          "Apply was interrupted after the package changed but before receipt storage finished.",
        ],
        recovery_action:
          "If a valid receipt exists in those places, attach or link that receipt back to OpenProject Epic #732. If no valid receipt exists, rerun or roll back Apply Draft through the approved apply path so the system creates a new receipt. Do not hand-create a receipt.",
        source: "package",
        summary:
          "The reviewed draft exists, but the package record has no receipt link proving the draft was safely applied.",
        title: "Missing Apply Receipt",
      },
      workflow_phase: "work_design",
    },
    {
      active_blocker: {
        decision_path: "remove",
        discovered_on: "2026-05-27",
        impact:
          "The finalized context snapshot is missing from the source Epic, so downstream review cannot trust the Work Design evidence packet.",
        justification:
          "The source Epic must receive the finalized snapshot or an approved replacement before the blocker can be cleared.",
        owner: "workspace-prototype-studio",
        statement:
          "OpenProject Epic #733 is missing the finalized context snapshot attachment.",
      },
      available_actions: readOnlyActions,
      backend_status: "blocked",
      delivery_package_id: "pkg-design-733",
      display_name: "Snapshot Attachment Case",
      legacy_epic_id: 733,
      open_child_count: 0,
      package_posture: "Blocked",
      source_ref: "OpenProject Epic #733",
      summary:
        "Apply receipt exists, but the finalized context snapshot is not attached to OpenProject Epic #733. Use Blocker Recovery to attach snapshot evidence, rerun apply, keep blocked, or accept risk.",
      target_pi: null,
      tone: "danger",
      tree_root_id: "node-design-733",
      work_design_blocker: {
        can_repair_locally: false,
        check_locations: [
          "OpenProject Epic #733 attachments",
          "Apply Run Log for OpenProject Epic #733",
          "Receipt Archive snapshot attachment status",
        ],
        issue_kind: "context_snapshot_attach_failed",
        possible_causes: [
          "The apply receipt was created, but snapshot upload failed.",
          "The snapshot exists, but it was not attached to OpenProject Epic #733.",
          "The attachment succeeded but the package projection did not refresh.",
        ],
        recovery_action:
          "Attach the finalized context snapshot to OpenProject Epic #733, or attach an approved replacement snapshot, then mark this blocker fixed.",
        source: "package",
        summary:
          "The Work Design apply record exists, but OpenProject Epic #733 is missing the finalized context snapshot.",
        title: "Context Snapshot Missing",
      },
      workflow_phase: "work_design",
    },
    {
      active_blocker: {
        decision_path: "remove",
        discovered_on: "2026-05-27",
        impact:
          "The applied source state and Work Design receipt do not agree, so the package cannot safely continue downstream.",
        justification:
          "The operator must reconcile the partial apply by completing the missing step or rolling back before clearing the blocker.",
        owner: "workspace-prototype-studio",
        statement:
          "OpenProject Epic #734 and the Apply Draft receipt describe different applied state.",
      },
      available_actions: readOnlyActions,
      backend_status: "blocked",
      delivery_package_id: "pkg-design-734",
      display_name: "Partial Apply Reconcile Case",
      legacy_epic_id: 734,
      open_child_count: 0,
      package_posture: "Blocked",
      source_ref: "OpenProject Epic #734",
      summary:
        "Some apply steps succeeded and others did not, so OpenProject Epic #734 and the apply receipt do not agree. Use Blocker Recovery to complete the missing step, rollback, keep blocked, or accept risk.",
      target_pi: null,
      tone: "danger",
      tree_root_id: "node-design-734",
      work_design_blocker: {
        can_repair_locally: false,
        check_locations: [
          "OpenProject Epic #734 current fields and child list",
          "Apply Run Log for OpenProject Epic #734",
          "Receipt Archive result for the same apply run",
        ],
        issue_kind: "partial_apply_inconsistent",
        possible_causes: [
          "One apply step succeeded and a later apply step failed.",
          "OpenProject changed, but the receipt recorded only part of the requested update.",
          "The read model refreshed while the apply result and package state still disagreed.",
        ],
        recovery_action:
          "Compare OpenProject Epic #734 with the apply log and receipt. Either finish the missing apply step or roll back the partial update, then mark this blocker fixed.",
        source: "package",
        summary:
          "Apply returned a partial result: the reviewed draft tree and OpenProject Epic #734 no longer describe the same state.",
        title: "Partial Apply Mismatch",
      },
      workflow_phase: "work_design",
    },
  ];
