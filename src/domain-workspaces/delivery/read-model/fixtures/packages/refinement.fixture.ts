import type {
  DeliveryPackageFixture,
  DeliveryWorkDesignDraftNode,
} from "../../../domain/delivery-types.ts";

import { readOnlyActions } from "./actions.fixture.ts";
import { refinementPacket } from "./refinement-helpers.fixture.ts";
import { complexWorkDesignGeneratedTree } from "./work-design/artifacts.fixture.ts";

export const deliveryRefinementPackageFixtures: DeliveryPackageFixture[] = [
  {
    available_actions: readOnlyActions,
    backend_status: "ready",
    delivery_package_id: "pkg-refinement-756",
    display_name: "Complex Package Review Stress",
    legacy_epic_id: 756,
    open_child_count: 40,
    package_posture: "Ready",
    source_ref: "OpenProject Epic #756",
    summary:
      "Work Design applied a large package tree and complex diagram snapshot. Refinement owns metadata materialization next.",
    target_pi: null,
    tone: "warn",
    tree_root_id: "pkg-design-756-epic",
    refinement_packet: refinementPacket({
      briefLabel: "v2",
      deliveryPackageId: "pkg-refinement-756",
      displayName: "Complex Package Review Stress",
      legacyEpicId: 756,
      sourceWorkDesignPackageId: "pkg-design-756",
      targetPi: null,
      targetTree: complexWorkDesignGeneratedTree,
      treeRootId: "pkg-design-756-epic",
      groupOverrides: {
        governance: {
          summary:
            "Large Work Design package needs Target PI and owner metadata before execution control.",
          tone: "warn",
          fields: [
            {
              label: "Target PI",
              status: "missing",
              value: "Missing",
            },
            {
              label: "Owner Repo",
              status: "dirty",
              value: "workspace-prototype-studio",
            },
            {
              label: "Delivery Team",
              target_values: {},
            },
          ],
        },
        children: {
          summary:
            "Large tree metadata needs item-scoped review across Features, User stories, and Risks.",
          tone: "warn",
          fields: [
            {
              label: "Feature Classification",
              target_values: {},
            },
            {
              label: "Definition of Ready",
              status: "complete",
              target_node_ids: [],
              target_values: definitionOfReadyValuesFromWorkDesignTree(
                complexWorkDesignGeneratedTree,
              ),
              value: "Derived from Work Design story readiness narrative.",
            },
          ],
        },
        objective: {
          fields: [
            {
              label: "Assignee",
              target_values: {},
            },
            {
              label: "Responsible",
              target_values: {},
            },
            {
              label: "Business Value",
              target_values: {},
            },
          ],
        },
      },
      gates: [
        {
          detail:
            "Work Design applied the large-tree stress package and preserved finalized context evidence.",
          gate_id: "pkg-refinement-756-gate-handoff",
          label: "Work Design Handoff",
          status: "passed",
          tone: "ok",
        },
        {
          detail:
            "Target PI is intentionally missing so Refinement can own placement.",
          gate_id: "pkg-refinement-756-gate-pi",
          label: "PI Placement",
          oos_route: "POST /v1/delivery-initiatives/{delivery_id}/governance",
          status: "open",
          tone: "warn",
        },
        {
          detail:
            "Large package child metadata must be reviewed item-by-item before apply.",
          gate_id: "pkg-refinement-756-gate-child-metadata",
          label: "Child Metadata",
          oos_route: "POST /v1/delivery-work-items/bulk-update",
          status: "open",
          tone: "warn",
        },
      ],
    }),
    workflow_phase: "refinement",
  },
  {
    available_actions: readOnlyActions,
    backend_status: "ready",
    delivery_package_id: "pkg-refinement-760",
    display_name: "Adapter Contract Metadata Repair",
    legacy_epic_id: 760,
    open_child_count: 7,
    package_posture: "Ready",
    source_ref: "OpenProject Epic #760",
    summary:
      "Package tree exists, but execution metadata still needs whole-package completion before it can enter the board.",
    target_pi: "PI-2026-03",
    tone: "warn",
    tree_root_id: "node-refinement-760",
    refinement_packet: refinementPacket({
      deliveryPackageId: "pkg-refinement-760",
      displayName: "Adapter Contract Metadata Repair",
      legacyEpicId: 760,
      targetPi: "PI-2026-03",
      treeRootId: "node-refinement-760",
      groupOverrides: {
        children: {
          summary:
            "Adapter stories need execution classification and Definition of Ready before the board can pick an execution target.",
          tone: "warn",
          fields: [
            {
              label: "Definition of Ready",
              status: "dirty",
              target_node_ids: ["node-refinement-760-story-2"],
              value: "Definition of Ready needs operator confirmation",
            },
          ],
        },
      },
      gates: [
        {
          detail:
            "Applied Work Design receipt and finalized brief are present.",
          gate_id: "pkg-refinement-760-gate-handoff",
          label: "Work Design Handoff",
          status: "passed",
          tone: "ok",
        },
        {
          detail: "One child story still needs ready/done field confirmation.",
          gate_id: "pkg-refinement-760-gate-child-metadata",
          label: "Child Metadata",
          oos_route: "POST /v1/delivery-work-items/bulk-update",
          status: "open",
          tone: "warn",
        },
        {
          detail:
            "Target PI and iteration can be applied through OOS planning routes.",
          gate_id: "pkg-refinement-760-gate-pi",
          label: "PI Placement",
          oos_route: "POST /v1/delivery-initiatives/{delivery_id}/governance",
          status: "passed",
          tone: "ok",
        },
      ],
    }),
    workflow_phase: "refinement",
  },
  {
    available_actions: readOnlyActions,
    backend_status: "ready",
    delivery_package_id: "pkg-refinement-766",
    display_name: "WGCF Receipt Refinement",
    legacy_epic_id: 766,
    open_child_count: 9,
    package_posture: "Ready",
    source_ref: "OpenProject Epic #766",
    summary:
      "Whole-package metadata is mostly complete but milestone checkpoint rules still need review.",
    target_pi: "PI-2026-03",
    tone: "warn",
    tree_root_id: "node-refinement-766",
    refinement_packet: refinementPacket({
      activeStep: "readiness_review",
      deliveryPackageId: "pkg-refinement-766",
      displayName: "WGCF Receipt Refinement",
      legacyEpicId: 766,
      targetPi: "PI-2026-03",
      treeRootId: "node-refinement-766",
      groupOverrides: {
        children: {
          summary:
            "Milestone checkpoints are drafted, but checkpoint kind and exit condition still need review.",
          tone: "warn",
          fields: [
            {
              label: "Milestone Checkpoints",
              status: "dirty",
              target_node_ids: ["node-refinement-766-feature-1"],
              value: "checkpoint kind and exit condition need review",
            },
          ],
        },
      },
      gates: [
        {
          detail: "Work Design receipt links to the WGCF readiness package.",
          gate_id: "pkg-refinement-766-gate-handoff",
          label: "Work Design Handoff",
          status: "passed",
          tone: "ok",
        },
        {
          detail: "Milestone is allowed only as an Epic-level checkpoint.",
          gate_id: "pkg-refinement-766-gate-milestone",
          label: "Milestone Shape",
          oos_route: "POST /v1/delivery-work-items",
          status: "warning",
          tone: "warn",
        },
        {
          detail: "No blocker fields are being set by Refinement.",
          gate_id: "pkg-refinement-766-gate-blocker-boundary",
          label: "Blocker Boundary",
          status: "passed",
          tone: "ok",
        },
      ],
    }),
    workflow_phase: "refinement",
  },
  {
    active_blocker: {
      decision_path: "remove",
      discovered_on: "2026-05-27",
      impact:
        "Refinement cannot apply execution metadata until the security boundary owner is accepted.",
      justification:
        "The blocked package must retain an explicit blocker record because Refinement cannot clear security-boundary ownership by editing metadata alone.",
      owner: "security-architecture",
      statement:
        "Security boundary owner is unresolved for OpenProject Epic #771.",
    },
    available_actions: readOnlyActions,
    backend_status: "blocked",
    delivery_package_id: "pkg-refinement-771",
    display_name: "Security Boundary Metadata Block",
    legacy_epic_id: 771,
    open_child_count: 5,
    package_posture: "Blocked",
    source_ref: "OpenProject Epic #771",
    summary:
      "Refinement is blocked until security boundary ownership is accepted.",
    target_pi: "PI-2026-03",
    tone: "danger",
    tree_root_id: "node-refinement-771",
    refinement_packet: refinementPacket({
      activeStep: "readiness_review",
      deliveryPackageId: "pkg-refinement-771",
      displayName: "Security Boundary Metadata Block",
      legacyEpicId: 771,
      status: "blocked",
      targetPi: "PI-2026-03",
      treeRootId: "node-refinement-771",
      groupOverrides: {
        governance: {
          summary:
            "Security boundary owner is blocked and must route through blocker workflow before apply.",
          tone: "danger",
          fields: [
            {
              label: "Owner Repo",
              status: "blocked",
              target_node_ids: ["node-refinement-771"],
              value: "security boundary owner not accepted",
            },
          ],
        },
      },
      gates: [
        {
          detail: "Security boundary ownership is unresolved.",
          gate_id: "pkg-refinement-771-gate-owner",
          label: "Boundary Owner",
          status: "blocked",
          tone: "danger",
        },
        {
          detail:
            "Use the bounded blocker workflow; Refinement cannot clear blocked status.",
          gate_id: "pkg-refinement-771-gate-blocker",
          label: "Blocker Route Required",
          oos_route: "POST /v1/delivery-work-items/{work_item_id}/blocker",
          status: "blocked",
          tone: "danger",
        },
      ],
    }),
    workflow_phase: "refinement",
  },
  {
    available_actions: readOnlyActions,
    backend_status: "ready",
    delivery_package_id: "pkg-refinement-778",
    display_name: "Repository Onboarding Metadata",
    legacy_epic_id: 778,
    open_child_count: 4,
    package_posture: "Ready",
    source_ref: "OpenProject Epic #778",
    summary:
      "Owner repo and team metadata are ready for final readiness review.",
    target_pi: "PI-2026-04",
    tone: "warn",
    tree_root_id: "node-refinement-778",
    refinement_packet: refinementPacket({
      activeStep: "apply_refinement",
      deliveryPackageId: "pkg-refinement-778",
      displayName: "Repository Onboarding Metadata",
      legacyEpicId: 778,
      status: "ready_for_review",
      targetPi: "PI-2026-04",
      treeRootId: "node-refinement-778",
      gates: [
        {
          detail:
            "Applied Work Design receipt and finalized brief are present.",
          gate_id: "pkg-refinement-778-gate-handoff",
          label: "Work Design Handoff",
          status: "passed",
          tone: "ok",
        },
        {
          detail:
            "Owner repo, delivery team, assignee, and responsible are present.",
          gate_id: "pkg-refinement-778-gate-ownership",
          label: "Ownership Fields",
          status: "passed",
          tone: "ok",
        },
        {
          detail:
            "Apply plan is ready for OOS governance and plan apply routes.",
          gate_id: "pkg-refinement-778-gate-apply",
          label: "Apply Plan",
          status: "passed",
          tone: "ok",
        },
      ],
    }),
    workflow_phase: "refinement",
  },
  {
    available_actions: readOnlyActions,
    backend_status: "ready",
    delivery_package_id: "pkg-refinement-789",
    display_name: "Operator Workflow Metadata",
    legacy_epic_id: 789,
    open_child_count: 8,
    package_posture: "Ready",
    source_ref: "OpenProject Epic #789",
    summary:
      "Operator workflow metadata is complete enough for final review before board entry.",
    target_pi: "PI-2026-04",
    tone: "warn",
    tree_root_id: "node-refinement-789",
    refinement_packet: refinementPacket({
      activeStep: "apply_refinement",
      deliveryPackageId: "pkg-refinement-789",
      displayName: "Operator Workflow Metadata",
      legacyEpicId: 789,
      receipt: {
        applied_at: "2026-06-11T17:44:00+08:00",
        lines: [
          "OOS accepted Epic governance metadata.",
          "Plan apply reused 2 Features and updated 6 child records.",
          "No blocker fields were set or cleared by Refinement.",
        ],
        outcome: "accepted",
        receipt_id: "REFINE-789-v1",
        source_work_design_receipt_id: "WDS-APPLY-789-v1",
        tone: "ok",
      },
      status: "applied",
      targetPi: "PI-2026-04",
      treeRootId: "node-refinement-789",
    }),
    workflow_phase: "refinement",
  },
];

function definitionOfReadyValuesFromWorkDesignTree(
  tree: DeliveryWorkDesignDraftNode,
) {
  return Object.fromEntries(
    workDesignStoryNodes(tree).map((story) => [
      story.id,
      definitionOfReadyValueFromStory(story),
    ]),
  );
}

function workDesignStoryNodes(
  node: DeliveryWorkDesignDraftNode,
): DeliveryWorkDesignDraftNode[] {
  return [
    ...(node.kind === "User story" ? [node] : []),
    ...(node.children ?? []).flatMap(workDesignStoryNodes),
  ];
}

function definitionOfReadyValueFromStory(node: DeliveryWorkDesignDraftNode) {
  const outcome =
    markdownSection(node.draft_body, "What This Achieves") ?? node.description;
  const evidence =
    markdownSection(node.draft_body, "Evidence Expectation") ?? node.remark;

  return `Ready when this story delivers: ${cleanReadinessSentence(outcome)}. Evidence: ${cleanReadinessSentence(evidence)}.`;
}

function markdownSection(source: string | undefined, heading: string) {
  if (!source) {
    return null;
  }

  const sectionPattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = source.match(sectionPattern);
  const value = match?.[1]?.trim();

  return value && value.length > 0 ? value : null;
}

function cleanReadinessSentence(value: string) {
  return value.trim().replace(/\s+/g, " ").replace(/[.]+$/, "");
}
