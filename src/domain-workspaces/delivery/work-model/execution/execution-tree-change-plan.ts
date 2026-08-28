import type { DeliveryChangeOperation } from "../../live-runtime/delivery-change-live-types.ts";

export type ExecutionTreeChangeDraftNode = {
  children: ExecutionTreeChangeDraftNode[];
  draftBody: string;
  id: string;
  kind: string;
  legacyWorkPackageId: number | null;
  remark: string;
  title: string;
};

export type ExecutionTreeChangePlanItem = {
  buildOperation: (resolvedNodeIds: ReadonlyMap<string, string>) => DeliveryChangeOperation;
  id: string;
  label: string;
  localNodeId: string | null;
};

export function buildExecutionTreeChangePlan({
  baseline,
  draft,
}: {
  baseline: ExecutionTreeChangeDraftNode;
  draft: ExecutionTreeChangeDraftNode;
}): ExecutionTreeChangePlanItem[] {
  const baselineNodes = flattenTree(baseline);
  const draftNodes = flattenTree(draft);
  const baselineByWorkItemId = new Map(
    baselineNodes
      .filter((node) => node.legacyWorkPackageId !== null)
      .map((node) => [node.legacyWorkPackageId as number, node]),
  );
  const plan: ExecutionTreeChangePlanItem[] = [];

  for (const node of draftNodes) {
    if (node.legacyWorkPackageId === null) continue;
    const source = baselineByWorkItemId.get(node.legacyWorkPackageId);
    if (!source) continue;
    const subjectChanged = node.title.trim() !== source.title.trim();
    const descriptionChanged =
      node.draftBody.trim() !== source.draftBody.trim();
    const noteChanged = node.remark.trim() !== source.remark.trim();
    if (!subjectChanged && !descriptionChanged) continue;
    const changes: Record<string, string> = {};
    if (subjectChanged) changes.subject = node.title.trim();
    if (descriptionChanged) {
      changes.description = node.draftBody.trim();
    }
    plan.push({
      buildOperation: () => ({
        payload: {
          changes,
          work_item_id: `work-item-${node.legacyWorkPackageId}`,
          ...(noteChanged && node.remark.trim()
            ? { work_note: node.remark.trim() }
            : {}),
        },
        type: "revise_work_item",
      }),
      id: `revise-${node.legacyWorkPackageId}`,
      label: `Revise ${node.kind} #${node.legacyWorkPackageId}`,
      localNodeId: null,
    });
  }

  walkNewNodes(draft, null, plan);
  return plan;
}

function walkNewNodes(
  node: ExecutionTreeChangeDraftNode,
  parent: ExecutionTreeChangeDraftNode | null,
  plan: ExecutionTreeChangePlanItem[],
) {
  if (node.legacyWorkPackageId === null) {
    if (!parent) throw new Error("A new Delivery root cannot be created from inline edit.");
    const parentReference =
      parent.legacyWorkPackageId === null
        ? parent.id
        : `work-item-${parent.legacyWorkPackageId}`;
    plan.push({
      buildOperation: (resolvedNodeIds) => {
        const parentWorkItemId = parentReference.startsWith("work-item-")
          ? parentReference
          : resolvedNodeIds.get(parentReference);
        if (!parentWorkItemId) {
          throw new Error("A new child cannot be applied before its parent exists.");
        }
        return {
          payload: {
            description: node.draftBody.trim() || null,
            parent_work_item_id: parentWorkItemId,
            subject: node.title.trim(),
            type: node.kind,
          },
          type: "add_work_item",
        };
      },
      id: `add-${node.id}`,
      label: `Add ${node.kind}: ${node.title.trim()}`,
      localNodeId: node.id,
    });
  }
  for (const child of node.children) walkNewNodes(child, node, plan);
}

function flattenTree(tree: ExecutionTreeChangeDraftNode) {
  const nodes: ExecutionTreeChangeDraftNode[] = [];
  const visit = (node: ExecutionTreeChangeDraftNode) => {
    nodes.push(node);
    node.children.forEach(visit);
  };
  visit(tree);
  return nodes;
}

export function createdWorkItemId(effect: Record<string, unknown>) {
  const value = effect.work_item_id;
  if (typeof value === "string" && /^(?:work-item-)?[1-9][0-9]*$/.test(value)) {
    return value.startsWith("work-item-") ? value : `work-item-${value}`;
  }
  return null;
}
