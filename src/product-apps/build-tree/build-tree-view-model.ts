import type { BuildTreeNodeLike } from "./build-tree-core";

export type BuildTreeStructuredNodeLayout<TNode> = {
  childCount: number;
  children: TNode[];
  groupedLeafChildren: TNode[];
  primaryChildren: TNode[];
  supportChildren: TNode[];
  ungroupedChildren: TNode[];
  visibleChildren: TNode[];
};

export function buildTreeStructuredNodeLayout<
  TNode extends BuildTreeNodeLike<TNode>,
>(
  node: TNode,
  options: {
    groupKind: string;
    isSupportNode: (node: TNode) => boolean;
    leafKind: string;
    rootKind: string;
  },
): BuildTreeStructuredNodeLayout<TNode> {
  const children = node.children ?? [];
  const primaryChildren = children.filter(
    (child) => child.kind === options.groupKind,
  );
  const supportChildren = children.filter(options.isSupportNode);
  const groupedLeafChildren = children.filter(
    (child) => child.kind === options.leafKind,
  );
  const ungroupedChildren = children.filter(
    (child) => child.kind !== options.leafKind,
  );
  const visibleChildren =
    node.kind === options.rootKind
      ? primaryChildren
      : node.kind === options.groupKind
        ? ungroupedChildren
        : children;

  return {
    childCount: children.length,
    children,
    groupedLeafChildren,
    primaryChildren,
    supportChildren,
    ungroupedChildren,
    visibleChildren,
  };
}
