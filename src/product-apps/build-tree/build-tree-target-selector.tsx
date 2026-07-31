"use client";

import type { ReactNode } from "react";

import {
  BuildTreeNodeCard,
  BuildTreeNodeChildren,
  BuildTreeNodeStack,
} from "./build-tree-node";

export type BuildTreeTargetSelectionMode = "multi" | "single";

export type BuildTreeTargetNodeLike<TNode> = {
  children?: TNode[];
  description: string;
  id: string;
  kind: string;
  title: string;
};

export type BuildTreeTargetSelectorProps<
  TNode extends BuildTreeTargetNodeLike<TNode>,
> = {
  getDescription?: (node: TNode) => ReactNode;
  getIndex: (node: TNode, position: number) => ReactNode;
  getKindLabel?: (kind: TNode["kind"], node: TNode) => ReactNode;
  getMeta?: (node: TNode) => ReactNode;
  getTitle?: (node: TNode) => ReactNode;
  onSelectNode: (node: TNode) => void;
  rootPosition?: number;
  selectedNodeIds: string[];
  selectionMode: BuildTreeTargetSelectionMode;
  tree: TNode;
};

export function BuildTreeTargetSelector<
  TNode extends BuildTreeTargetNodeLike<TNode>,
>({
  getDescription = (node) => node.description,
  getIndex,
  getKindLabel = (kind) => kind,
  getMeta,
  getTitle = (node) => node.title,
  onSelectNode,
  rootPosition = 0,
  selectedNodeIds,
  selectionMode,
  tree,
}: BuildTreeTargetSelectorProps<TNode>) {
  function renderNode(node: TNode, position: number) {
    const children = node.children ?? [];
    const selected = selectedNodeIds.includes(node.id);

    return (
      <BuildTreeNodeStack key={node.id}>
        <BuildTreeNodeCard
          childrenCount={children.length}
          dataKind={node.kind}
          description={getDescription(node)}
          indexLabel={getIndex(node, position)}
          kind={getKindLabel(node.kind, node)}
          meta={getMeta?.(node)}
          onClick={() => onSelectNode(node)}
          selected={selected}
          title={getTitle(node)}
        />
        {children.length > 0 ? (
          <BuildTreeNodeChildren>
            {children.map((child, childIndex) => renderNode(child, childIndex))}
          </BuildTreeNodeChildren>
        ) : null}
      </BuildTreeNodeStack>
    );
  }

  return (
    <div data-build-tree-target-selector={selectionMode}>
      {renderNode(tree, rootPosition)}
    </div>
  );
}
