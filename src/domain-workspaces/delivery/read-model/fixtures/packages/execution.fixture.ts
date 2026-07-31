import type { DeliveryPackageFixture } from "../../../domain/delivery-types.ts";

import { packageActions, readOnlyActions } from "./actions.fixture.ts";

export const deliveryExecutionPackageFixtures: DeliveryPackageFixture[] = [
  {
    available_actions: packageActions([
      {
        action_type: "start-work",
        enabled: true,
        expected_backend_route:
          "POST /v1/delivery-work-items/{work_item_id}/update",
        label: "Start Work",
        reason: "A selected execution target is ready to start.",
        scope: "execution_target",
        tone: "ok",
      },
      {
        action_type: "defer",
        enabled: true,
        expected_backend_route:
          "POST /v1/delivery-work-items/{work_item_id}/parking",
        label: "Defer",
        reason:
          "Operator may intentionally remove the package from active focus.",
        scope: "package_with_children",
        tone: "warn",
      },
    ]),
    backend_status: "ready",
    delivery_package_id: "pkg-698",
    display_name: "Governed AI Control Plane",
    legacy_epic_id: 698,
    open_child_count: 6,
    package_posture: "Ready",
    source_ref: "OpenProject Epic #698",
    summary:
      "Control-plane work is refined and ready to start the selected execution target.",
    target_pi: "PI-2026-03",
    tone: "info",
    tree_root_id: "node-698",
    workflow_phase: "execution",
  },
  {
    available_actions: packageActions([
      {
        action_type: "clear-blocker",
        enabled: false,
        expected_backend_route:
          "POST /v1/delivery-work-items/{work_item_id}/blocker",
        label: "Clear Blocker",
        reason: "Clear only after the readiness gate has unblock evidence.",
        scope: "execution_target",
        tone: "warn",
      },
      {
        action_type: "defer",
        enabled: true,
        expected_backend_route:
          "POST /v1/delivery-work-items/{work_item_id}/parking",
        label: "Defer",
        reason:
          "Blocked scope may be removed from active focus with justification.",
        scope: "package_with_children",
        tone: "warn",
      },
    ]),
    active_blocker: {
      decision_path: "remove",
      discovered_on: "2026-05-27",
      impact:
        "Execution cannot continue because a required readiness gate is not clear for the active work item.",
      justification:
        "The next committed execution step must wait until the missing readiness proof is corrected, then the blocker can be cleared through the bounded OOS blocker route.",
      owner: "Workspace Delivery ART",
      statement: "Required readiness gate blocks the active execution target.",
    },
    backend_status: "blocked",
    delivery_package_id: "pkg-753",
    display_name: "Readiness Gate Repair",
    legacy_epic_id: 753,
    open_child_count: 4,
    package_posture: "Blocked",
    source_ref: "OpenProject Epic #753",
    summary:
      "Execution is blocked until the missing readiness proof is corrected.",
    target_pi: "PI-2026-03",
    tone: "danger",
    tree_root_id: "node-753",
    workflow_phase: "execution",
  },
  {
    available_actions: packageActions([
      {
        action_type: "sync-owner-repo",
        enabled: true,
        expected_backend_route: null,
        label: "Catalog Owner Repo",
        reason:
          "Repository admitted the repo, but Catalog must add, link, and sync the Owner Repo value before Execution can apply it.",
        scope: "package_with_children",
        tone: "warn",
      },
    ]),
    active_blocker: {
      decision_path: "remove",
      discovered_on: "2026-05-27",
      impact:
        "Execution cannot apply the admitted repository as owner_repo until Delivery Catalog exposes and syncs the Owner Repo value.",
      justification:
        "Repository admission resolved the source home, but the Delivery backend value layer does not yet have the selectable Owner Repo value.",
      owner: "Delivery Catalog",
      statement:
        "Owner Repo value client-insight-delivery is not linked and synced in Delivery Catalog.",
    },
    backend_status: "blocked",
    delivery_package_id: "pkg-812",
    display_name: "Client Insight Delivery",
    legacy_epic_id: 812,
    open_child_count: 3,
    package_posture: "Blocked",
    source_ref: "OpenProject Epic #812",
    summary:
      "Execution found a source-custody gap after work started; Catalog Owner Repo value sync is required before applying the owner.",
    target_pi: "PI-2026-03",
    tone: "warn",
    tree_root_id: "node-812",
    workflow_phase: "execution",
  },
  {
    available_actions: packageActions([
      {
        action_type: "open-closeout",
        enabled: true,
        expected_backend_route:
          "GET /v1/delivery-initiatives/{delivery_id}/closeout-readiness",
        label: "Open Closeout",
        reason: "Completed child work needs closeout evidence review.",
        scope: "package_with_children",
        tone: "warn",
      },
    ]),
    backend_status: "in-progress",
    delivery_package_id: "pkg-681",
    display_name: "Broker Apply Controls",
    legacy_epic_id: 681,
    open_child_count: 2,
    package_posture: "Closeout Pending",
    source_ref: "OpenProject Epic #681",
    summary:
      "Most children are complete; closeout review decides the remaining move.",
    target_pi: "PI-2026-02",
    tone: "warn",
    tree_root_id: "node-681",
    workflow_phase: "execution",
  },
  {
    available_actions: packageActions([
      {
        action_type: "resume",
        enabled: true,
        expected_backend_route:
          "POST /v1/delivery-work-items/{work_item_id}/parking",
        label: "Resume",
        reason: "Parked scope can return to ready posture after review.",
        scope: "package_with_children",
        tone: "info",
      },
    ]),
    backend_status: "parked",
    delivery_package_id: "pkg-087",
    display_name: "Security Baseline Review",
    legacy_epic_id: 87,
    open_child_count: 5,
    package_posture: "Deferred",
    source_ref: "OpenProject Epic #87",
    summary:
      "Security baseline remains intentionally parked outside current focus.",
    target_pi: null,
    tone: "warn",
    tree_root_id: "node-087",
    workflow_phase: "execution",
  },
  {
    available_actions: packageActions([
      {
        action_type: "edit-work-tree",
        enabled: true,
        expected_backend_route:
          "POST /v1/delivery-work-items + POST /v1/delivery-work-items/{work_item_id}/update",
        label: "Edit Work",
        reason:
          "Active execution found tree work that should be adjusted inline before future OOS work-item writes.",
        scope: "package_with_children",
        tone: "info",
      },
      {
        action_type: "continue-remaining-work",
        enabled: true,
        expected_backend_route:
          "POST /v1/delivery-work-items/{work_item_id}/update",
        label: "Continue Remaining Work",
        reason:
          "Read model found remaining open scope after a completed execution target.",
        scope: "package_with_children",
        tone: "info",
      },
    ]),
    backend_status: "in-progress",
    delivery_package_id: "pkg-714",
    display_name: "Broker Draft Validation",
    legacy_epic_id: 714,
    open_child_count: 3,
    package_posture: "In Progress",
    source_ref: "OpenProject Epic #714",
    summary:
      "Execution has started and remaining child work items are still open.",
    target_pi: "PI-2026-03",
    tone: "ok",
    tree_root_id: "node-714",
    workflow_phase: "execution",
  },
  {
    available_actions: readOnlyActions,
    backend_status: "done",
    delivery_package_id: "pkg-540",
    display_name: "Stale Open Closeout",
    legacy_epic_id: 540,
    open_child_count: 0,
    package_posture: "Done",
    source_ref: "OpenProject Epic #540",
    summary: "Closed with accepted receipt and no remaining child work.",
    target_pi: "PI-2026-02",
    tone: "ok",
    tree_root_id: "node-540",
    workflow_phase: "audit_only",
  },
  {
    available_actions: readOnlyActions,
    backend_status: "retired",
    delivery_package_id: "pkg-251",
    display_name: "Superseded AI Assist Slice",
    legacy_epic_id: 251,
    open_child_count: 0,
    package_posture: "Retired",
    source_ref: "OpenProject Epic #251",
    summary: "Superseded scope is retained for audit only.",
    target_pi: null,
    tone: "muted",
    tree_root_id: "node-251",
    workflow_phase: "audit_only",
  },
  {
    available_actions: [
      {
        action_type: "open-details",
        enabled: false,
        expected_backend_route: null,
        label: "Open Details",
        reason: "Projection is stale; refresh before acting.",
        scope: "read_only",
        tone: "stale",
      },
      {
        action_type: "open-audit-trail",
        enabled: true,
        expected_backend_route: null,
        label: "Audit Trail",
        reason: "Read package-scoped projection history while stale.",
        scope: "read_only",
        tone: "muted",
      },
    ],
    backend_status: "ready",
    delivery_package_id: "pkg-900",
    display_name: "Large Tree Migration Probe",
    legacy_epic_id: 900,
    open_child_count: 42,
    package_posture: "Ready",
    source_ref: "OpenProject Epic #900",
    summary:
      "Large-tree mock package for collapsed rendering and future lazy loading.",
    target_pi: "PI-2026-04",
    tone: "stale",
    tree_root_id: "node-900",
    workflow_phase: "execution",
  },
];
