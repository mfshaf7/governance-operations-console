import type { DeliveryActiveBlockerProjection, DeliveryAvailableAction } from "../../domain/delivery-package.ts";
import type { DeliveryArtNode } from "../../domain/delivery-execution.ts";

export type ExecutionWorkFilter = "all" | "in-progress" | "blocked" | "ready";
export const executionWorkLabels = { "in-progress": "In progress", blocked: "Blocked work", ready: "Marked ready" } as const;
const leafTypes = new Set(["User story", "Defect", "Task"]);
const flatten = (items: DeliveryArtNode[]): DeliveryArtNode[] => items.flatMap(item => [item, ...flatten(item.children)]);
const matches = (item: DeliveryArtNode, status: ExecutionWorkFilter) => item.backend_status === status || status === "blocked" &&
  !["done", "retired"].includes(item.backend_status) && Boolean(item.blocker || item.dependency_blocked);
export function executionWorkChoices(nodes: DeliveryArtNode[], status: ExecutionWorkFilter) {
  return flatten(nodes).filter(item => item.legacy_work_package_id !== null &&
    (status === "all" || (status === "blocked" || leafTypes.has(item.component_type)) && matches(item, status)));
}
export function executionPackageWorkGroups(tree: DeliveryArtNode | null) {
  return (["in-progress", "blocked", "ready"] as const).map(status => {
    const items = tree ? flatten(tree.children).filter(item => leafTypes.has(item.component_type) && matches(item, status)) : [];
    return { status, label: executionWorkLabels[status], items, count: tree ? items.length : null };
  });
}
export function executionPackageText(value: string) {
  // Expand a known native field label; retain original record text in details.
  return value.replace(/\bowner repo\b|\bowner_repo\b/gi, (match, offset) =>
    offset === 0 && /^[A-Z]/.test(match) ? "Implementation repository" : "implementation repository");
}
export function executionBlockerApproach(blocker: DeliveryActiveBlockerProjection) {
  return { remove: "Resolve the cause", workaround: "Use a workaround", "accept-risk": "Accept the risk", defer: "Revisit later" }[blocker.decision_path] || "Not recorded";
}
export function executionReadableTime(value: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
export function executionPackageNextAction({ status, closeoutPending, hasCloseout, actions, groups }: {
  status: string; closeoutPending: boolean; hasCloseout: boolean; actions: DeliveryAvailableAction[];
  groups: ReturnType<typeof executionPackageWorkGroups>;
}) {
  const find = (type: string) => actions.find(action => action.action_type === type && action.enabled);
  if (["done", "retired"].includes(status)) return { kind: "evidence" as const, title: status === "retired" ? "Review the retired record" : "Review the completed record", detail: "Inspect the recorded outcome, work structure and supporting evidence." };
  if (status === "parked") return { kind: "action" as const, action: find("resume"), title: "Review whether work can resume", detail: "Review the return status and reason before resuming this deferred package." };
  if (status === "blocked") return { kind: "action" as const, action: find("clear-blocker"), title: "Review the blocking condition", detail: "Review what is preventing progress and the agreed approach. The service checks whether the blocker can be cleared." };
  if (closeoutPending && hasCloseout) return { kind: "closeout" as const, title: "Review package closeout", detail: "Review completion evidence and any downstream impact before submitting closeout." };
  if (groups.find(group => group.status === "in-progress")?.count) return { kind: "work" as const, filter: "in-progress" as const, title: "Continue work in progress", detail: "Open an in-progress item to read its current session and next action." };
  if (groups.find(group => group.status === "ready")?.count) return { kind: "work" as const, filter: "ready" as const, title: "Review work marked ready", detail: "Open an item to check its current prerequisites. Ready status alone does not grant permission to run it." };
  return { kind: "work" as const, filter: "all" as const, title: "Choose a work item", detail: "Open a work item to read its current prerequisites, session and next action." };
}
