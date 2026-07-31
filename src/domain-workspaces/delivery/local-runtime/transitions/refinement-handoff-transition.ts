import type {
  DeliveryPackageSummary,
  DeliveryRefinementDraftField,
  DeliveryRefinementFieldKind,
  DeliveryRefinementFieldRouteBinding,
  DeliveryRefinementFieldStatus,
  DeliveryRefinementPacket,
  DeliveryWorkDesignDraftNode,
} from "../../read-model/index.ts";

import type {
  LocalWorkDesignApplyRecord,
  LocalWorkDesignNode,
} from "./transition-record.ts";

export function projectLocalRefinementPackage(
  deliveryPackage: DeliveryPackageSummary,
  record: LocalWorkDesignApplyRecord,
  refinementPackageId = deliveryPackage.delivery_package_id,
): DeliveryPackageSummary {
  return {
    ...deliveryPackage,
    backend_status: "ready",
    delivery_package_id: refinementPackageId,
    open_child_count: countWorkDesignChildren(record.targetTree),
    package_posture: "Ready",
    refinement_packet: localRefinementPacket(
      deliveryPackage,
      record,
      refinementPackageId,
    ),
    summary:
      "Local Work Design apply produced a Refinement handoff packet. Complete metadata before execution control.",
    tone: "warn",
    workflow_phase: "refinement",
  };
}

export function countWorkDesignChildren(node: LocalWorkDesignNode): number {
  return (node.children ?? []).reduce(
    (total, child) => total + 1 + countWorkDesignChildren(child),
    0,
  );
}

function localRefinementPacket(
  deliveryPackage: DeliveryPackageSummary,
  record: LocalWorkDesignApplyRecord,
  refinementPackageId = deliveryPackage.delivery_package_id,
): DeliveryRefinementPacket {
  const deliveryPackageId = refinementPackageId;
  const workDesignPackageId = deliveryPackage.delivery_package_id;
  const legacyEpicId = deliveryPackage.legacy_epic_id;
  const treeRoot = workDesignNodeToDraftNode(record.targetTree);

  return {
    active_step: "metadata_draft",
    apply_plan: {
      expected_routes: [
        localRefinementRoutes.planning,
        localRefinementRoutes.governance,
        localRefinementRoutes.planApply,
        localRefinementRoutes.workItemCreate,
        localRefinementRoutes.workItemUpdate,
        localRefinementRoutes.bulkUpdate,
      ],
      operations: [
        {
          detail:
            "Write package-level governance fields from the applied Work Design handoff.",
          kind: "governance",
          label: "Update Epic Governance",
          operation_id: `${deliveryPackageId}-local-op-governance`,
          oos_route: localRefinementRoutes.governance,
          status: "planned",
          target: deliveryPackage.source_ref,
        },
        {
          detail:
            "Create the child planning shape from the applied Work Design tree.",
          kind: "plan_apply",
          label: "Create Child Plan",
          operation_id: `${deliveryPackageId}-local-op-plan-apply`,
          oos_route: localRefinementRoutes.planApply,
          status: "planned",
          target: treeRoot.id,
        },
        {
          detail:
            "Apply reviewed item-scoped metadata changes for the handoff tree.",
          kind: "bulk_update",
          label: "Apply Item Metadata Change Set",
          operation_id: `${deliveryPackageId}-local-op-bulk-update`,
          oos_route: localRefinementRoutes.bulkUpdate,
          status: "planned",
          target: "Reviewed ART item metadata targets",
        },
      ],
      summary:
        "Apply will use OOS planning routes and reviewed item-scoped metadata changes only. Execution Board actions and blocker set/clear stay outside this workflow.",
    },
    draft_groups: localRefinementDraftGroups(
      deliveryPackage,
      deliveryPackageId,
    ),
    handoff: {
      finalized_brief_ref: `brief://work-design/${workDesignPackageId}/finalized-local`,
      handoff_note:
        "Local Work Design apply created this Refinement handoff packet from the reviewed draft tree.",
      source_package_ref: `openproject://work_packages/${legacyEpicId}`,
      source_work_design_receipt_id: record.receiptId,
      status_label: "Work Design applied",
      tone: "ok",
      tree_snapshot_ref: `tree://work-design/${workDesignPackageId}/${treeRoot.id}`,
    },
    last_saved_at: record.appliedAt,
    packet_id: `refinement-packet-${legacyEpicId}-local`,
    readiness_gates: [
      {
        detail:
          "Local Work Design apply receipt and reviewed draft tree are present.",
        gate_id: `${deliveryPackageId}-local-gate-handoff`,
        label: "Work Design Handoff",
        status: "passed",
        tone: "ok",
      },
      {
        detail: deliveryPackage.target_pi
          ? `${deliveryPackage.target_pi} is carried from the source package.`
          : "Target PI must be selected before Refinement apply.",
        gate_id: `${deliveryPackageId}-local-gate-pi`,
        label: "PI Placement",
        oos_route: localRefinementRoutes.governance,
        status: deliveryPackage.target_pi ? "passed" : "open",
        tone: deliveryPackage.target_pi ? "ok" : "warn",
      },
      {
        detail:
          "Local handoff needs item-scoped metadata review before apply can run.",
        gate_id: `${deliveryPackageId}-local-gate-metadata`,
        label: "Metadata Workbench",
        oos_route: localRefinementRoutes.bulkUpdate,
        status: "open",
        tone: "warn",
      },
      {
        detail: "Blocker set/clear is not part of Refinement.",
        gate_id: `${deliveryPackageId}-local-gate-blocker-boundary`,
        label: "Blocker Boundary",
        oos_route: "POST /v1/delivery-work-items/{work_item_id}/blocker",
        status: "passed",
        tone: "ok",
      },
    ],
    receipt: null,
    status: "drafting",
    target_tree: treeRoot,
  };
}

function workDesignNodeToDraftNode(
  node: LocalWorkDesignNode,
): DeliveryWorkDesignDraftNode {
  return {
    children: node.children?.map(workDesignNodeToDraftNode),
    description: node.description,
    draft_body: node.draftBody,
    id: node.id,
    kind: node.kind,
    remark: node.remark,
    title: node.title,
    tone: node.tone,
  };
}

const localRefinementRoutes = {
  bulkUpdate: "POST /v1/delivery-work-items/bulk-update",
  governance: "POST /v1/delivery-initiatives/{delivery_id}/governance",
  planApply: "POST /v1/delivery-initiatives/{delivery_id}/plan/apply",
  planning: "GET /v1/delivery-initiatives/{delivery_id}/planning",
  workItemCreate: "POST /v1/delivery-work-items",
  workItemUpdate: "POST /v1/delivery-work-items/{work_item_id}/update",
} as const;

function localRefinementDraftGroups(
  deliveryPackage: DeliveryPackageSummary,
  refinementPackageId = deliveryPackage.delivery_package_id,
): DeliveryRefinementPacket["draft_groups"] {
  const deliveryPackageId = refinementPackageId;

  return [
    {
      fields: [
        localRefinementField(
          "Target PI",
          "target_pi",
          deliveryPackage.target_pi ?? "Missing",
          deliveryPackage.target_pi ? "complete" : "missing",
          {
            allowedValues: ["PI-2026-03", "PI-2026-04", "Program-wide"],
            fieldKind: "select",
            routeBinding: {
              operation_kind: "governance",
              oos_route: localRefinementRoutes.governance,
              payload_key: "target_pi",
              target: "initiative",
            },
            validationHint:
              "Target PI must come from broker planning options, not arbitrary text.",
          },
        ),
        localRefinementField(
          "Owner Repo",
          "owner_repo",
          "workspace-prototype-studio",
          "dirty",
          {
            allowedValues: [
              "workspace-governance-control-fabric",
              "operator-orchestration-service",
              "workspace-governance",
              "platform-engineering",
              "context-governance-gateway",
              "security-architecture",
              "workspace-prototype-studio",
            ],
            fieldKind: "select",
            routeBinding: {
              operation_kind: "governance",
              oos_route: localRefinementRoutes.governance,
              payload_key: "owner_repo",
              target: "initiative",
            },
            validationHint:
              "Owner Repo must match a known workspace repo option accepted by OOS.",
          },
        ),
      ],
      group_id: `${deliveryPackageId}-local-governance`,
      summary:
        "Local Work Design handoff needs package governance metadata review.",
      title: "Epic Governance",
      tone: "warn",
    },
    {
      fields: [
        localRefinementField(
          "Feature Classification",
          "execution_classification",
          "Enabler",
          "dirty",
          {
            allowedValues: ["Business", "Enabler", "Improvement"],
            fieldKind: "select",
            routeBinding: {
              operation_kind: "bulk_update",
              oos_route: localRefinementRoutes.bulkUpdate,
              payload_key: "execution_classification",
              target: "work_item",
            },
            targetKinds: ["Feature", "User story"],
            validationHint:
              "Execution classification must use the broker taxonomy.",
          },
        ),
        localRefinementField(
          "Definition of Ready",
          "definition_of_ready",
          "Definition of Ready needs operator confirmation",
          "dirty",
          {
            fieldKind: "long_text",
            routeBinding: {
              operation_kind: "bulk_update",
              oos_route: localRefinementRoutes.bulkUpdate,
              payload_key: "definition_of_ready",
              target: "work_item",
            },
            targetKinds: ["User story"],
            validationHint:
              "Narrative readiness text is reviewed before apply.",
            valueLimit: 900,
          },
        ),
      ],
      group_id: `${deliveryPackageId}-local-children`,
      summary:
        "Applied child plan needs item-scoped metadata before execution control.",
      title: "Child Plan Metadata",
      tone: "warn",
    },
    {
      fields: [
        localRefinementField(
          "PI Objective",
          "type:PI Objective",
          "Objective draft generated from Work Design handoff",
          "complete",
          {
            fieldKind: "generated",
            routeBinding: {
              operation_kind: "plan_apply",
              oos_route: localRefinementRoutes.planApply,
              payload_key: "plan.items[type=PI Objective]",
              target: "child_plan",
            },
            validationHint:
              "PI Objective shape is generated from plan/apply, not free text.",
          },
        ),
        localRefinementField(
          "Business Value",
          "planned_business_value",
          "5",
          "dirty",
          {
            allowedValues: ["1", "3", "5", "8", "12"],
            fieldKind: "select",
            routeBinding: {
              operation_kind: "bulk_update",
              oos_route: localRefinementRoutes.bulkUpdate,
              payload_key: "planned_business_value",
              target: "work_item",
            },
            targetKinds: ["Feature", "User story"],
            validationHint:
              "Business Value must use the weighted scale 1, 3, 5, 8, or 12.",
          },
        ),
        localRefinementField(
          "Responsible",
          "responsible_login",
          "mfshaf7",
          "dirty",
          {
            allowedValues: [
              "mfshaf7",
              "Workspace Delivery ART",
              "Workspace Governance Control Fabric",
              "Operator Orchestration Service",
              "Security Architecture",
            ],
            fieldKind: "select",
            routeBinding: {
              operation_kind: "bulk_update",
              oos_route: localRefinementRoutes.bulkUpdate,
              payload_key: "responsible_login",
              target: "work_item",
            },
            validationHint:
              "Responsible must resolve through the assignable-principal surface before backend apply.",
          },
        ),
      ],
      group_id: `${deliveryPackageId}-local-objective`,
      summary: "PI objective and responsibility metadata need operator review.",
      title: "PI Objective Readiness",
      tone: "warn",
    },
  ];
}

function localRefinementField(
  label: string,
  backendField: string,
  value: string,
  status: DeliveryRefinementFieldStatus,
  input: {
    allowedValues?: string[];
    fieldKind: DeliveryRefinementFieldKind;
    required?: boolean;
    routeBinding: DeliveryRefinementFieldRouteBinding;
    targetKinds?: DeliveryWorkDesignDraftNode["kind"][];
    validationHint: string;
    valueLimit?: number;
  },
): DeliveryRefinementDraftField {
  return {
    allowed_values: input.allowedValues,
    backend_field: backendField,
    field_kind: input.fieldKind,
    label,
    required: input.required ?? true,
    route_binding: input.routeBinding,
    status,
    target_kinds: input.targetKinds,
    validation_hint: input.validationHint,
    value,
    value_limit: input.valueLimit,
  };
}
