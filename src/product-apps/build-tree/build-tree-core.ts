export type BuildTreeNodeLike<TNode> = {
  children?: TNode[];
  description: string;
  draftBody: string;
  id: string;
  kind: string;
  remark: string;
  title: string;
  tone: string;
};

export type BuildTreeMetricSelectors<TNode, TMetric extends string> = Record<
  TMetric,
  (node: TNode) => boolean
>;

export type BuildTreeTitleParts = {
  editable: string;
  locked: string;
};

export type BuildTreeTitleProfile<TKind extends string> = {
  kindFallbacks: Record<TKind, string>;
  prefixPattern: RegExp;
  normalizePrefix: (prefix: string, kind: TKind) => string;
};

export function findBuildTreeNode<TNode extends BuildTreeNodeLike<TNode>>(
  node: TNode,
  nodeId: string,
): TNode | null {
  if (node.id === nodeId) {
    return node;
  }

  for (const child of node.children ?? []) {
    const result = findBuildTreeNode(child, nodeId);
    if (result) {
      return result;
    }
  }

  return null;
}

export function updateBuildTreeNode<TNode extends BuildTreeNodeLike<TNode>>(
  node: TNode,
  nodeId: string,
  update: (node: TNode) => TNode,
): TNode {
  if (node.id === nodeId) {
    return update(node);
  }

  return {
    ...node,
    children: node.children?.map((child) =>
      updateBuildTreeNode(child, nodeId, update),
    ),
  } as TNode;
}

export function deleteBuildTreeNode<TNode extends BuildTreeNodeLike<TNode>>(
  node: TNode,
  nodeId: string,
): TNode {
  return {
    ...node,
    children: node.children
      ?.filter((child) => child.id !== nodeId)
      .map((child) => deleteBuildTreeNode(child, nodeId)),
  } as TNode;
}

export function insertBuildTreeNodeBeforeSupport<
  TNode extends BuildTreeNodeLike<TNode>,
>(
  children: TNode[],
  node: TNode,
  isSupportNode: (node: TNode) => boolean,
) {
  const firstSupportIndex = children.findIndex(isSupportNode);

  if (firstSupportIndex === -1) {
    return [...children, node];
  }

  return [
    ...children.slice(0, firstSupportIndex),
    node,
    ...children.slice(firstSupportIndex),
  ];
}

export function flattenBuildTree<TNode extends BuildTreeNodeLike<TNode>>(
  node: TNode,
): TNode[] {
  return [node, ...(node.children ?? []).flatMap(flattenBuildTree)];
}

export function buildTreeMetrics<
  TNode extends BuildTreeNodeLike<TNode>,
  TMetric extends string,
>(
  tree: TNode,
  selectors: BuildTreeMetricSelectors<TNode, TMetric>,
): Record<TMetric, number> {
  const nodes = flattenBuildTree(tree);
  const metrics = {} as Record<TMetric, number>;

  for (const key of Object.keys(selectors) as TMetric[]) {
    metrics[key] = nodes.filter(selectors[key]).length;
  }

  return metrics;
}

export function buildTreeExpandedNodeIds<
  TNode extends BuildTreeNodeLike<TNode>,
>(tree: TNode): string[] {
  return flattenBuildTree(tree)
    .filter((node) => (node.children?.length ?? 0) > 0)
    .map((node) => node.id);
}

export function buildTreeRootExpandedNodeIds<
  TNode extends BuildTreeNodeLike<TNode>,
>(tree: TNode): string[] {
  return (tree.children?.length ?? 0) > 0 ? [tree.id] : [];
}

export function buildTreeStructuredGroupNodeIds<
  TNode extends BuildTreeNodeLike<TNode>,
>(
  tree: TNode,
  options: {
    childKind: string;
    groupKind: string;
  },
): string[] {
  return flattenBuildTree(tree)
    .filter(
      (node) =>
        node.kind === options.groupKind &&
        (node.children ?? []).some((child) => child.kind === options.childKind),
    )
    .map((node) => node.id);
}

export function buildTreeReviewCollapsibleNodeIds<
  TNode extends BuildTreeNodeLike<TNode>,
>(
  tree: TNode,
  options: {
    leafKind: string;
  },
): string[] {
  return flattenBuildTree(tree)
    .filter((node) => {
      if (node.kind === options.leafKind) {
        return false;
      }

      return (node.children?.length ?? 0) > 0;
    })
    .map((node) => node.id);
}

export function buildTreeNodeSummary<TNode extends BuildTreeNodeLike<TNode>>(
  node: TNode,
  options: {
    childItemLabel: (count: number) => string;
    groupKind: string;
    groupSummary: (node: TNode) => string;
    rootKind: string;
    rootSummary: (node: TNode) => string;
  },
) {
  const childCount = node.children?.length ?? 0;
  if (childCount === 0) {
    return node.description;
  }

  if (node.kind === options.rootKind) {
    return options.rootSummary(node);
  }

  if (node.kind === options.groupKind) {
    return options.groupSummary(node);
  }

  return options.childItemLabel(childCount);
}

export function buildTreeNodeDisplayTitle<
  TKind extends string,
  TNode extends BuildTreeNodeLike<TNode> & { kind: TKind },
>(node: TNode, profile: BuildTreeTitleProfile<TKind>) {
  const titleParts = buildTreeNodeTitleParts(node, profile);
  const editable = titleParts.editable.trim();

  if (!editable) {
    return `${titleParts.locked} - Untitled`;
  }

  return `${titleParts.locked} - ${editable}`;
}

export function buildTreeNodeTitleParts<
  TKind extends string,
  TNode extends BuildTreeNodeLike<TNode> & { kind: TKind },
>(
  node: TNode,
  profile: BuildTreeTitleProfile<TKind>,
): BuildTreeTitleParts {
  const title = node.title.trim();
  const match = title.match(profile.prefixPattern);

  if (match) {
    return {
      editable: match[2],
      locked: profile.normalizePrefix(match[1], node.kind),
    };
  }

  return {
    editable: title,
    locked: buildTreeNodeSystemTitle(node, profile),
  };
}

export function composeBuildTreeNodeTitle<
  TKind extends string,
  TNode extends BuildTreeNodeLike<TNode> & { kind: TKind },
>(
  node: TNode,
  editable: string,
  profile: BuildTreeTitleProfile<TKind>,
) {
  return `${buildTreeNodeTitleParts(node, profile).locked} - ${editable}`;
}

export function buildTreeNodeSystemTitle<
  TKind extends string,
  TNode extends BuildTreeNodeLike<TNode> & { kind: TKind },
>(node: TNode, profile: BuildTreeTitleProfile<TKind>) {
  const title = node.title.trim();
  const fallback = profile.kindFallbacks[node.kind];
  return (
    title.match(
      new RegExp(`^${escapeBuildTreeRegExp(fallback)}(?: #\\d+| \\d+)?`, "i"),
    )?.[0] ?? fallback
  );
}

function escapeBuildTreeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
