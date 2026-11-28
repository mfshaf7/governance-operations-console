import type { DeliveryArtNode } from "../../domain/delivery-execution.ts";

function workItemNumber(value: unknown): number | null {
  if (typeof value !== "string" || !/^work-item-[1-9][0-9]*$/.test(value)) return null;
  const number = Number(value.slice("work-item-".length));
  return Number.isSafeInteger(number) ? number : null;
}

export function completionPrerequisitesFromPlan(architecture: Record<string, unknown>) {
  const result: Record<number, number[]> = {};
  const groups = architecture.landing_units;
  const order = architecture.work_item_execution_plan;
  if (!Array.isArray(groups) || !Array.isArray(order)) return result;
  const nonSourceWork = new Set(groups.flatMap(group => group?.source_backed === false &&
    Array.isArray(group.covered_work_item_ids) ? group.covered_work_item_ids : []));
  for (const entry of order) {
    if (!nonSourceWork.has(entry?.work_item_id) ||
        !Array.isArray(entry.start_after_work_item_ids) || !Array.isArray(entry.close_after_work_item_ids)) continue;
    const work = workItemNumber(entry.work_item_id);
    if (work === null) continue;
    const start = new Set(entry.start_after_work_item_ids);
    const close = entry.close_after_work_item_ids.filter((id: unknown) => !start.has(id))
      .map(workItemNumber).filter((id: number | null): id is number => id !== null && id !== work);
    if (close.length) result[work] = close;
  }
  return result;
}

export function withCompletionPrerequisites(
  node: DeliveryArtNode,
  timing: Readonly<Record<number, number[]>>,
): DeliveryArtNode {
  const confirmed = node.legacy_work_package_id === null ? undefined : timing[node.legacy_work_package_id];
  const open = node.unresolved_dependency_work_package_ids?.filter(id => confirmed?.includes(id));
  const children = node.children.map(child => withCompletionPrerequisites(child, timing));
  if (!open?.length && children.every((child, index) => child === node.children[index])) return node;
  return { ...node, children, ...(open?.length ? { completion_prerequisite_work_package_ids: open } : {}) };
}
