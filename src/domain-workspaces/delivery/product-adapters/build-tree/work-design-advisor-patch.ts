import type { WorkDesignNode } from "../../work-model/work-design/work-design-types.ts";

const children: Record<string, string[]> = { Epic: ["Feature", "Risk"], Feature: ["User story"], "User story": [], Risk: [] };
function object(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Malformed tree draft patch.");
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw Error("Unsupported tree patch field.");
}
function id(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_.:-]{1,256}$/.test(value)) throw Error("Invalid local tree identity.");
}
function list(value: unknown): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100) throw Error("Tree edit batch exceeds its bound.");
  return value;
}
function treeIndex(root: WorkDesignNode) {
  const index = new Map<string, WorkDesignNode>();
  function visit(node: WorkDesignNode, parent: WorkDesignNode | null, depth: number) {
    if (depth > 12 || index.size >= 250) throw Error("Tree draft exceeds its bound.");
    object(node); id(node.id);
    if (index.has(node.id)) throw Error("Duplicate draft node identity.");
    if (!Object.hasOwn(children, node.kind) || (parent && !children[parent.kind].includes(node.kind))) throw Error("Invalid draft parent/child relationship.");
    for (const key of ["title", "description", "draftBody", "remark"] as const) {
      const limit = key === "draftBody" ? 20_000 : key === "title" ? 500 : 8000;
      if (typeof node[key] !== "string" || node[key].length > limit || (key === "title" && !node.title.trim())) throw Error("Invalid draft node text.");
    }
    if (node.children !== undefined && !Array.isArray(node.children)) throw Error("Invalid draft children.");
    index.set(node.id, node);
    for (const child of node.children ?? []) visit(child, node, depth + 1);
  }
  visit(root, null, 0); return index;
}

/** Local tree transaction only; no ART mutation or execution metadata exists here. */
export function applyWorkDesignAdvisorPatch(base: WorkDesignNode, value: unknown): WorkDesignNode {
  object(value); keys(value, ["addNodes", "updateNodes", "removeNodeIds"]);
  const next = structuredClone(base);
  const index = treeIndex(next);
  const removed = new Set<string>();
  for (const target of list(value.removeNodeIds)) {
    id(target);
    if (target === next.id || !index.has(target) || removed.has(target)) throw Error("Cannot remove the root, an absent node or a duplicate target.");
    removed.add(target);
  }
  function prune(node: WorkDesignNode) {
    if (!node.children) return;
    node.children = node.children.filter((child) => !removed.has(child.id));
    node.children.forEach(prune);
  }
  prune(next);
  const remaining = treeIndex(next);
  const updated = new Set<string>();
  for (const patch of list(value.updateNodes)) {
    object(patch); keys(patch, ["id", "title", "description", "draftBody", "remark"]); id(patch.id);
    const target = remaining.get(patch.id);
    if (!target || updated.has(patch.id)) throw Error("Cannot update an absent or duplicate node.");
    updated.add(patch.id);
    for (const key of ["title", "description", "draftBody", "remark"] as const) {
      if (patch[key] !== undefined) {
        if (typeof patch[key] !== "string") throw Error("Invalid draft text update.");
        target[key] = patch[key];
      }
    }
  }
  for (const addition of list(value.addNodes)) {
    object(addition); keys(addition, ["parentId", "node"]); id(addition.parentId); object(addition.node);
    keys(addition.node, ["id", "kind", "title", "description", "draftBody", "remark", "children"]);
    id(addition.node.id);
    if (index.has(addition.node.id) || remaining.has(addition.node.id) || /^(?:work-item-|openproject:|https?:)/.test(addition.node.id)) {
      throw Error("A new local node cannot reuse an existing or canonical identity.");
    }
    const parent = remaining.get(addition.parentId);
    if (!parent) throw Error("New node's parent is outside this draft.");
    // Add one node per operation; nested creation is expressed by later ordered additions.
    if (addition.node.children !== undefined && (!Array.isArray(addition.node.children) || addition.node.children.length)) throw Error("Add draft children as separate explicit operations.");
    const node = { ...addition.node, tone: "info", children: [] } as unknown as WorkDesignNode;
    parent.children = [...(parent.children ?? []), node];
    remaining.set(node.id, node);
  }
  treeIndex(next);
  return next;
}
