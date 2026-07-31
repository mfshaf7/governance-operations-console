import type { DeliveryPackageFixture } from "../../../../domain/delivery-types.ts";

import { readOnlyActions } from "../actions.fixture.ts";

export const deliveryWorkDesignContextPackageFixtures: DeliveryPackageFixture[] =
  [
    {
      available_actions: readOnlyActions,
      backend_status: "new",
      delivery_package_id: "pkg-design-724",
      display_name: "Control Fabric ART Design",
      legacy_epic_id: 724,
      open_child_count: 0,
      package_posture: "Ready",
      source_ref: "OpenProject Epic #724",
      summary:
        "Finalized context brief has a draft tree attached for Build Tree inspection before review.",
      target_pi: null,
      tone: "info",
      tree_root_id: "node-design-724",
      work_design_context_session: {
        accepted: true,
        board_snapshot: {
          title: "WGCF/OOS Boundary And Draft Path",
          summary:
            "Finalized board snapshot records that this is new WGCF ART design work, not a duplicate, and that OOS only owns the later apply adapter.",
          nodes: [
            {
              label: "SOURCE",
              title: "OpenProject Epic #724",
              summary: "Accepted source shell is the Work Design input.",
              tone: "info",
            },
            {
              label: "CONTEXT",
              title: "No Active Duplicate",
              summary: "Existing ART map does not carry the same design scope.",
              tone: "ok",
            },
            {
              label: "BOUNDARY",
              title: "WGCF Drafts / OOS Applies",
              summary: "Keep tree design and backend apply authority separate.",
              tone: "warn",
            },
            {
              label: "HANDOFF",
              title: "Build Tree Next",
              summary:
                "Create Features, User stories, and risk branch before review.",
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
            value: "OpenProject Epic #724",
          },
          {
            label: "Boundary",
            tone: "warn",
            value: "WGCF owns draft tree; OOS owns later apply adapter.",
          },
          {
            label: "Next Surface",
            tone: "warn",
            value: "Build Tree",
          },
        ],
        decision: "proceed",
        finalized_at: "2026-06-01T01:45:00+08:00",
        finalized_by: "operator:mshaf7",
        generated_tree: {
          children: [
            {
              children: [
                {
                  description:
                    "Draft User story for the operator-facing validation plan produced by the context brief.",
                  draft_body:
                    "## What This Achieves\nShow which readiness checks belong to WGCF before the Work Design tree is applied.\n\n## Why This Matters Now\nThe operator needs validation ownership visible before the draft reaches Apply Draft.\n\n## Evidence Expectation\nThe review surface can show the WGCF validation expectation without implying that OOS mutates governance state.",
                  id: "pkg-design-724-story-1",
                  kind: "User story",
                  remark:
                    "Keep validation ownership explicit before the draft reaches Apply Draft.",
                  title: "User Story 1 - Validation Ownership Is Visible",
                  tone: "info",
                },
                {
                  description:
                    "Draft User story for preserving receipt and evidence references across the handoff.",
                  draft_body:
                    "## What This Achieves\nPreserve receipt and source references so later Refinement can repair metadata without guessing.\n\n## Why This Matters Now\nThe draft tree is the handoff between context design and backend-safe refinement.\n\n## Evidence Expectation\nContext snapshot, metadata packet, and source Epic references are visible before review.",
                  id: "pkg-design-724-story-2",
                  kind: "User story",
                  remark:
                    "Carry source and receipt references forward; do not create execution metadata here.",
                  title: "User Story 2 - Evidence Travels With Draft",
                  tone: "info",
                },
              ],
              description:
                "Feature branch stored from the context brief for the governance validation side of the design.",
              draft_body:
                "## What This Achieves\nDefine the operator-visible WGCF validation boundary for Work Design draft review and apply.\n\n## Benefit Hypothesis\nClear validation ownership keeps the operator from mistaking design review for direct backend mutation.\n\n## Scope Boundaries\nThe branch describes validation and receipt expectations only. OOS remains the apply adapter and execution metadata stays out of Work Design.\n\n## Evidence Expectation\nReview Draft can show the WGCF validation expectation and the Apply Draft receipt path.\n\n## Operator work notes\nStored from the finalized board boundary: WGCF validates, OOS applies.",
              id: "pkg-design-724-feature-1",
              kind: "Feature",
              remark:
                "Stored from the finalized board boundary: WGCF validates, OOS applies.",
              title: "Feature 1 - Governed Draft Validation",
              tone: "info",
            },
            {
              children: [
                {
                  description:
                    "Draft User story for keeping the apply adapter narrow and auditable.",
                  draft_body:
                    "## What This Achieves\nSend a clean Work Design intent to OOS instead of UI-local tree state.\n\n## Why This Matters Now\nApply Draft must stay auditable before future orchestration work wires the real route.\n\n## Evidence Expectation\nApply Draft can show the draft ref, snapshot artifact, and expected OOS route before the operator approves it.",
                  id: "pkg-design-724-story-3",
                  kind: "User story",
                  remark:
                    "Apply intent should carry draft and snapshot references, not direct OpenProject writes.",
                  title: "User Story 3 - OOS Receives Apply Intent",
                  tone: "info",
                },
                {
                  description:
                    "Draft User story for attachment carry-forward into the ART Epic.",
                  draft_body:
                    "## What This Achieves\nCarry the finalized context snapshot into the target ART Epic when Work Design is applied.\n\n## Why This Matters Now\nThe visual design discussion must remain inspectable after the tree leaves Work Design.\n\n## Evidence Expectation\nApply receipt reports snapshot attachment status, target record, and filename.",
                  id: "pkg-design-724-story-4",
                  kind: "User story",
                  remark:
                    "Snapshot upload is backend-owned and must appear in the receipt.",
                  title: "User Story 4 - Context Snapshot Becomes ART Evidence",
                  tone: "info",
                },
              ],
              description:
                "Feature branch stored from the context brief for the OOS apply adapter handoff.",
              draft_body:
                "## What This Achieves\nPrepare the Work Design apply handoff so OOS can route the draft tree and context snapshot to the correct backend path.\n\n## Benefit Hypothesis\nA single apply intent prevents the console from splitting draft tree state, snapshot evidence, and receipt state into conflicting records.\n\n## Scope Boundaries\nThe UI may render and preview the snapshot, but the OOS apply path owns upload and receipt status.\n\n## Evidence Expectation\nApply Draft shows the draft ref, snapshot artifact, target record, and attachment status.\n\n## Operator work notes\nStored from the context decision that OOS owns apply, not planning.",
              id: "pkg-design-724-feature-2",
              kind: "Feature",
              remark:
                "Stored from the context decision that OOS owns apply, not planning.",
              title: "Feature 2 - OOS Work Design Apply Adapter",
              tone: "info",
            },
            {
              description:
                "Risk branch stored from the context brief for adapter and ownership drift.",
              draft_body:
                "## Risk Event\nWork Design can drift if snapshot evidence, draft tree state, and OOS apply intent are treated as separate records.\n\n## Impact\nThe operator may approve a draft tree without durable context evidence attached to the ART package.\n\n## Current Handling\nKeep snapshot artifact metadata visible through Build Tree, Review Draft, Apply Draft, and receipt.",
              id: "pkg-design-724-risk-1",
              kind: "Risk",
              remark: "Do not let snapshot evidence become a UI-only preview.",
              title: "Risk 1 - Snapshot Evidence Drift",
              tone: "warn",
            },
          ],
          description:
            "Draft Epic shell stored from the finalized Context Brief. Build Tree inspects and corrects this draft before review.",
          draft_body:
            "## What This Initiative Achieves\nShape Control Fabric ART Design into a Work Design draft tree that preserves the WGCF/OOS boundary and carries context snapshot evidence forward.\n\n## Current Work Design Focus\nPrepare the package for Refinement without assigning final PI placement in Work Design.\n\n## Scope Boundaries\nWork Design owns draft tree shape, context evidence, and handoff notes. Refinement owns execution metadata and backend-safe materialization.\n\n## Operator Handoff Note\nInspect validation ownership, OOS apply adapter scope, snapshot attachment carry-forward, and evidence drift risk before moving to Review Draft.",
          id: "pkg-design-724-epic",
          kind: "Epic",
          remark:
            "Stored from finalized Context Brief v1. Execution metadata belongs to Refinement.",
          title: "Epic #724 - Control Fabric ART Design",
          tone: "info",
        },
        initial_step: "build",
        locked: true,
        metadata_packet_ref:
          "cgg://packets/work-design-context/pkg-design-724/context-brief-v1",
        name: "Control Fabric Context Pass",
        note: "Accepted context says this package should create a new draft tree for WGCF ART design. Build Tree should preserve the OOS/WGCF boundary, avoid execution metadata, and carry adapter-risk notes forward for Refinement.",
        saved_at: "2026-06-01T01:40:00+08:00",
        session_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-724/context-pass-01",
        snapshot_artifact: {
          artifact_id:
            "artifact://work-design/pkg-design-724/context-pass-01/snapshot-v1",
          attachment_ref: null,
          attachment_status: "pending_apply",
          board_snapshot_ref:
            "wgcf://workflows/delivery-work-design/pkg-design-724/context-pass-01/snapshot-v1",
          checksum: "sha256:mock-control-fabric-context-snapshot-v1",
          content_type: "image/png",
          description:
            "Finalized Work Design context board snapshot for OpenProject Epic #724.",
          file_name: "work-design-context-epic-724-context-pass-01-v1.png",
          rendered_content_base64_ref:
            "mock://work-design/pkg-design-724/context-pass-01/snapshot-v1.png",
          target_record_ref: "openproject://work_packages/724",
        },
        version: "v1 locked",
        workspace_snapshot_ref:
          "wgcf://workflows/delivery-work-design/pkg-design-724/context-pass-01/snapshot-v1",
      },
      workflow_phase: "work_design",
    },
  ];
