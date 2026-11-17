import type { ExecutionTreeDraftNode } from "./execution-board-view-model.ts";

/** The original source snapshot supplies context, independently of local edits. */
export function executionAdvisorUpstreamContext(tree: ExecutionTreeDraftNode | null, nodeId: string) {
  function path(node: ExecutionTreeDraftNode): ExecutionTreeDraftNode[] | null {
    if (node.id === nodeId) return [node];
    for (const child of node.children) {
      const found = path(child);
      if (found) return [node, ...found];
    }
    return null;
  }
  return (tree ? path(tree) : null)?.map(({ id, kind, title, description }) => ({ id, kind, title, description })) ?? [];
}
