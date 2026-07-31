import type {
  DeliveryWorkDesignDraftNodeKind,
  DeliveryWorkDesignDraftNode,
  DeliveryTone,
  DeliveryRefinementStepId,
  DeliveryRefinementPacketStatus,
  DeliveryRefinementFieldStatus,
  DeliveryRefinementFieldKind,
  DeliveryRefinementFieldRouteBinding,
  DeliveryRefinementDraftField,
  DeliveryRefinementReadinessGate,
  DeliveryRefinementApplyReceipt,
  DeliveryRefinementApplyPlan,
  DeliveryRefinementPacket,
} from "../../../domain/delivery-types.ts";

type RefinementFixtureReceipt = Omit<
  DeliveryRefinementApplyReceipt,
  "applied_payload" | "command_name" | "result_state" | "schema_version"
>;

type RefinementFixtureInput = {
  activeStep?: DeliveryRefinementStepId;
  briefLabel?: string;
  deliveryPackageId: string;
  displayName: string;
  gates?: DeliveryRefinementReadinessGate[];
  groupOverrides?: Partial<
    Record<
      "children" | "governance" | "objective",
      {
        summary?: string;
        tone?: DeliveryTone;
        fields?: Partial<DeliveryRefinementDraftField>[];
      }
    >
  >;
  legacyEpicId: number;
  receipt?: RefinementFixtureReceipt | null;
  status?: DeliveryRefinementPacketStatus;
  sourceWorkDesignPackageId?: string;
  targetTree?: DeliveryWorkDesignDraftNode;
  targetPi: string | null;
  treeRootId: string;
};

const refinementRoutes = {
  bulkUpdate: "POST /v1/delivery-work-items/bulk-update",
  governance: "POST /v1/delivery-initiatives/{delivery_id}/governance",
  planApply: "POST /v1/delivery-initiatives/{delivery_id}/plan/apply",
  planning: "GET /v1/delivery-initiatives/{delivery_id}/planning",
  workItemCreate: "POST /v1/delivery-work-items",
  workItemUpdate: "POST /v1/delivery-work-items/{work_item_id}/update",
} as const;

const refinementExpectedRoutes = [
  refinementRoutes.planning,
  refinementRoutes.governance,
  refinementRoutes.planApply,
  refinementRoutes.workItemCreate,
  refinementRoutes.workItemUpdate,
  refinementRoutes.bulkUpdate,
];

const refinementOptionSets = {
  businessValue: ["1", "3", "5", "8", "12"],
  deliveryTeam: [
    "Workspace Governance Control Fabric",
    "Operator Orchestration Service",
    "Workspace Governance",
    "Platform Engineering",
    "Context Governance Gateway",
    "Security Architecture",
    "Workspace Prototype Studio",
  ],
  executionClassification: ["Business", "Enabler", "Improvement"],
  lineageRole: ["Architecture Anchor", "Follow-on", "Hardening", "Activation"],
  ownerRepo: [
    "workspace-governance-control-fabric",
    "operator-orchestration-service",
    "workspace-governance",
    "platform-engineering",
    "context-governance-gateway",
    "security-architecture",
    "workspace-prototype-studio",
  ],
  principal: [
    "mfshaf7",
    "Workspace Delivery ART",
    "Workspace Governance Control Fabric",
    "Operator Orchestration Service",
    "Security Architecture",
  ],
  targetPi: ["PI-2026-03", "PI-2026-04", "Program-wide"],
  pm2Phase: ["Planning", "Executing", "Closing"],
} as const;

type RefinementFieldInput = {
  allowedValues?: string[];
  fieldKind: DeliveryRefinementFieldKind;
  required?: boolean;
  routeBinding: DeliveryRefinementFieldRouteBinding;
  targetKinds?: DeliveryWorkDesignDraftNodeKind[];
  targetNodeIds?: string[];
  targetStatuses?: Record<string, DeliveryRefinementFieldStatus>;
  targetValues?: Record<string, string>;
  validationHint: string;
  valueLimit?: number;
};

function refinementField(
  label: string,
  backendField: string,
  value: string,
  status: DeliveryRefinementFieldStatus = "complete",
  input: RefinementFieldInput,
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
    target_node_ids: input.targetNodeIds,
    target_statuses: input.targetStatuses,
    target_values: input.targetValues,
    validation_hint: input.validationHint,
    value_limit: input.valueLimit,
    value,
  };
}

function mergeRefinementFields(
  fields: DeliveryRefinementDraftField[],
  overrides: Partial<DeliveryRefinementDraftField>[] = [],
) {
  return fields.map((field) => {
    const override = overrides.find(
      (item) =>
        item.label === field.label ||
        item.backend_field === field.backend_field,
    );

    if (!override) {
      return field;
    }

    if (
      override.target_node_ids?.length &&
      (override.status || override.value)
    ) {
      return {
        ...field,
        ...override,
        status: field.status,
        target_node_ids: field.target_node_ids,
        target_statuses: {
          ...field.target_statuses,
          ...Object.fromEntries(
            override.target_node_ids.map((targetNodeId) => [
              targetNodeId,
              override.status ?? field.status,
            ]),
          ),
          ...override.target_statuses,
        },
        target_values: {
          ...field.target_values,
          ...Object.fromEntries(
            override.target_node_ids.map((targetNodeId) => [
              targetNodeId,
              override.value ?? field.value,
            ]),
          ),
          ...override.target_values,
        },
      };
    }

    return { ...field, ...override };
  });
}

export function refinementPacket({
  activeStep = "metadata_draft",
  briefLabel,
  deliveryPackageId,
  displayName,
  gates,
  groupOverrides,
  legacyEpicId,
  receipt = null,
  status = "drafting",
  sourceWorkDesignPackageId,
  targetTree: providedTargetTree,
  targetPi,
  treeRootId,
}: RefinementFixtureInput): DeliveryRefinementPacket {
  const sourceReceiptId = `WDS-APPLY-${legacyEpicId}-v1`;
  const workDesignPackageId = sourceWorkDesignPackageId ?? deliveryPackageId;
  const targetTree =
    providedTargetTree ??
    refinementTargetTree({
      displayName,
      legacyEpicId,
      treeRootId,
    });
  const targetNodeIds = {
    feature: `${treeRootId}-feature-1`,
    risk: `${treeRootId}-risk-1`,
    story1: `${treeRootId}-story-1`,
    story2: `${treeRootId}-story-2`,
  } as const;
  const childFieldOverrides = groupOverrides?.children?.fields ?? [];
  const hasConfiguredMilestoneCheckpoints = childFieldOverrides.some(
    (field) =>
      field.label === "Milestone Checkpoints" ||
      field.backend_field === "type:Milestone",
  );
  const governanceFields = mergeRefinementFields(
    [
      refinementField(
        "Target PI",
        "target_pi",
        targetPi ?? "Missing",
        targetPi ? "complete" : "missing",
        {
          allowedValues: [...refinementOptionSets.targetPi],
          fieldKind: "select",
          routeBinding: {
            operation_kind: "governance",
            oos_route: refinementRoutes.governance,
            payload_key: "target_pi",
            target: "initiative",
          },
          validationHint:
            "Target PI must come from the broker planning options, not arbitrary text.",
        },
      ),
      refinementField(
        "Owner Repo",
        "owner_repo",
        "operator-orchestration-service",
        "complete",
        {
          allowedValues: [...refinementOptionSets.ownerRepo],
          fieldKind: "select",
          routeBinding: {
            operation_kind: "governance",
            oos_route: refinementRoutes.governance,
            payload_key: "owner_repo",
            target: "initiative",
          },
          validationHint:
            "Owner Repo must match a known workspace repo option accepted by OOS.",
        },
      ),
      refinementField(
        "Delivery Team",
        "delivery_team",
        "Operator Orchestration Service",
        "complete",
        {
          allowedValues: [...refinementOptionSets.deliveryTeam],
          fieldKind: "select",
          routeBinding: {
            operation_kind: "bulk_update",
            oos_route: refinementRoutes.bulkUpdate,
            payload_key: "delivery_team",
            target: "work_item",
          },
          targetValues: {
            [targetNodeIds.feature]: "Operator Orchestration Service",
            [targetNodeIds.risk]: "Workspace Governance",
            [targetNodeIds.story1]: "Workspace Governance Control Fabric",
            [targetNodeIds.story2]: "Operator Orchestration Service",
          },
          validationHint:
            "Delivery Team is work-item metadata and must use an allowed delivery team value.",
        },
      ),
      refinementField("PM2 Phase", "pm2_phase", "Planning", "complete", {
        allowedValues: [...refinementOptionSets.pm2Phase],
        fieldKind: "select",
        routeBinding: {
          operation_kind: "governance",
          oos_route: refinementRoutes.governance,
          payload_key: "pm2_phase",
          target: "initiative",
        },
        validationHint:
          "PM2 Phase must stay inside broker-supported initiative governance states.",
      }),
      refinementField(
        "Lineage Role",
        "lineage_role",
        "Activation",
        "complete",
        {
          allowedValues: [...refinementOptionSets.lineageRole],
          fieldKind: "select",
          routeBinding: {
            operation_kind: "governance",
            oos_route: refinementRoutes.governance,
            payload_key: "lineage_role",
            target: "initiative",
          },
          validationHint:
            "Lineage Role must be selected from the initiative family vocabulary.",
        },
      ),
    ],
    groupOverrides?.governance?.fields,
  );
  const childFields = mergeRefinementFields(
    [
      refinementField(
        "Feature Classification",
        "execution_classification",
        "Enabler",
        "complete",
        {
          allowedValues: [...refinementOptionSets.executionClassification],
          fieldKind: "select",
          routeBinding: {
            operation_kind: "bulk_update",
            oos_route: refinementRoutes.bulkUpdate,
            payload_key: "execution_classification",
            target: "work_item",
          },
          targetKinds: ["Feature", "User story"],
          targetValues: {
            [targetNodeIds.feature]: "Enabler",
            [targetNodeIds.story1]: "Business",
            [targetNodeIds.story2]: "Enabler",
          },
          validationHint:
            "Execution classification must use the broker taxonomy instead of a free-text label.",
        },
      ),
      refinementField(
        "Definition of Ready",
        "definition_of_ready",
        "ready/done narrative drafted",
        "complete",
        {
          fieldKind: "long_text",
          routeBinding: {
            operation_kind: "bulk_update",
            oos_route: refinementRoutes.bulkUpdate,
            payload_key: "definition_of_ready",
            target: "work_item",
          },
          targetKinds: ["User story"],
          targetNodeIds: [targetNodeIds.story1, targetNodeIds.story2],
          targetValues: {
            [targetNodeIds.story1]:
              "Acceptance criteria and dependency notes drafted from the applied Work Design handoff.",
            [targetNodeIds.story2]:
              "Definition-of-ready fields still need operator confirmation.",
          },
          validationHint:
            "Narrative readiness text is allowed, then reviewed before apply.",
          valueLimit: 900,
        },
      ),
      ...(hasConfiguredMilestoneCheckpoints
        ? [
            refinementField(
              "Milestone Checkpoints",
              "type:Milestone",
              "Epic-level checkpoints only",
              "complete",
              {
                fieldKind: "generated",
                required: false,
                routeBinding: {
                  operation_kind: "work_item_create",
                  oos_route: refinementRoutes.workItemCreate,
                  payload_key: "type:Milestone",
                  target: "child_plan",
                },
                targetNodeIds: [targetNodeIds.feature],
                validationHint:
                  "Milestone creation appears only when Work Design or planning evidence includes milestone checkpoints.",
              },
            ),
          ]
        : []),
    ],
    childFieldOverrides,
  );
  const objectiveFields = mergeRefinementFields(
    [
      refinementField(
        "PI Objective",
        "type:PI Objective",
        "Objective draft ready",
        "complete",
        {
          fieldKind: "generated",
          routeBinding: {
            operation_kind: "plan_apply",
            oos_route: refinementRoutes.planApply,
            payload_key: "plan.items[type=PI Objective]",
            target: "child_plan",
          },
          validationHint:
            "PI Objective item shape is generated from plan/apply, not typed as arbitrary metadata.",
        },
      ),
      refinementField("Assignee", "assignee_login", "mfshaf7", "complete", {
        allowedValues: [...refinementOptionSets.principal],
        fieldKind: "select",
        routeBinding: {
          operation_kind: "bulk_update",
          oos_route: refinementRoutes.bulkUpdate,
          payload_key: "assignee_login",
          target: "work_item",
        },
        targetValues: {
          [targetNodeIds.feature]: "Operator Orchestration Service",
          [targetNodeIds.risk]: "Workspace Delivery ART",
          [targetNodeIds.story1]: "Workspace Governance Control Fabric",
          [targetNodeIds.story2]: "mfshaf7",
        },
        validationHint:
          "Assignee must resolve through the live assignable-principal surface before backend apply.",
      }),
      refinementField(
        "Responsible",
        "responsible_login",
        "mfshaf7",
        "complete",
        {
          allowedValues: [...refinementOptionSets.principal],
          fieldKind: "select",
          routeBinding: {
            operation_kind: "bulk_update",
            oos_route: refinementRoutes.bulkUpdate,
            payload_key: "responsible_login",
            target: "work_item",
          },
          targetValues: {
            [targetNodeIds.feature]: "Operator Orchestration Service",
            [targetNodeIds.risk]: "Security Architecture",
            [targetNodeIds.story1]: "Workspace Governance Control Fabric",
            [targetNodeIds.story2]: "mfshaf7",
          },
          validationHint:
            "Responsible must resolve through the live assignable-principal surface before backend apply.",
        },
      ),
      refinementField(
        "Business Value",
        "planned_business_value",
        "8",
        "complete",
        {
          allowedValues: [...refinementOptionSets.businessValue],
          fieldKind: "select",
          routeBinding: {
            operation_kind: "bulk_update",
            oos_route: refinementRoutes.bulkUpdate,
            payload_key: "planned_business_value",
            target: "work_item",
          },
          targetValues: {
            [targetNodeIds.feature]: "8",
            [targetNodeIds.risk]: "3",
            [targetNodeIds.story1]: "5",
            [targetNodeIds.story2]: "8",
          },
          validationHint:
            "Business Value must use the weighted scale 1, 3, 5, 8, or 12.",
        },
      ),
    ],
    groupOverrides?.objective?.fields,
  );
  const applyPlan: DeliveryRefinementApplyPlan = {
    expected_routes: refinementExpectedRoutes,
    operations: [
      {
        detail: "Write package-level governance fields and contract narrative.",
        kind: "governance",
        label: "Update Epic Governance",
        operation_id: `${deliveryPackageId}-op-governance`,
        oos_route: "POST /v1/delivery-initiatives/{delivery_id}/governance",
        status: "planned",
        target: `OpenProject Epic #${legacyEpicId}`,
      },
      {
        detail:
          "Create the child planning shape from the applied Work Design tree for this fresh handoff.",
        kind: "plan_apply",
        label: "Create Child Plan",
        operation_id: `${deliveryPackageId}-op-plan-apply`,
        oos_route: "POST /v1/delivery-initiatives/{delivery_id}/plan/apply",
        status: "planned",
        target: treeRootId,
      },
      {
        detail:
          "Send the reviewed per-item metadata values through the OOS batch route. The route is transport only; operator decisions stay scoped to selected ART items.",
        kind: "bulk_update",
        label: "Apply Item Metadata Change Set",
        operation_id: `${deliveryPackageId}-op-bulk-update`,
        oos_route: "POST /v1/delivery-work-items/bulk-update",
        status: "planned",
        target: "Reviewed ART item metadata targets",
      },
    ],
    summary:
      "Apply will use OOS planning routes and reviewed item-scoped metadata changes only. Execution Board actions and blocker set/clear stay outside this workflow.",
  };
  const metadataFields = [
    ...governanceFields,
    ...childFields,
    ...objectiveFields,
  ];
  const projectedReceipt: DeliveryRefinementApplyReceipt | null = receipt
    ? {
        ...receipt,
        applied_payload: {
          apply_plan: applyPlan,
          metadata_resolutions: Object.fromEntries(
            metadataFields.map((field) => [field.backend_field, "accepted"]),
          ),
          metadata_values: Object.fromEntries(
            metadataFields.map((field) => [field.backend_field, field.value]),
          ),
          packet_id: `refinement-packet-${legacyEpicId}-v1`,
        },
        command_name: "delivery.refinement.apply",
        result_state: "recorded",
        schema_version: 1,
      }
    : null;

  return {
    active_step: activeStep,
    apply_plan: applyPlan,
    draft_groups: [
      {
        fields: governanceFields,
        group_id: `${deliveryPackageId}-governance`,
        summary:
          groupOverrides?.governance?.summary ??
          "Epic/package governance fields are ready for backend-safe update.",
        title: "Epic Governance",
        tone: groupOverrides?.governance?.tone ?? "warn",
      },
      {
        fields: childFields,
        group_id: `${deliveryPackageId}-children`,
        summary:
          groupOverrides?.children?.summary ??
          "Designed child plan maps to OOS plan apply and bounded child updates.",
        title: "Child Plan Metadata",
        tone: groupOverrides?.children?.tone ?? "info",
      },
      {
        fields: objectiveFields,
        group_id: `${deliveryPackageId}-objective`,
        summary:
          groupOverrides?.objective?.summary ??
          "PI Objective and responsible parties are ready for commitment review.",
        title: "PI Objective Readiness",
        tone: groupOverrides?.objective?.tone ?? "warn",
      },
    ],
    handoff: {
      finalized_brief_ref: `brief://work-design/${workDesignPackageId}/finalized-${briefLabel ?? "v1"}`,
      handoff_note: `${displayName} was applied from Work Design and is ready for metadata materialization.`,
      source_package_ref: `openproject://work_packages/${legacyEpicId}`,
      source_work_design_receipt_id: sourceReceiptId,
      status_label: "Work Design applied",
      tone: "ok",
      tree_snapshot_ref: `tree://work-design/${workDesignPackageId}/${treeRootId}`,
    },
    last_saved_at: "2026-06-12T10:10:00+08:00",
    packet_id: `refinement-packet-${legacyEpicId}-v1`,
    readiness_gates: gates ?? [
      {
        detail: "Applied Work Design receipt and finalized brief are present.",
        gate_id: `${deliveryPackageId}-gate-handoff`,
        label: "Work Design Handoff",
        status: "passed",
        tone: "ok",
      },
      {
        detail: targetPi
          ? `${targetPi} is aligned with the planned iteration set.`
          : "Target PI must be selected before apply.",
        gate_id: `${deliveryPackageId}-gate-pi`,
        label: "PI Placement",
        oos_route: "POST /v1/delivery-initiatives/{delivery_id}/governance",
        status: targetPi ? "passed" : "open",
        tone: targetPi ? "ok" : "warn",
      },
      {
        detail: "Blocker set/clear is not part of Refinement.",
        gate_id: `${deliveryPackageId}-gate-blocker-boundary`,
        label: "Blocker Boundary",
        oos_route: "POST /v1/delivery-work-items/{work_item_id}/blocker",
        status: "passed",
        tone: "ok",
      },
    ],
    receipt: projectedReceipt,
    status,
    target_tree: targetTree,
  };
}

export function refinementTargetTree({
  displayName,
  legacyEpicId,
  treeRootId,
}: {
  displayName: string;
  legacyEpicId: number;
  treeRootId: string;
}): DeliveryWorkDesignDraftNode {
  return {
    children: [
      {
        children: [
          {
            description:
              "User story target carried from the Work Design handoff for the first execution target.",
            draft_body:
              "Refinement can repair item-level readiness metadata for this User story without changing the Work Design structure.",
            id: `${treeRootId}-story-1`,
            kind: "User story",
            remark: "Item metadata target.",
            title: "User Story 1 - Primary Execution Target",
            tone: "info",
          },
          {
            description:
              "User story target carried from the Work Design handoff for readiness-field review.",
            draft_body:
              "Refinement can repair definition-of-ready and definition-of-done metadata for this individual User story.",
            id: `${treeRootId}-story-2`,
            kind: "User story",
            remark: "Readiness metadata target.",
            title: "User Story 2 - Readiness Metadata",
            tone: "warn",
          },
        ],
        description:
          "Feature target carried from the applied Work Design tree.",
        draft_body:
          "Feature-level metadata can be reviewed without reshaping the draft tree.",
        id: `${treeRootId}-feature-1`,
        kind: "Feature",
        remark: "Feature metadata target.",
        title: "Feature 1 - Metadata Materialization",
        tone: "info",
      },
      {
        description:
          "Risk target carried from Work Design for ownership, dependency, or sequencing metadata.",
        draft_body:
          "Risk metadata is reviewed as an ART item target, not as a tree-shaping change.",
        id: `${treeRootId}-risk-1`,
        kind: "Risk",
        remark: "Risk metadata target.",
        title: "Risk 1 - Metadata Drift",
        tone: "warn",
      },
    ],
    description:
      "Applied Work Design Epic tree snapshot used as the Refinement targeting surface.",
    draft_body:
      "Refinement selects an ART item from this handoff tree, then repairs backend-safe metadata for that selected item.",
    id: treeRootId,
    kind: "Epic",
    remark: "Root package metadata target.",
    title: `Epic #${legacyEpicId} - ${displayName}`,
    tone: "info",
  };
}
