import type { DeliveryPackageSummary } from "../../domain/delivery-package.ts";
import type { DeliveryReadModel, DeliveryRefinementPacket } from "../../read-model/index.ts";
import { getPackageTree } from "../../read-model/index.ts";
import { recordedPlanningIteration } from "../../work-model/catalog/planning-calendar.ts";

export type PreviewPIObjective = {
  id: string | null;
  title: string;
  type: "Committed" | "Stretch" | "";
  plannedBusinessValue: string;
};

export type PreviewPIAssignment = {
  epicId: number;
  itemId: string;
  iteration: string;
};

export type PreviewPIPlan = {
  pi: string;
  assignments: Record<string, PreviewPIAssignment>;
  objectives: Record<string, PreviewPIObjective>;
  deliveryTargetNotes?: Record<string, { iteration: string; reason: string }>;
};

export function previewPIPlansForEpic(plans: Record<string, PreviewPIPlan> | undefined, epicId: number) {
  return Object.values(plans ?? {}).flatMap(plan => {
    const assignments = Object.values(plan.assignments).filter(item => item.epicId === epicId);
    return assignments.length ? [{ pi: plan.pi, assignments, objective: plan.objectives[epicId] }] : [];
  });
}

export function refinementPreparationComplete(item: DeliveryPackageSummary) {
  return item.workflow_phase === "execution" ||
    Boolean(item.execution_navigation?.planning_prepared_work_item_ids?.length) ||
    item.local_workflow_projection?.status_label === "Done" ||
    item.refinement_packet?.receipt?.outcome === "accepted";
}

const planningFields = new Set(["target_pi", "iteration", "pi_objective_type", "planned_business_value",
  "actual_business_value", "pi_objective_review_outcome"]);

export function preparationOnlyPacket(packet: DeliveryRefinementPacket): DeliveryRefinementPacket {
  if (packet.receipt) return packet;
  const operations = packet.apply_plan.operations.filter(item => !["plan_apply", "plan_repair"].includes(item.kind));
  return {
    ...packet,
    draft_groups: packet.draft_groups.map(group => ({
      ...group,
      fields: group.fields.filter(field => !planningFields.has(field.backend_field)),
    })).filter(group => group.fields.length > 0),
    readiness_gates: packet.readiness_gates.filter(gate => !gate.gate_id.endsWith("-gate-pi")),
    apply_plan: {
      ...packet.apply_plan,
      operations,
      expected_routes: [...new Set(operations.map(item => item.oos_route))],
      summary: "Record work preparation. Commit scope and iteration in PI Planning.",
    },
  };
}

export function getPlanningNodes(item: DeliveryPackageSummary, model: DeliveryReadModel) {
  const packetTree = item.refinement_packet?.target_tree;
  const packetNodes = packetTree ? [packetTree] : [];
  for (const node of packetNodes) packetNodes.push(...(node.children ?? []));
  const planningById = new Map(packetNodes.map(node => [node.id, node.planning]));
  const backlog = item.refinement_packet?.planning_rules?.backlog_iteration_label;
  const activeIteration = (value: string | null | undefined) => recordedPlanningIteration(value, backlog);
  const objectiveField = (id: string, name: string) => item.refinement_packet?.draft_groups
    .flatMap(group => group.fields)
    .find(field => field.backend_field === name && field.target_values && id in field.target_values)
    ?.target_values?.[id] ?? "";
  const tree = getPackageTree(item.delivery_package_id, model);
  if (tree) {
    const list = [{ node: tree, parentId: null as string | null }];
    for (const { node } of list) list.push(...node.children.map(child => ({ node: child, parentId: node.id })));
    return list.map(({ node, parentId }) => ({
      parentId,
      id: node.id, type: node.component_type, title: node.title, number: node.legacy_work_package_id,
      description: node.description,
      status: node.backend_status,
      available: ["new", "ready", "parked"].includes(node.backend_status),
      terminal: ["done", "retired"].includes(node.backend_status),
      currentPI: (node.planning?.targetPI ?? planningById.get(node.id)?.target_pi) || null,
      currentIteration: activeIteration(node.planning?.iteration ?? planningById.get(node.id)?.iteration),
      objectiveType: node.planning?.objectiveType || objectiveField(node.id, "pi_objective_type"),
      plannedBusinessValue: node.planning?.plannedBusinessValue || objectiveField(node.id, "planned_business_value"),
      dependencies: node.depends_on_work_package_ids ?? [],
    }));
  }
  const packetParents = new Map(packetNodes.flatMap(node => (node.children ?? []).map(child => [child.id, node.id])));
  return packetNodes.map(node => ({
    parentId: packetParents.get(node.id) ?? null,
    id: node.id, type: node.kind, title: node.title, number: null,
    description: node.description, status: node.planning?.status ?? "", available: false, dependencies: [] as number[],
    terminal: ["done", "retired"].includes(node.planning?.status ?? ""),
    currentPI: node.planning?.target_pi || null,
    currentIteration: activeIteration(node.planning?.iteration),
    objectiveType: objectiveField(node.id, "pi_objective_type"),
    plannedBusinessValue: objectiveField(node.id, "planned_business_value"),
  }));
}

export type PlanningDependencyItem = {
  id: string;
  title: string;
  number: number | null;
  dependencies: readonly number[];
  currentPI?: string | null;
  currentIteration?: string | null;
  terminal?: boolean;
};

export function findPIPlanningDependencyConflict(
  items: readonly PlanningDependencyItem[],
  iterations: readonly string[],
  pi: string,
  assignments: Record<string, PreviewPIAssignment>,
  changed: ReadonlySet<string>,
) {
  const byNumber = new Map(items.filter(item => item.number !== null).map(item => [item.number, item]));
  const position = new Map(iterations.map((iteration, index) => [iteration, index]));
  for (const item of items) {
    const iteration = assignments[item.id]?.iteration ?? (item.currentPI === pi ? item.currentIteration : null);
    if (!iteration || item.terminal) continue;
    for (const number of item.dependencies) {
      const prerequisite = byNumber.get(number);
      if (!prerequisite || prerequisite.terminal || (!changed.has(item.id) && !changed.has(prerequisite.id))) continue;
      const scheduled = assignments[prerequisite.id]?.iteration ??
        (prerequisite.currentPI === pi ? prerequisite.currentIteration : null);
      if (!scheduled || (position.get(scheduled) ?? Infinity) > (position.get(iteration) ?? -1)) {
        return { item, prerequisite };
      }
    }
  }
  return null;
}

type PlanningStructureItem = PlanningDependencyItem & { type: string; parentId: string | null };

export function findPIPlanningStructureConflict(
  items: readonly PlanningStructureItem[],
  assignments: Record<string, PreviewPIAssignment>,
  changed: ReadonlySet<string>,
) {
  const byId = new Map(items.map(item => [item.id, item]));
  for (const item of items) {
    if (!changed.has(item.id)) continue;
    const parent = item.parentId ? byId.get(item.parentId) : undefined;
    if (parent?.type === "Feature" && !assignments[parent.id] && !parent.currentPI) {
      return `Schedule the parent Feature “${parent.title}” before recording “${item.title}”.`;
    }
    if (item.type === "Feature" && !items.some(child => child.parentId === item.id &&
      !child.terminal && (child.type === "User story" || child.type === "Defect"))) {
      return `Add an open story or defect under “${item.title}” before recording the Feature.`;
    }
  }
  return null;
}


export const iterationWorkTypes = new Set(["User story", "Defect", "Task"]);

type DeliveryForecastItem = Pick<PlanningDependencyItem, "id" | "currentPI" | "currentIteration"> & {
  type: string;
  status: string;
};

export function assessFeatureDeliveryTarget(
  feature: DeliveryForecastItem,
  children: readonly DeliveryForecastItem[],
  iterations: readonly string[],
  plan: Pick<PreviewPIPlan, "pi" | "assignments">,
) {
  const positions = new Map(iterations.map((iteration, index) => [iteration, index]));
  const iterationOf = (item: DeliveryForecastItem) =>
    plan.assignments[item.id]?.iteration ?? (item.currentPI === plan.pi ? item.currentIteration : null);
  let latestIndex = -1;
  let unplanned = 0;
  let complete = 0;
  const scoped = children.filter(item => iterationWorkTypes.has(item.type) && item.status !== "retired" && item.status !== "parked");
  for (const child of scoped) {
    const iteration = iterationOf(child);
    const index = iteration ? positions.get(iteration) : undefined;
    if (index !== undefined) latestIndex = Math.max(latestIndex, index);
    if (child.status === "done") complete += 1;
    else if (index === undefined) unplanned += 1;
  }
  const target = iterationOf(feature) ?? null;
  const targetIndex = target ? positions.get(target) : undefined;
  return {
    inScope: scoped.length,
    unplanned,
    complete,
    target,
    latest: iterations[latestIndex] ?? null,
    earlier: targetIndex !== undefined && targetIndex < latestIndex,
    later: unplanned === 0 && latestIndex >= 0 && targetIndex !== undefined && targetIndex > latestIndex,
  };
}
