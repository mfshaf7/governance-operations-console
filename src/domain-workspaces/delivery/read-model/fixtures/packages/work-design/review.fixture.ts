import type { DeliveryPackageFixture } from "../../../../domain/delivery-types.ts";

import { readOnlyActions } from "../actions.fixture.ts";

export const deliveryWorkDesignReviewPackageFixtures: DeliveryPackageFixture[] =
  [
    {
      available_actions: readOnlyActions,
      backend_status: "new",
      delivery_package_id: "pkg-design-735",
      display_name: "Apply Sequence Ready",
      legacy_epic_id: 735,
      open_child_count: 0,
      package_posture: "Ready",
      source_ref: "OpenProject Epic #735",
      summary:
        "Ready package for the normal Review Draft to Apply Draft path. No source-owned blocker is active.",
      target_pi: null,
      tone: "warn",
      tree_root_id: "node-design-735",
      work_design_context_session: {
        accepted: true,
        board_snapshot: {
          title: "Apply Sequence Ready",
          summary:
            "Finalized board snapshot for a small Work Design package that can move from Review Draft into Apply Draft.",
          nodes: [
            {
              label: "SOURCE",
              title: "OpenProject Epic #735",
              summary:
                "Ready package used to inspect the normal apply sequence.",
              tone: "info",
            },
            {
              label: "TREE",
              title: "Small Draft Tree Ready",
              summary: "One Feature and one User story are ready for review.",
              tone: "ok",
            },
            {
              label: "APPLY",
              title: "Normal Apply Path",
              summary:
                "Apply Draft checks validation, backend update, snapshot attach, and receipt return in sequence.",
              tone: "warn",
            },
            {
              label: "HISTORY",
              title: "Receipt History",
              summary:
                "After Apply completes, the receipt archive carries the local proof for inspection.",
              tone: "ok",
            },
          ],
        },
        carried_metadata: [
          {
            label: "Decision",
            tone: "ok",
            value: "Proceed with Work Design",
          },
          {
            label: "Source",
            tone: "info",
            value: "OpenProject Epic #735",
          },
          {
            label: "Workflow Purpose",
            tone: "warn",
            value: "Normal apply path; not a source-owned blocker.",
          },
          {
            label: "Next Surface",
            tone: "warn",
            value: "Review Draft",
          },
        ],
        decision: "proceed",
        finalized_at: "2026-06-01T06:05:00+08:00",
        finalized_by: "operator:mshaf7",
        generated_tree: {
          children: [
            {
              children: [
                {
                  description:
                    "Draft User story for moving the reviewed Work Design package through Apply Draft.",
                  draft_body:
                    "## What This Achieves\nRun the normal Work Design Apply Draft sequence without changing a source-owned blocker record.\n\n## Why This Matters Now\nThe operator needs a clean package that reaches Apply Draft quickly.\n\n## Evidence Expectation\nApply Draft returns a local preview receipt and exposes the receipt history.",
                  id: "pkg-design-735-story-1",
                  kind: "User story",
                  remark: "Use Review Draft, then Apply Draft.",
                  title: "User Story 1 - Apply Sequence Is Explicit",
                  tone: "info",
                },
              ],
              description: "Feature branch for the normal local apply path.",
              draft_body:
                "## What This Achieves\nProvide one small Work Design package that can reach Apply Draft quickly.\n\n## Benefit Hypothesis\nOperators can inspect the normal Apply Draft sequence with a clean ready package.\n\n## Scope Boundaries\nThis package uses prototype-local apply state. It does not represent a source-owned OpenProject blocker.\n\n## Evidence Expectation\nApply Draft records the preview receipt and returns to the history archive.",
              id: "pkg-design-735-feature-1",
              kind: "Feature",
              remark: "Dedicated local apply path.",
              title: "Feature 1 - Apply Sequence Ready",
              tone: "info",
            },
          ],
          description:
            "Small draft Epic shell for normal local Apply Draft behavior.",
          draft_body:
            "## What This Initiative Achieves\nMake Work Design Apply Draft behavior easy to inspect with one small ready package.\n\n## Current Work Design Focus\nReview the draft, open Apply Draft, and confirm the normal receipt path.\n\n## Scope Boundaries\nThis package is prototype-local. Source-owned blockers remain outside this normal apply path.\n\n## Operator Handoff Note\nUse this package to inspect the normal apply sequence and receipt history.",
          id: "pkg-design-735-epic",
          kind: "Epic",
          remark: "Prototype-local package for normal apply behavior.",
          title: "Epic #735 - Apply Sequence Ready",
          tone: "info",
        },
        initial_step: "review",
        locked: true,
        metadata_packet_ref:
          "cgg://packets/work-design-context/pkg-design-735/context-brief-v1",
        name: "Apply Sequence Ready",
        note: "This package is ready for Review Draft. Mark reviewed, open Apply Draft, and run Apply Work Design to inspect the normal receipt path.",
        saved_at: "2026-06-01T06:00:00+08:00",
        session_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-735/context-pass-01",
        snapshot_artifact: {
          artifact_id:
            "artifact://work-design/pkg-design-735/context-pass-01/snapshot-v1",
          attachment_ref: null,
          attachment_status: "pending_apply",
          board_snapshot_ref:
            "wgcf://workflows/delivery-work-design/pkg-design-735/context-pass-01/snapshot-v1",
          checksum: "sha256:mock-apply-sequence-ready-context-v1",
          content_type: "image/png",
          description:
            "Finalized Work Design context board snapshot for the apply sequence ready package.",
          file_name: "work-design-context-epic-735-apply-sequence-ready-v1.png",
          rendered_content_base64_ref:
            "mock://work-design/pkg-design-735/context-pass-01/snapshot-v1.png",
          target_record_ref: "openproject://work_packages/735",
        },
        version: "v1 locked",
        workspace_snapshot_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-735/context-pass-01/snapshot-v1",
      },
      workflow_phase: "work_design",
    },
    {
      available_actions: readOnlyActions,
      backend_status: "new",
      delivery_package_id: "pkg-design-748",
      display_name: "Workspace Diagram Review Draft",
      legacy_epic_id: 748,
      open_child_count: 0,
      package_posture: "Ready",
      source_ref: "OpenProject Epic #748",
      summary:
        "Context brief and draft tree are complete; operator needs to review the Work Design draft before Apply Draft.",
      target_pi: null,
      tone: "info",
      tree_root_id: "node-design-748",
      work_design_context_session: {
        accepted: true,
        board_snapshot: {
          title: "Workspace Diagram Draft Review",
          summary:
            "Finalized board snapshot records the accepted design direction and the attached draft tree that is ready for operator review.",
          nodes: [
            {
              label: "SOURCE",
              title: "OpenProject Epic #748",
              summary:
                "Accepted source shell for the diagram workspace design.",
              tone: "info",
            },
            {
              label: "BRIEF",
              title: "Design Context Locked",
              summary:
                "Context session accepted proceed and locked the handoff packet.",
              tone: "ok",
            },
            {
              label: "TREE",
              title: "Draft Tree Attached",
              summary:
                "Feature, User story, and Risk branches are ready for review.",
              tone: "warn",
            },
            {
              label: "NEXT",
              title: "Review Draft",
              summary:
                "Operator reviews the tree and handoff note before Apply Draft.",
              tone: "warn",
            },
          ],
        },
        carried_metadata: [
          {
            label: "Decision",
            tone: "ok",
            value: "Proceed with Work Design",
          },
          {
            label: "Source",
            tone: "info",
            value: "OpenProject Epic #748",
          },
          {
            label: "Boundary",
            tone: "warn",
            value:
              "Work Design owns tree shape; Refinement owns execution metadata.",
          },
          {
            label: "Next Surface",
            tone: "warn",
            value: "Review Draft",
          },
        ],
        decision: "proceed",
        finalized_at: "2026-06-01T03:05:00+08:00",
        finalized_by: "operator:mshaf7",
        generated_tree: {
          children: [
            {
              children: [
                {
                  description:
                    "Draft User story for selecting diagram templates without forcing a new template onto the canvas.",
                  draft_body:
                    "## What This Achieves\nLet the operator browse diagram types and create a starter only when explicitly requested.\n\n## Why This Matters Now\nThe workspace must not create duplicate templates just because the operator needs related tools.\n\n## Evidence Expectation\nThe toolbar separates diagram selection, component access, and starter creation clearly in review.",
                  id: "pkg-design-748-story-1",
                  kind: "User story",
                  remark:
                    "Keep template creation explicit; component access should not mutate the board.",
                  title: "User Story 1 - Explicit Template Creation",
                  tone: "info",
                },
                {
                  description:
                    "Draft User story for exposing diagram-specific labels without creating special connector primitives.",
                  draft_body:
                    "## What This Achieves\nProvide diagram grammar labels as movable label components rather than connector-owned text.\n\n## Why This Matters Now\nOperators need UML, flowchart, and swimlane labels without losing connector simplicity.\n\n## Evidence Expectation\nReview shows label components can be placed near connectors and still be edited, colored, moved, and deleted.",
                  id: "pkg-design-748-story-2",
                  kind: "User story",
                  remark:
                    "Use label components for grammar hints; keep connectors generic.",
                  title: "User Story 2 - Diagram Labels Stay Independent",
                  tone: "info",
                },
              ],
              description:
                "Feature branch for keeping diagram tools discoverable without accidental canvas mutation.",
              draft_body:
                "## What This Achieves\nSeparate diagram style selection, related components, and explicit starter creation in the Work Design board.\n\n## Benefit Hypothesis\nA clear tool route lets operators work faster while avoiding accidental sample templates.\n\n## Scope Boundaries\nThis branch covers workspace tool grammar only. Backend persistence and export remain future apply/refinement concerns.\n\n## Evidence Expectation\nReview Draft can show the toolbar route, template creation rule, and label-component rule.\n\n## Operator work notes\nStored from the accepted context brief after the toolbar drift was corrected.",
              id: "pkg-design-748-feature-1",
              kind: "Feature",
              remark:
                "Toolbar grammar should not create board state until the operator asks for it.",
              title: "Feature 1 - Diagram Tool Grammar",
              tone: "info",
            },
            {
              children: [
                {
                  description:
                    "Draft User story for preserving the finalized canvas snapshot as reviewable evidence.",
                  draft_body:
                    "## What This Achieves\nCarry the finalized context snapshot forward as an attachment candidate for the ART Epic.\n\n## Why This Matters Now\nThe design discussion should remain inspectable after Work Design moves to Apply Draft.\n\n## Evidence Expectation\nReview can see snapshot ref, attachment file name, finalization checks, and metadata packet before apply.",
                  id: "pkg-design-748-story-3",
                  kind: "User story",
                  remark:
                    "Snapshot preview is visual evidence; OOS still owns the later attachment route.",
                  title: "User Story 3 - Snapshot Evidence Carries Forward",
                  tone: "info",
                },
              ],
              description:
                "Feature branch for preserving context evidence through Review Draft and Apply Draft.",
              draft_body:
                "## What This Achieves\nMake the finalized context brief, snapshot artifact, finalization checks, and handoff note visible before Apply Draft.\n\n## Benefit Hypothesis\nOperators can approve the draft with enough evidence to catch missing context before backend routing begins.\n\n## Scope Boundaries\nWork Design exposes evidence and draft shape. OOS and future orchestration own backend upload, receipt, and materialization.\n\n## Evidence Expectation\nReview Draft shows finalization checks, draft tree metrics, and handoff note as the review gate input.\n\n## Operator work notes\nReview should verify evidence readability and tree coherence before apply.",
              id: "pkg-design-748-feature-2",
              kind: "Feature",
              remark:
                "Evidence must be visible in Review Draft before Apply Draft can use it.",
              title: "Feature 2 - Review Evidence Carry Forward",
              tone: "info",
            },
            {
              description:
                "Risk branch for UI drift between the context board and the attached draft tree.",
              draft_body:
                "## Risk Event\nThe visual context board and draft tree can drift if review only checks one of them.\n\n## Impact\nThe operator may approve a tree that no longer represents the accepted context decision.\n\n## Current Handling\nReview Draft must compare finalization checks, finalized snapshot, handoff note, and draft tree metrics before apply.",
              id: "pkg-design-748-risk-1",
              kind: "Risk",
              remark: "Keep context snapshot and draft tree visible in review.",
              title: "Risk 1 - Context And Tree Drift",
              tone: "warn",
            },
          ],
          description:
            "Draft Epic shell stored from the finalized context brief. Review Draft is the current required step.",
          draft_body:
            "## What This Initiative Achieves\nShape the Workspace Diagram board into a reviewable Work Design draft that preserves diagram grammar, context evidence, and draft tree boundaries.\n\n## Current Work Design Focus\nPrepare the package for Refinement by making the draft tree and context evidence coherent before Apply Draft.\n\n## Scope Boundaries\nWork Design owns draft shape and visual context evidence. Refinement owns execution metadata and future backend routing detail.\n\n## Operator Handoff Note\nReview the toolbar grammar, template creation rule, independent label components, snapshot carry-forward, and context/tree drift risk before applying the draft.",
          id: "pkg-design-748-epic",
          kind: "Epic",
          remark:
            "Draft tree is ready for operator review; do not add execution metadata here.",
          title: "Epic #748 - Workspace Diagram Review Draft",
          tone: "info",
        },
        initial_step: "review",
        locked: true,
        metadata_packet_ref:
          "cgg://packets/work-design-context/pkg-design-748/context-brief-v1",
        name: "Workspace Diagram Context Pass",
        note: "Accepted context says this package should move directly into Review Draft. The draft tree should be checked for toolbar grammar, snapshot evidence, independent labels, and context/tree drift before Apply Draft.",
        saved_at: "2026-06-01T03:00:00+08:00",
        session_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-748/context-pass-01",
        snapshot_artifact: {
          artifact_id:
            "artifact://work-design/pkg-design-748/context-pass-01/snapshot-v1",
          attachment_ref: null,
          attachment_status: "pending_apply",
          board_snapshot_ref:
            "wgcf://workflows/delivery-work-design/pkg-design-748/context-pass-01/snapshot-v1",
          checksum: "sha256:mock-workspace-diagram-context-snapshot-v1",
          content_type: "image/png",
          description:
            "Finalized Work Design context board snapshot for OpenProject Epic #748.",
          file_name: "work-design-context-epic-748-context-pass-01-v1.png",
          rendered_content_base64_ref:
            "mock://work-design/pkg-design-748/context-pass-01/snapshot-v1.png",
          target_record_ref: "openproject://work_packages/748",
        },
        version: "v1 locked",
        workspace_snapshot_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-748/context-pass-01/snapshot-v1",
      },
      workflow_phase: "work_design",
    },
  ];
