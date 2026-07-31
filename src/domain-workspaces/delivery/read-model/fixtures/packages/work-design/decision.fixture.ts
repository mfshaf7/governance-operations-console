import type { DeliveryPackageFixture } from "../../../../domain/delivery-types.ts";

import { readOnlyActions } from "../actions.fixture.ts";

export const deliveryWorkDesignDecisionPackageFixtures: DeliveryPackageFixture[] =
  [
    {
      available_actions: readOnlyActions,
      backend_status: "done",
      delivery_package_id: "pkg-design-739",
      display_name: "Context Gateway Existing Work Link",
      legacy_epic_id: 739,
      open_child_count: 0,
      package_posture: "Done",
      source_ref: "OpenProject Epic #739",
      summary:
        "Context pass determined this source should link to existing CGG work instead of creating a new tree.",
      target_pi: null,
      tone: "ok",
      tree_root_id: "node-design-739",
      work_design_context_session: {
        accepted: true,
        board_snapshot: {
          title: "CGG Scope Existing Work Link",
          summary:
            "Finalized board snapshot records that the accepted source overlaps existing CGG admission work, so the source should attach to that package instead of creating a new Work Design tree.",
          nodes: [
            {
              label: "SOURCE",
              title: "OpenProject Epic #739",
              summary:
                "Accepted source requesting context projection controls.",
              tone: "info",
            },
            {
              label: "MATCH",
              title: "OpenProject Epic #712",
              summary:
                "Existing CGG admission design already carries this scope.",
              tone: "warn",
            },
            {
              label: "DECISION",
              title: "Link To Existing Work",
              summary: "No new draft tree should be created for this source.",
              tone: "warn",
            },
            {
              label: "HANDOFF",
              title: "Decision Record",
              summary:
                "Attach the source evidence to the existing package trail.",
              tone: "info",
            },
          ],
        },
        carried_metadata: [
          {
            label: "Decision",
            tone: "warn",
            value: "Link to existing work",
          },
          {
            label: "Source",
            tone: "info",
            value: "OpenProject Epic #739",
          },
          {
            label: "Existing Target",
            tone: "warn",
            value: "OpenProject Epic #712 / pkg-design-712",
          },
          {
            label: "Next Surface",
            tone: "info",
            value: "Decision Record",
          },
        ],
        decision: "attach",
        finalized_at: "2026-06-01T02:05:00+08:00",
        finalized_by: "operator:mshaf7",
        initial_step: "history",
        locked: true,
        metadata_packet_ref:
          "cgg://packets/work-design-context/pkg-design-739/context-brief-v1",
        name: "Context Gateway Link Pass",
        note: "Accepted context says this source should be linked to existing CGG admission design work. Do not create a new draft tree; preserve the source evidence and attach it to the existing package trail.",
        saved_at: "2026-06-01T02:00:00+08:00",
        session_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-739/context-pass-01",
        snapshot_artifact: {
          artifact_id:
            "artifact://work-design/pkg-design-739/context-pass-01/snapshot-v1",
          attachment_ref: null,
          attachment_status: "pending_apply",
          board_snapshot_ref:
            "wgcf://workflows/delivery-work-design/pkg-design-739/context-pass-01/snapshot-v1",
          checksum: "sha256:mock-context-gateway-link-snapshot-v1",
          content_type: "image/png",
          description:
            "Finalized Work Design context board snapshot for OpenProject Epic #739 link-to-existing decision.",
          file_name: "work-design-context-epic-739-context-pass-01-v1.png",
          rendered_content_base64_ref:
            "mock://work-design/pkg-design-739/context-pass-01/snapshot-v1.png",
          target_record_ref: "openproject://work_packages/739",
        },
        version: "v1 locked",
        workspace_snapshot_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-739/context-pass-01/snapshot-v1",
      },
      workflow_phase: "work_design",
    },
    {
      available_actions: readOnlyActions,
      backend_status: "retired",
      delivery_package_id: "pkg-design-746",
      display_name: "Audit Trail Duplicate Retire",
      legacy_epic_id: 746,
      open_child_count: 0,
      package_posture: "Retired",
      source_ref: "OpenProject Epic #746",
      summary:
        "Context pass found duplicate audit-trail scope and recorded a retirement decision instead of building a tree.",
      target_pi: null,
      tone: "danger",
      tree_root_id: "node-design-746",
      work_design_context_session: {
        accepted: true,
        board_snapshot: {
          title: "Audit Trail Duplicate Retirement",
          summary:
            "Finalized board snapshot records that the source duplicates accepted audit-trail scope and should be retired before any Work Design draft tree is created.",
          nodes: [
            {
              label: "SOURCE",
              title: "OpenProject Epic #746",
              summary:
                "Accepted source proposed another audit-trail design path.",
              tone: "info",
            },
            {
              label: "DUPLICATE",
              title: "Covered By Existing Audit Scope",
              summary:
                "The requested outcome is already represented in active delivery scope.",
              tone: "danger",
            },
            {
              label: "DECISION",
              title: "Retire Duplicate",
              summary:
                "Stop Work Design for this source and keep decision evidence.",
              tone: "danger",
            },
            {
              label: "HANDOFF",
              title: "Retirement Record",
              summary:
                "No Build Tree handoff is produced for retired duplicate scope.",
              tone: "muted",
            },
          ],
        },
        carried_metadata: [
          {
            label: "Decision",
            tone: "danger",
            value: "Retire duplicate",
          },
          {
            label: "Source",
            tone: "info",
            value: "OpenProject Epic #746",
          },
          {
            label: "Duplicate Basis",
            tone: "danger",
            value:
              "Existing audit-trail delivery scope already covers the request.",
          },
          {
            label: "Next Surface",
            tone: "muted",
            value: "Retirement Record",
          },
        ],
        decision: "retire",
        finalized_at: "2026-06-01T02:20:00+08:00",
        finalized_by: "operator:mshaf7",
        initial_step: "history",
        locked: true,
        metadata_packet_ref:
          "cgg://packets/work-design-context/pkg-design-746/context-brief-v1",
        name: "Audit Trail Duplicate Pass",
        note: "Accepted context says this source duplicates existing audit-trail delivery scope. Retire the duplicate source, preserve the evidence, and do not create a Work Design tree.",
        saved_at: "2026-06-01T02:14:00+08:00",
        session_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-746/context-pass-01",
        snapshot_artifact: {
          artifact_id:
            "artifact://work-design/pkg-design-746/context-pass-01/snapshot-v1",
          attachment_ref: null,
          attachment_status: "pending_apply",
          board_snapshot_ref:
            "wgcf://workflows/delivery-work-design/pkg-design-746/context-pass-01/snapshot-v1",
          checksum: "sha256:mock-audit-trail-duplicate-snapshot-v1",
          content_type: "image/png",
          description:
            "Finalized Work Design context board snapshot for OpenProject Epic #746 duplicate-retirement decision.",
          file_name: "work-design-context-epic-746-context-pass-01-v1.png",
          rendered_content_base64_ref:
            "mock://work-design/pkg-design-746/context-pass-01/snapshot-v1.png",
          target_record_ref: "openproject://work_packages/746",
        },
        version: "v1 locked",
        workspace_snapshot_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-746/context-pass-01/snapshot-v1",
      },
      workflow_phase: "work_design",
    },
  ];
