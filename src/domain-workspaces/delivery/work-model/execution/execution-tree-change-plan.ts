import type { DeliveryChangeOperation } from "../../live-runtime/delivery-change-live-types.ts";
import type { DeliveryCatalogValue, DeliveryComponentType } from "../../read-model/index.ts";
import { iterationCatalogId, targetPiCatalogId } from "../catalog/catalog-selectors.ts";
import { calendarDateRange, datedIterationIndex } from "../catalog/planning-calendar.ts";
import { executionDependencyChangePlan, executionDependencyIssues } from "./execution-tree-dependencies.ts";
import type { ExecutionTreeChangeDraftNode, ExecutionTreeChangePlanItem } from "./execution-tree-change-types.ts";
export type { ExecutionTreeChangeDraftNode, ExecutionTreeChangePlanItem } from "./execution-tree-change-types.ts";

const childKinds: Partial<Record<DeliveryComponentType, readonly DeliveryComponentType[]>> = {
  Epic: ["PI Objective", "Feature", "Risk", "Milestone", "Defect"],
  Feature: ["User story", "Defect"],
  "User story": ["Task", "Defect"],
  Defect: ["Task"],
};

export function executionTreeChildKinds(parentKind: DeliveryComponentType): DeliveryComponentType[] {
  return [...(childKinds[parentKind] ?? [])];
}

export type ExecutionCreationPlanningChoices = ReadonlyMap<string, readonly { label: string; value: string }[]>;

export function executionCreationPlanningChoices(values: readonly DeliveryCatalogValue[]): ExecutionCreationPlanningChoices {
  const dated = datedIterationIndex(values);
  const programWide = values.filter(value => value.catalog_item_id === iterationCatalogId &&
    value.lifecycle_state === "active" && value.value_key.startsWith("Program-wide / "))
    .map(value => ({ value: value.value_key, label: `${value.value_key} · No calendar dates` }));
  return new Map(values.filter(value => value.catalog_item_id === targetPiCatalogId &&
    (["active", "admitted"].includes(value.lifecycle_state) ||
      (value.value_key === "Program-wide" && value.lifecycle_state === "read_only")))
    .map(({ value_key: pi }) => [pi, [
      ...[...dated].filter(([, calendar]) => calendar.pi === pi).sort((a, b) => a[1].window.sequence - b[1].window.sequence)
        .map(([value, { window }]) => ({ value, label: `Iteration ${window.sequence} · ${calendarDateRange(window.start_date, window.end_date)}` })),
      ...programWide,
    ]]));
}

function creationPlanningNodes(node: ExecutionTreeChangeDraftNode, parentPi = ""): Array<{
  node: ExecutionTreeChangeDraftNode; pi: string; parentPi: string;
}> {
  const inherited = node.legacyWorkPackageId === null ? parentPi : "";
  const pi = node.targetPi?.trim() || inherited;
  return [{ node, pi, parentPi }, ...node.children.flatMap(child => creationPlanningNodes(child, pi))];
}

export function inheritedExecutionTreePI(tree: ExecutionTreeChangeDraftNode, nodeId: string) {
  return creationPlanningNodes(tree).find(({ node }) => node.id === nodeId)?.parentPi ?? "";
}

export function executionTreePlanningInputIssues(tree: ExecutionTreeChangeDraftNode, choices?: ExecutionCreationPlanningChoices) {
  return [...executionDependencyIssues(tree), ...creationPlanningNodes(tree).filter(({ node }) => node.legacyWorkPackageId === null).flatMap(({ node, pi, parentPi }) => {
    const iteration = node.iteration?.trim() ?? "";
    const issues: string[] = [];
    if (!pi && (iteration || ["PI Objective", "Task", "Milestone"].includes(node.kind))) {
      issues.push("Choose a Target PI.");
    }
    if (node.kind === "Feature" && pi) {
      issues.push("Adding a Feature to a committed PI requires a reviewed initiative plan.");
    }
    if (pi && ["User story", "Task"].includes(node.kind) && !parentPi) {
      issues.push("Plan the parent work before committing this item.");
    }
    if (pi && node.kind !== "Feature" && !choices?.get(pi)?.some(option => option.value === iteration)) {
      issues.push("Choose a saved iteration for this PI.");
    }
    return issues.map((issue) => `${node.title}: ${issue}`);
  })];
}

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
    const workNote = node.remark.trim() !== source.remark.trim() ? node.remark.trim() : "";
    if (!subjectChanged && !descriptionChanged && !workNote) continue;
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
          ...(workNote ? { work_note: workNote } : {}),
        },
        type: "revise_work_item",
      }),
      id: `revise-${node.legacyWorkPackageId}`,
      label: `${subjectChanged || descriptionChanged ? "Revise" : "Save remark on"} ${node.kind} #${node.legacyWorkPackageId}`,
      localNodeId: null,
    });
  }

  walkNewNodes(draft, null, plan);
  return [...plan, ...executionDependencyChangePlan(baseline, draft)];
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
            ...(node.remark.trim() ? { work_note: node.remark.trim() } : {}),
            parent_work_item_id: parentWorkItemId,
            subject: node.title.trim(),
            ...(node.targetPi?.trim() ? { target_pi: node.targetPi.trim() } : {}),
            ...(node.iteration?.trim() ? { iteration: node.iteration.trim() } : {}),
            type: node.kind,
          },
          type: "add_work_item",
        };
      },
      id: `add-${node.id}`,
      label: `Add ${node.kind}: ${node.title.trim()}` +
        (node.targetPi?.trim() ? ` — Target PI: ${node.targetPi.trim()}` : "") +
        (node.iteration?.trim() ? `; Iteration: ${node.iteration.trim()}` : ""),
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
