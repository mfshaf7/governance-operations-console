import type { DeliveryPackageFixture } from "../../../../domain/delivery-types.ts";

import { readOnlyActions } from "../actions.fixture.ts";
import {
  complexWorkDesignBoardSnapshot,
  complexWorkDesignGeneratedTree,
  scatteredShapeWorkDesignBoardSnapshot,
  sketchOnlyWorkDesignBoardSnapshot,
} from "./artifacts.fixture.ts";

export const deliveryWorkDesignEvidencePackageFixtures: DeliveryPackageFixture[] =
  [
    {
      available_actions: readOnlyActions,
      backend_status: "done",
      delivery_package_id: "pkg-design-756",
      display_name: "Complex Package Review Stress",
      legacy_epic_id: 756,
      open_child_count: 40,
      package_posture: "Done",
      source_ref: "OpenProject Epic #756",
      summary:
        "Work Design applied the large package tree and complex diagram snapshot. This record remains available for history.",
      target_pi: null,
      tone: "ok",
      tree_root_id: "pkg-design-756-epic",
      work_design_context_session: {
        accepted: true,
        board_snapshot: complexWorkDesignBoardSnapshot,
        carried_metadata: [
          {
            label: "Decision",
            tone: "ok",
            value: "Proceed with Work Design",
          },
          {
            label: "Source",
            tone: "info",
            value: "OpenProject Epic #756",
          },
          {
            label: "Scale",
            tone: "warn",
            value: "6 Features / 30 User stories / 4 Risks",
          },
          {
            label: "Snapshot",
            tone: "info",
            value: "Complex context map queued for Apply Draft evidence.",
          },
          {
            label: "Next Surface",
            tone: "warn",
            value: "Review Draft",
          },
        ],
        decision: "proceed",
        finalized_at: "2026-06-01T04:35:00+08:00",
        finalized_by: "operator:mshaf7",
        generated_tree: complexWorkDesignGeneratedTree,
        initial_step: "review",
        locked: true,
        metadata_packet_ref:
          "cgg://packets/work-design-context/pkg-design-756/context-brief-v2",
        name: "Complex Package Context Pass",
        note: "Accepted context says this package should stress the Review Draft surface with a large draft tree and complex diagram snapshot. Review should stay count-first, keep snapshot evidence inspectable, and use the full tree modal for detail.",
        saved_at: "2026-06-01T04:28:00+08:00",
        session_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-756/context-pass-02",
        snapshot_artifact: {
          artifact_id:
            "artifact://work-design/pkg-design-756/context-pass-02/snapshot-v2",
          attachment_ref: null,
          attachment_status: "pending_apply",
          board_snapshot_ref:
            "wgcf://workflows/delivery-work-design/pkg-design-756/context-pass-02/snapshot-v2",
          checksum: "sha256:mock-complex-work-design-context-snapshot-v2",
          content_type: "image/png",
          description:
            "Finalized Work Design context board snapshot for OpenProject Epic #756 large-tree stress package.",
          file_name: "work-design-context-epic-756-context-pass-02-v2.png",
          rendered_content_base64_ref:
            "mock://work-design/pkg-design-756/context-pass-02/snapshot-v2.png",
          target_record_ref: "openproject://work_packages/756",
        },
        version: "v2 locked",
        workspace_snapshot_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-756/context-pass-02/snapshot-v2",
      },
      workflow_phase: "work_design",
    },
    {
      available_actions: readOnlyActions,
      backend_status: "new",
      delivery_package_id: "pkg-design-757",
      display_name: "Ambiguous Sketch Context",
      legacy_epic_id: 757,
      open_child_count: 0,
      package_posture: "Ready",
      source_ref: "OpenProject Epic #757",
      summary:
        "Finalized context brief captured a freeform sketch only. No confirmed build seeds exist, so Build Tree starts from the Epic shell.",
      target_pi: null,
      tone: "info",
      tree_root_id: "node-design-757",
      work_design_context_session: {
        accepted: true,
        board_snapshot: sketchOnlyWorkDesignBoardSnapshot,
        carried_metadata: [
          {
            label: "Decision",
            tone: "ok",
            value: "Proceed with Work Design",
          },
          {
            label: "Source",
            tone: "info",
            value: "OpenProject Epic #757",
          },
          {
            label: "Evidence Mode",
            tone: "warn",
            value: "Freeform sketch captured; no structure inferred.",
          },
          {
            label: "Next Surface",
            tone: "warn",
            value: "Build Tree",
          },
        ],
        decision: "proceed",
        finalized_at: "2026-06-01T05:20:00+08:00",
        finalized_by: "operator:mshaf7",
        initial_step: "build",
        locked: true,
        metadata_packet_ref:
          "cgg://packets/work-design-context/pkg-design-757/context-brief-v1",
        name: "Sketch Evidence Context Pass",
        note: "Accepted context only captured an ambiguous freeform sketch. Build Tree should start from the selected Epic shell and treat the snapshot as evidence, not as interpreted scope.",
        saved_at: "2026-06-01T05:14:00+08:00",
        session_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-757/context-pass-01",
        snapshot_artifact: {
          artifact_id:
            "artifact://work-design/pkg-design-757/context-pass-01/snapshot-v1",
          attachment_ref: null,
          attachment_status: "pending_apply",
          board_snapshot_ref:
            "wgcf://workflows/delivery-work-design/pkg-design-757/context-pass-01/snapshot-v1",
          checksum: "sha256:mock-ambiguous-sketch-context-snapshot-v1",
          content_type: "image/png",
          description:
            "Finalized Work Design freeform sketch snapshot for OpenProject Epic #757.",
          file_name: "work-design-context-epic-757-sketch-evidence-v1.png",
          rendered_content_base64_ref:
            "mock://work-design/pkg-design-757/context-pass-01/sketch-snapshot-v1.png",
          target_record_ref: "openproject://work_packages/757",
        },
        version: "v1 locked",
        workspace_snapshot_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-757/context-pass-01/snapshot-v1",
      },
      workflow_phase: "work_design",
    },
    {
      available_actions: readOnlyActions,
      backend_status: "new",
      delivery_package_id: "pkg-design-758",
      display_name: "Scattered Shape Context",
      legacy_epic_id: 758,
      open_child_count: 0,
      package_posture: "Ready",
      source_ref: "OpenProject Epic #758",
      summary:
        "Finalized context brief captured disconnected shapes and labels with no confirmed structure. Build Tree must start from the Epic shell.",
      target_pi: null,
      tone: "info",
      tree_root_id: "node-design-758",
      work_design_context_session: {
        accepted: true,
        board_snapshot: scatteredShapeWorkDesignBoardSnapshot,
        carried_metadata: [
          {
            label: "Decision",
            tone: "ok",
            value: "Proceed with Work Design",
          },
          {
            label: "Source",
            tone: "info",
            value: "OpenProject Epic #758",
          },
          {
            label: "Evidence Mode",
            tone: "warn",
            value: "Loose shapes captured; relationships unknown.",
          },
          {
            label: "Next Surface",
            tone: "warn",
            value: "Build Tree",
          },
        ],
        decision: "proceed",
        finalized_at: "2026-06-01T05:42:00+08:00",
        finalized_by: "operator:mshaf7",
        initial_step: "build",
        locked: true,
        metadata_packet_ref:
          "cgg://packets/work-design-context/pkg-design-758/context-brief-v1",
        name: "Scattered Shape Context Pass",
        note: "Accepted context captured random loose shapes and labels, but no confirmed build seeds. Build Tree starts from the selected Epic shell and the shape snapshot stays evidence only.",
        saved_at: "2026-06-01T05:36:00+08:00",
        session_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-758/context-pass-01",
        snapshot_artifact: {
          artifact_id:
            "artifact://work-design/pkg-design-758/context-pass-01/snapshot-v1",
          attachment_ref: null,
          attachment_status: "pending_apply",
          board_snapshot_ref:
            "wgcf://workflows/delivery-work-design/pkg-design-758/context-pass-01/snapshot-v1",
          checksum: "sha256:mock-scattered-shape-context-snapshot-v1",
          content_type: "image/png",
          description:
            "Finalized Work Design unclassified shape snapshot for OpenProject Epic #758.",
          file_name: "work-design-context-epic-758-scattered-shapes-v1.png",
          rendered_content_base64_ref:
            "mock://work-design/pkg-design-758/context-pass-01/scattered-shapes-v1.png",
          target_record_ref: "openproject://work_packages/758",
        },
        version: "v1 locked",
        workspace_snapshot_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-758/context-pass-01/snapshot-v1",
      },
      workflow_phase: "work_design",
    },
  ];
