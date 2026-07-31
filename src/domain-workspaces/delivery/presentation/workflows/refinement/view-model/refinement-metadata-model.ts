import type {
  DeliveryRefinementDraftField,
  DeliveryRefinementDraftGroup,
  DeliveryRefinementFieldStatus,
  DeliveryRefinementPacket,
  DeliveryTone,
  DeliveryWorkDesignDraftNode,
} from "../../../../read-model/index.ts";

import type {
  RefinementMetadataFieldResolution,
  RefinementMetadataFieldResolutionMap,
  RefinementMetadataSelectionMode,
} from "../model/refinement-model.ts";

export function refinementMetadataFieldKey(
  groupId: string,
  field: Pick<DeliveryRefinementDraftField, "backend_field" | "label">,
  targetNodeId?: string,
) {
  const fieldKey = `${groupId}:${field.backend_field || field.label}`;

  return targetNodeId ? `${targetNodeId}:${fieldKey}` : fieldKey;
}

export type RefinementMetadataTarget = {
  field: DeliveryRefinementDraftField;
  group: DeliveryRefinementDraftGroup;
  key: string;
  node: DeliveryWorkDesignDraftNode;
  path: DeliveryWorkDesignDraftNode[];
  status: DeliveryRefinementFieldStatus;
  sourceValue: string;
};

export type RefinementSharedMetadataTargetGroup = {
  field: DeliveryRefinementDraftField;
  group: DeliveryRefinementDraftGroup;
  identity: string;
  targets: RefinementMetadataTarget[];
};

export function refinementMetadataFieldIdentity(
  groupId: string,
  field: Pick<DeliveryRefinementDraftField, "backend_field" | "label">,
) {
  return `${groupId}:${field.backend_field || field.label}`;
}

export function refinementTargetNodes(
  node: DeliveryWorkDesignDraftNode,
  path: DeliveryWorkDesignDraftNode[] = [],
): Array<{
  node: DeliveryWorkDesignDraftNode;
  path: DeliveryWorkDesignDraftNode[];
}> {
  const nextPath = [...path, node];

  return [
    {
      node,
      path: nextPath,
    },
    ...(node.children ?? []).flatMap((child) =>
      refinementTargetNodes(child, nextPath),
    ),
  ];
}

export function refinementMetadataTargets(
  packet: DeliveryRefinementPacket,
): RefinementMetadataTarget[] {
  return refinementTargetNodes(packet.target_tree).flatMap(({ node, path }) =>
    packet.draft_groups.flatMap((group) =>
      group.fields
        .filter((field) =>
          refinementFieldAppliesToNode({
            field,
            node,
            rootNodeId: packet.target_tree.id,
          }),
        )
        .map((field) => ({
          field,
          group,
          key: refinementMetadataFieldKey(group.group_id, field, node.id),
          node,
          path,
          status: field.target_statuses?.[node.id] ?? field.status,
          sourceValue: field.target_values?.[node.id] ?? field.value,
        })),
    ),
  );
}

export function refinementSharedMetadataTargetGroups(
  targets: RefinementMetadataTarget[],
  selectedNodeIds: string[],
): RefinementSharedMetadataTargetGroup[] {
  const nodeIds = Array.from(new Set(selectedNodeIds));

  if (nodeIds.length < 2) {
    return [];
  }

  const nodeIdSet = new Set(nodeIds);
  const groupedTargets = new Map<string, RefinementMetadataTarget[]>();

  targets
    .filter((target) => nodeIdSet.has(target.node.id))
    .forEach((target) => {
      const identity = refinementMetadataFieldIdentity(
        target.group.group_id,
        target.field,
      );
      const current = groupedTargets.get(identity) ?? [];
      current.push(target);
      groupedTargets.set(identity, current);
    });

  return Array.from(groupedTargets.entries()).flatMap(
    ([identity, groupTargets]) => {
      const orderedTargets = nodeIds.flatMap((nodeId) =>
        groupTargets.filter((target) => target.node.id === nodeId),
      );
      const sharedByEverySelectedNode = nodeIds.every((nodeId) =>
        orderedTargets.some((target) => target.node.id === nodeId),
      );

      if (!sharedByEverySelectedNode || !orderedTargets[0]) {
        return [];
      }

      return [
        {
          field: orderedTargets[0].field,
          group: orderedTargets[0].group,
          identity,
          targets: orderedTargets,
        },
      ];
    },
  );
}

function refinementFieldAppliesToNode({
  field,
  node,
  rootNodeId,
}: {
  field: DeliveryRefinementDraftField;
  node: DeliveryWorkDesignDraftNode;
  rootNodeId: string;
}) {
  if (field.target_kinds?.length && !field.target_kinds.includes(node.kind)) {
    return false;
  }

  if (field.target_node_ids?.length) {
    return field.target_node_ids.includes(node.id);
  }

  switch (field.route_binding.target) {
    case "initiative":
      return node.id === rootNodeId || node.kind === "Epic";
    case "child_plan":
      return node.kind === "Epic" || node.kind === "Feature";
    case "work_item":
      return node.kind !== "Epic";
  }
}

export function refinementFieldStatusTone({
  resolution,
  status,
}: {
  resolution?: RefinementMetadataFieldResolution;
  status: DeliveryRefinementFieldStatus;
}): DeliveryTone {
  if (resolution === "ai_drafted") {
    return "info";
  }

  if (resolution || status === "complete") {
    return "ok";
  }

  if (status === "blocked") {
    return "danger";
  }

  if (status === "stale") {
    return "muted";
  }

  return "warn";
}

export function refinementSelectedMetadataItemTone({
  resolutions,
  targets,
}: {
  resolutions: RefinementMetadataFieldResolutionMap;
  targets: RefinementMetadataTarget[];
}) {
  if (targets.some((target) => target.status === "blocked")) {
    return "danger" as const;
  }

  if (targets.some((target) => resolutions[target.key] === "ai_drafted")) {
    return "info" as const;
  }

  if (
    targets.some(
      (target) => target.status !== "complete" && !resolutions[target.key],
    )
  ) {
    return "warn" as const;
  }

  if (targets.some((target) => resolutions[target.key])) {
    return "ok" as const;
  }

  return "info" as const;
}

export function refinementMetadataCollapsedValue<T>({
  collapsed,
  value,
}: {
  collapsed: boolean;
  value: T;
}) {
  return collapsed ? undefined : value;
}

export function refinementSharedTargetSetSummaryProjection({
  description,
  selectedCount,
  sharedFieldCount,
  title,
}: {
  description?: string;
  selectedCount: number;
  sharedFieldCount: number;
  title?: string;
}) {
  const itemLabel = selectedCount === 1 ? "ART item" : "ART items";
  const fieldLabel = sharedFieldCount === 1 ? "field" : "fields";

  return {
    description:
      description ??
      (selectedCount < 2
        ? "Select at least two ART items to enable shared metadata editing."
        : sharedFieldCount > 0
          ? `${sharedFieldCount} shared metadata ${fieldLabel} available for this selected set.`
          : "No shared metadata field is available for this selected set."),
    title: title ?? `${selectedCount} ${itemLabel} selected`,
  };
}

export function refinementSharedMetadataEditorDescription({
  blocked,
  mixedDraftValues,
}: {
  blocked: boolean;
  mixedDraftValues: boolean;
}) {
  if (blocked) {
    return "One selected target is blocked. Remove it from the shared set or route the blocker before editing.";
  }

  if (mixedDraftValues) {
    return "Selected items currently have mixed values. Choose one reviewed value to apply to this shared field.";
  }

  return "Selected items share this field. Review the value before applying it to the selected set.";
}

export function refinementSharedMetadataStatusLabel({
  blocked,
  mixedDraftValues,
}: {
  blocked: boolean;
  mixedDraftValues: boolean;
}) {
  if (blocked) {
    return "blocked";
  }

  if (mixedDraftValues) {
    return "mixed";
  }

  return "shared";
}

export function refinementSharedMetadataGroupTone({
  group,
  resolutions,
}: {
  group: RefinementSharedMetadataTargetGroup;
  resolutions: RefinementMetadataFieldResolutionMap;
}) {
  if (group.targets.some((target) => target.status === "blocked")) {
    return "danger" as const;
  }

  if (
    group.targets.some(
      (target) => target.status !== "complete" && !resolutions[target.key],
    )
  ) {
    return "warn" as const;
  }

  if (
    group.targets.some((target) => resolutions[target.key] === "ai_drafted")
  ) {
    return "info" as const;
  }

  if (group.targets.some((target) => resolutions[target.key])) {
    return "ok" as const;
  }

  return "ok" as const;
}

export function refinementMetadataTargetNodeSharedMeta({
  bulkSelected,
}: {
  bulkSelected: boolean;
}) {
  return {
    label: bulkSelected ? "selected" : "add",
    tone: bulkSelected ? ("info" as const) : ("muted" as const),
  };
}

export function refinementMetadataTargetSelectedNodeIds({
  metadataSelectionMode,
  selectedBulkNodeIds,
  selectedNodeId,
}: {
  metadataSelectionMode: RefinementMetadataSelectionMode;
  selectedBulkNodeIds: string[];
  selectedNodeId: string;
}) {
  return metadataSelectionMode === "shared"
    ? selectedBulkNodeIds
    : [selectedNodeId];
}

export function refinementMetadataTargetSelectionMode(
  metadataSelectionMode: RefinementMetadataSelectionMode,
) {
  return metadataSelectionMode === "shared"
    ? ("multi" as const)
    : ("single" as const);
}

export function refinementMetadataValueSelectOptions({
  draftValue,
  field,
}: {
  draftValue: string;
  field: DeliveryRefinementDraftField;
}) {
  const options =
    field.allowed_values?.map((option) => ({
      label: option,
      value: option,
    })) ?? [];

  if (field.allowed_values?.includes(draftValue)) {
    return options;
  }

  return [
    { label: draftValue || "Select value", value: draftValue },
    ...options,
  ];
}

export function refinementSelectedMetadataEditorDescription({
  blocked,
  resolution,
}: {
  blocked: boolean;
  resolution?: RefinementMetadataFieldResolution;
}) {
  if (blocked) {
    return "This field is blocked. Refinement cannot clear blocker state; use Blocker Recovery.";
  }

  if (resolution === "repaired") {
    return "The edited workbench value is recorded for readiness review and apply.";
  }

  if (resolution === "accepted") {
    return "The workbench value is accepted as reviewed and will not be changed by Refinement.";
  }

  if (resolution === "ai_drafted") {
    return "The advisor drafted a local value. Review it, then record the edited value if it is correct.";
  }

  return "Review or edit the workbench value, then confirm it for readiness review.";
}

export function refinementMetadataResolutionLabel(
  resolution: RefinementMetadataFieldResolution,
) {
  switch (resolution) {
    case "accepted":
      return "accepted";
    case "ai_drafted":
      return "AI drafted";
    case "repaired":
      return "repaired";
  }
}

export function refinementMetadataWorkbenchSummary({
  packet,
  resolutions,
}: {
  packet: DeliveryRefinementPacket;
  resolutions: RefinementMetadataFieldResolutionMap;
}): {
  actionableCount: number;
  blockedCount: number;
  openCount: number;
  ready: boolean;
  resolvedCount: number;
  statusLabel: string;
  title: string;
  tone: DeliveryTone;
  totalCount: number;
} {
  const targets = refinementMetadataTargets(packet);
  const actionableFields = targets.filter(
    ({ status }) => status !== "complete",
  );
  const blockedFields = actionableFields.filter(
    ({ status }) => status === "blocked",
  );
  const resolvedFields = actionableFields.filter(({ key }) => resolutions[key]);
  const openFields = actionableFields.filter(
    ({ key, status }) => status !== "blocked" && !resolutions[key],
  );

  if (blockedFields.length > 0) {
    return {
      actionableCount: actionableFields.length,
      blockedCount: blockedFields.length,
      openCount: openFields.length,
      ready: false,
      resolvedCount: resolvedFields.length,
      statusLabel: "blocked",
      title: "Blocked Metadata",
      tone: "danger",
      totalCount: targets.length,
    };
  }

  if (openFields.length > 0) {
    return {
      actionableCount: actionableFields.length,
      blockedCount: 0,
      openCount: openFields.length,
      ready: false,
      resolvedCount: resolvedFields.length,
      statusLabel: `${openFields.length} open`,
      title: "Metadata Work Required",
      tone: "warn",
      totalCount: targets.length,
    };
  }

  return {
    actionableCount: actionableFields.length,
    blockedCount: 0,
    openCount: 0,
    ready: true,
    resolvedCount: resolvedFields.length,
    statusLabel: actionableFields.length > 0 ? "resolved" : "ready",
    title:
      actionableFields.length > 0
        ? "Metadata Workbench Complete"
        : "Metadata Ready",
    tone: "ok",
    totalCount: targets.length,
  };
}

export type RefinementMetadataWorkbenchSummary = ReturnType<
  typeof refinementMetadataWorkbenchSummary
>;

export function uniqueRefinementMetadataValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim())));
}

export function refinementSourceValueMissing(value: string) {
  return value.trim().length === 0;
}

export function groupedRefinementSourceValues(
  targets: RefinementMetadataTarget[],
) {
  const groups = new Map<
    string,
    {
      missing: boolean;
      targets: RefinementMetadataTarget[];
      value: string;
    }
  >();

  targets.forEach((target) => {
    const missing = refinementSourceValueMissing(target.sourceValue);
    const value = missing ? "Missing value" : target.sourceValue.trim();
    const current = groups.get(value) ?? {
      missing,
      targets: [],
      value,
    };

    current.targets.push(target);
    groups.set(value, current);
  });

  return Array.from(groups.values()).sort((left, right) => {
    if (left.missing !== right.missing) {
      return left.missing ? 1 : -1;
    }

    return right.targets.length - left.targets.length;
  });
}

export function refinementSourceValuePostureTone({
  missingCount,
  selectedCount,
  valueCount,
}: {
  missingCount: number;
  selectedCount: number;
  valueCount: number;
}) {
  if (missingCount === selectedCount) {
    return "danger" as const;
  }

  if (missingCount > 0 || valueCount > 1) {
    return "warn" as const;
  }

  return "info" as const;
}

export function refinementMissingSourceValueTone(missingCount: number) {
  return missingCount > 0 ? ("warn" as const) : ("muted" as const);
}

export function refinementSourceValueRowProjection(
  target: RefinementMetadataTarget,
) {
  const missing = refinementSourceValueMissing(target.sourceValue);

  return {
    action: missing ? "missing" : "current",
    detail: missing ? "Missing source value" : target.sourceValue,
    tone: missing ? ("warn" as const) : ("info" as const),
  };
}
