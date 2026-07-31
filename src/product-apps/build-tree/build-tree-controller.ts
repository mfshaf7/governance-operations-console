export function addBuildTreeStateIds(current: string[], ids: string[]) {
  return Array.from(new Set([...current, ...ids]));
}

export function removeBuildTreeStateIds(current: string[], ids: string[]) {
  const removed = new Set(ids);
  return current.filter((nodeId) => !removed.has(nodeId));
}

export function toggleBuildTreeStateId(current: string[], nodeId: string) {
  return current.includes(nodeId)
    ? current.filter((item) => item !== nodeId)
    : [...current, nodeId];
}

export function isBuildTreeFullyExpanded(options: {
  expandedNodeIds: string[];
  requiredExpandedNodeIds: string[];
  requiredStructuredGroupIds?: string[];
  structuredGroupIds?: string[];
}) {
  const expandedNodeIdSet = new Set(options.expandedNodeIds);
  const baseTreeExpanded = options.requiredExpandedNodeIds.every((nodeId) =>
    expandedNodeIdSet.has(nodeId),
  );

  if (!baseTreeExpanded || !options.requiredStructuredGroupIds) {
    return baseTreeExpanded;
  }

  const structuredGroupIdSet = new Set(options.structuredGroupIds ?? []);
  return options.requiredStructuredGroupIds.every((nodeId) =>
    structuredGroupIdSet.has(nodeId),
  );
}

export function buildTreeDeleteRequest<TNode>(node: TNode, options: {
  canDelete: (node: TNode) => boolean;
}) {
  if (!options.canDelete(node)) {
    return {
      blockedNode: node,
      requestNode: null,
    };
  }

  return {
    blockedNode: null,
    requestNode: node,
  };
}
