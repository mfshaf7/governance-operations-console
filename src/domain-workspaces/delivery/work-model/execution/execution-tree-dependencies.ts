import type { ExecutionTreeChangeDraftNode, ExecutionTreeChangePlanItem } from "./execution-tree-change-types.ts";

const canonicalId = /^work-item-[1-9][0-9]*$/;
export function executionDependencyReference(node: ExecutionTreeChangeDraftNode) {
  return node.legacyWorkPackageId === null ? node.id : `work-item-${node.legacyWorkPackageId}`;
}

export function executionDependencyNodes(tree: ExecutionTreeChangeDraftNode): ExecutionTreeChangeDraftNode[] {
  return [tree, ...tree.children.flatMap(executionDependencyNodes)];
}

/** Preserve actual predecessors, including those outside the displayed package. */
export function withExecutionTreeDependencies<T extends ExecutionTreeChangeDraftNode>(tree: T, relations: Record<string, unknown>[]): T {
  const byTarget = new Map<string, Set<string>>();
  for (const relation of relations) {
    const source = relation.depends_on as { id?: unknown } | undefined;
    const target = relation.target as { id?: unknown } | undefined;
    if (relation.relation_type !== "follows" || !Number.isSafeInteger(source?.id) || Number(source?.id) <= 0 || !Number.isSafeInteger(target?.id) || Number(target?.id) <= 0) {
      throw new Error("Recorded work dependencies could not be verified. Refresh before editing; no links were discarded.");
    }
    const key = `work-item-${target!.id}`, predecessors = byTarget.get(key) ?? new Set<string>();
    predecessors.add(`work-item-${source!.id}`); byTarget.set(key, predecessors);
  }
  const visit = (node: ExecutionTreeChangeDraftNode): ExecutionTreeChangeDraftNode => ({
    ...node, dependsOnIds: [...(byTarget.get(executionDependencyReference(node)) ?? [])].sort(), children: node.children.map(visit),
  });
  return visit(tree) as T;
}

export function executionDependencyIssues(tree: ExecutionTreeChangeDraftNode): string[] {
  const nodes = executionDependencyNodes(tree), known = new Map(nodes.map(node => [executionDependencyReference(node), node]));
  const issues: string[] = [];
  for (const node of nodes) {
    const id = executionDependencyReference(node), refs = node.dependsOnIds ?? [];
    if (new Set(refs).size !== refs.length) issues.push(`${node.title}: choose each prerequisite once.`);
    for (const ref of refs) {
      if (ref === id) issues.push(`${node.title}: a work item cannot depend on itself.`);
      else if (!known.has(ref) && !canonicalId.test(ref)) issues.push(`${node.title}: a prerequisite was removed from this draft. Remove that link or restore the item.`);
    }
  }
  const visiting = new Set<string>(), done = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (done.has(id)) return false;
    visiting.add(id);
    if ((known.get(id)?.dependsOnIds ?? []).some(ref => known.has(ref) && visit(ref))) return true;
    visiting.delete(id); done.add(id); return false;
  };
  if (nodes.some(node => visit(executionDependencyReference(node)))) issues.push("Work dependencies form a cycle. Remove a link so the work can proceed in order.");
  return issues;
}

export function executionDependencyChangePlan(baseline: ExecutionTreeChangeDraftNode, draft: ExecutionTreeChangeDraftNode): ExecutionTreeChangePlanItem[] {
  const nodes = executionDependencyNodes(draft), before = new Map(executionDependencyNodes(baseline).map(node => [executionDependencyReference(node), node]));
  const names = new Map(nodes.map(node => [executionDependencyReference(node), `${node.kind}${node.legacyWorkPackageId ? ` ${node.legacyWorkPackageId}` : ""} · ${node.title}`]));
  const removed: ExecutionTreeChangePlanItem[] = [], added: ExecutionTreeChangePlanItem[] = [];
  for (const node of nodes) {
    const target = executionDependencyReference(node), oldRefs = before.get(target)?.dependsOnIds ?? [], nextRefs = node.dependsOnIds ?? [];
    for (const [action, refs] of [["clear", oldRefs.filter(ref => !nextRefs.includes(ref))], ["set", nextRefs.filter(ref => !oldRefs.includes(ref))]] as const) {
      for (const ref of refs) {
        const resolve = (value: string, ids: ReadonlyMap<string, string>) => {
          const id = canonicalId.test(value) ? value : ids.get(value);
          if (!id || !canonicalId.test(id)) throw new Error("Create the prerequisite and dependent work items before applying their dependency.");
          return id;
        };
        (action === "clear" ? removed : added).push({
          id: `dependency-${action}-${target}-${ref}`, localNodeId: null,
          label: `${action === "set" ? "Require" : "Remove prerequisite"} ${names.get(ref) ?? ref.replace("work-item-", "Work item ")} ${action === "set" ? "before" : "from"} ${names.get(target)}`,
          buildOperation: ids => ({ type: "manage_dependency", payload: { action, target_work_item_id: resolve(target, ids), depends_on_work_item_id: resolve(ref, ids) } }),
        });
      }
    }
  }
  // Remove old edges before adding replacements, avoiding a transient cycle.
  return [...removed, ...added];
}
