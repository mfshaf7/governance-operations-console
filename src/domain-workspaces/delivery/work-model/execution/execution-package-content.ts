import type { DeliveryActiveBlockerProjection, DeliveryAvailableAction, DeliveryPackageSummary } from "../../domain/delivery-package.ts";
import { deliveryWorkItemStatus, type DeliveryArtNode } from "../../domain/delivery-execution.ts";
import type { TechnicalPlanRequirement } from "./technical-plan-requirement.ts";

export type ExecutionWorkFilter = "all" | "in-progress" | "blocked" | "ready";
export const executionWorkLabels = { "in-progress": "In progress", blocked: "Blocked or waiting", ready: "Marked ready" } as const;
const leafTypes = new Set(["User story", "Defect", "Task"]);
const flatten = (items: DeliveryArtNode[]): DeliveryArtNode[] => items.flatMap(item => [item, ...flatten(item.children)]);
const matches = (item: DeliveryArtNode, status: ExecutionWorkFilter) => deliveryWorkItemStatus(item) === status;
export function executionWorkChoices(nodes: DeliveryArtNode[], status: ExecutionWorkFilter) {
  return flatten(nodes).filter(item => item.legacy_work_package_id !== null &&
    (status === "all" || (status === "blocked" || leafTypes.has(item.component_type)) && matches(item, status)));
}
export function executionPackageWorkGroups(tree: DeliveryArtNode | null) {
  return (["in-progress", "blocked", "ready"] as const).map(status => {
    const items = tree ? flatten(tree.children).filter(item => (status === "blocked" || leafTypes.has(item.component_type)) && matches(item, status)) : [];
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
export function executionPackageNextAction({ status, blockingScope, closeoutPending, hasCloseout, actions, groups, hasPackageBlocker, readOnly, planningPending, technicalPlan }: {
  status: string; blockingScope?: NonNullable<DeliveryPackageSummary["execution_navigation"]>["blocking_scope"];
  closeoutPending: boolean; hasCloseout: boolean; actions: DeliveryAvailableAction[];
  groups: ReturnType<typeof executionPackageWorkGroups>;
  hasPackageBlocker?: boolean;
  readOnly?: boolean;
  planningPending?: boolean;
  technicalPlan?: TechnicalPlanRequirement;
}) {
  const find = (type: DeliveryAvailableAction["action_type"]) => actions.find(action =>
    action.action_type === type && action.enabled && action.scope !== "execution_target");
  if (["done", "retired"].includes(status)) return { kind: "evidence" as const, title: status === "retired" ? "Review the retired record" : "Review the completed record", detail: "Inspect the recorded outcome, work structure and supporting evidence." };
  if (readOnly) return { kind: "evidence" as const, title: "Inspect the recorded work", detail: "Open the Work Board to view the package’s items and their recorded status." };
  if (status === "parked") {
    const action = find("resume");
    return { kind: "action" as const, action, title: "Review whether work can resume", detail: action
      ? "Choose Resume Work under Manage Package to review the return status and reason."
      : "Review the recorded work while the package is deferred." };
  }
  if (status === "blocked" || hasPackageBlocker) {
    const action = find("clear-blocker");
    if (!hasPackageBlocker && !action && groups.find(group => group.status === "blocked")?.count) {
      return { kind: "work" as const, filter: "blocked" as const, title: "Inspect blocked work", detail: "Open the Work Board and select a blocked item to see its blocker or dependencies." };
    }
    return { kind: "action" as const, action, title: "Review what’s blocking progress", detail: "Check the blocker details below before deciding how this package can continue." };
  }
  if (blockingScope === "all-work" || blockingScope === "package") {
    return { kind: "work" as const, filter: "blocked" as const, title: "Review waiting work", detail: "Review the affected items below and open the recorded hold or prerequisite." };
  }
  if (closeoutPending && hasCloseout) return { kind: "closeout" as const, title: "Review package closeout", detail: "Choose Review Closeout under Manage Package to check completion evidence and downstream impact." };
  if (technicalPlan?.workItemId && ["required", "binding", "review"].includes(technicalPlan.status)) {
    return { kind: "technical-plan" as const, title: technicalPlan.actionLabel, detail: technicalPlan.detail };
  }
  if (groups.find(group => group.status === "in-progress")?.count) return { kind: "work" as const, filter: "in-progress" as const, title: "Continue work in progress", detail: "Open the Work Board and select an in-progress item to see its current session or check its requirements." };
  if (planningPending) return { kind: "planning" as const, title: "Schedule prepared work", detail: "Open PI Planning from Work Overview to review the calendar, objective, and iteration assignments." };
  if (groups.find(group => group.status === "ready")?.count) return { kind: "work" as const, filter: "ready" as const, title: "Review work marked ready", detail: "Open the Work Board and select a ready item to check its work requirements." };
  if (blockingScope === undefined && groups.find(group => group.status === "blocked")?.count) return { kind: "work" as const, filter: "blocked" as const, title: "Inspect blocked work", detail: "Open the Work Board and select a blocked item to see its blocker or dependencies." };
  return { kind: "work" as const, filter: "all" as const, title: "Choose a work item", detail: "Open the Work Board, select an item, and check its work requirements." };
}
