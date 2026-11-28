import { documentSummary } from "../../../../../../teras/teras-document-content.ts";
import type { DeliveryRefinementDraftField, DeliveryRefinementFieldStatus, DeliveryRefinementTreeNode } from "../../../../read-model/index.ts";
type RefinementReviewTarget = { field: DeliveryRefinementDraftField; key: string; node: DeliveryRefinementTreeNode; status: DeliveryRefinementFieldStatus; sourceValue: string };
import type { RefinementMetadataFieldResolutionMap } from "../model/refinement-model.ts";

export function refinementItemLabel(node: DeliveryRefinementTreeNode) {
  return `${node.kind}${/^\d+$/.test(node.id) ? ` #${node.id}` : ""}`;
}

export function refinementItemSummary(description: string) {
  return documentSummary(description);
}

export function refinementFieldReviewLabel(target: RefinementReviewTarget, resolutions: RefinementMetadataFieldResolutionMap, drafts: Record<string, string> = {}) {
  if (target.status === "blocked") return "Blocked";
  const value = drafts[target.key] ?? target.sourceValue;
  const edited = value.trim() !== target.sourceValue.trim();
  if (edited && refinementValueError(target.field, value)) return "Check value";
  if (resolutions[target.key] === "ai_drafted") return "AI draft · review needed";
  if (resolutions[target.key]) return "Reviewed draft";
  if (edited) return "Edited · review needed";
  if (target.status === "complete") return target.sourceValue.trim() ? "Current value" : target.field.required ? "No action required" : "Optional · not set";
  return target.status === "missing" ? "Value needed" : "Review needed";
}

export function refinementTargetNeedsReview(target: RefinementReviewTarget, resolutions: RefinementMetadataFieldResolutionMap, drafts: Record<string, string> = {}) {
  const value = drafts[target.key] ?? target.sourceValue;
  const edited = value.trim() !== target.sourceValue.trim();
  if (target.status === "blocked") return true;
  if ((target.status !== "complete" || edited) && refinementValueError(target.field, value)) return true;
  return (!resolutions[target.key] || resolutions[target.key] === "ai_drafted") && (target.status !== "complete" || edited);
}

export function refinementVisibleTreeIds(tree: DeliveryRefinementTreeNode, targets: RefinementReviewTarget[], resolutions: RefinementMetadataFieldResolutionMap, query: string, needsReview: boolean, drafts: Record<string, string> = {}) {
  const result: string[] = [], search = query.trim().toLocaleLowerCase();
  function visit(node: DeliveryRefinementTreeNode): boolean {
    const childMatches = (node.children ?? []).map(visit).some(Boolean);
    const textMatches = !search || `${node.kind} ${node.id} ${node.title} ${node.description}`.toLocaleLowerCase().includes(search);
    const reviewMatches = !needsReview || targets.some(target => target.node.id === node.id && refinementTargetNeedsReview(target, resolutions, drafts));
    if (childMatches || textMatches && reviewMatches) { result.push(node.id); return true; }
    return false;
  }
  visit(tree);
  return result;
}

export function refinementValueError(field: DeliveryRefinementDraftField, value: string): string | null {
  if (!value.trim()) return field.required ? "Enter a value before marking this required field reviewed." : null;
  const key = field.route_binding.payload_key;
  if (key === "risk_review_date" && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value)) return "Enter a real date in YYYY-MM-DD format.";
  if (["architecture_anchor_ref", "required_upstream_ref"].includes(key) && !/^openproject:\/\/work_packages\/[1-9][0-9]*$/.test(value)) return "Use an existing Delivery reference: openproject://work_packages/<item number>.";
  if (field.value_limit && value.length > field.value_limit) return `Keep this value within ${field.value_limit} characters.`;
  if (field.field_kind === "number") {
    const numericType = field.numeric_type ?? (["planned_business_value", "actual_business_value"].includes(field.backend_field) ? "integer" : "decimal");
    if (numericType === "integer" && (!/^\d+$/.test(value.trim()) || !Number.isSafeInteger(Number(value)))) return "Enter a whole number of zero or more.";
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim()) || !Number.isFinite(Number(value))) return "Enter a number of zero or more.";
  }
  if (field.field_kind === "select" && !field.allowed_values?.includes(value)) return "Choose a value offered by the connected source.";
  return null;
}

export function refinementFieldHelp(field: DeliveryRefinementDraftField) {
  const purpose: Record<string, string> = {
    target_pi: "The planning increment assigned to this work. Choose an existing PI; manage new increments through Delivery Catalog.",
    owner_repo: "The registered repository that will hold this item's work. Choose an existing entry; register and link missing repositories through their onboarding workflow.",
    assignee: "Choose an existing project member to perform this work. Manage missing membership through Catalog.",
    responsible: "Choose the existing project member accountable for this work. Manage missing membership through Catalog.",
    risk_review_date: "The agreed date for reviewing this risk. Use a real date in YYYY-MM-DD format.",
    architecture_anchor_ref: "Reference an existing architecture Epic, for example openproject://work_packages/123. Its type and relationship are checked by Delivery.",
    required_upstream_ref: "Reference existing upstream work, for example openproject://work_packages/123. Its relationship is checked by Delivery.",
    delivery_team: "Choose an existing Delivery Team. Manage missing team values through Catalog.",
  };
  return `${field.required ? "Required" : "Optional"}. ${purpose[field.route_binding.payload_key] ?? field.validation_hint}${field.field_kind === "short_text" && !field.allowed_values?.length ? " The connected source has not supplied a choice list for this field." : ""}`;
}



type PlanningRules = { backlog_iteration_label: string; iteration_prefix_templates: string[] };
export function refinementPlanningValueError(target: RefinementReviewTarget, targets: RefinementReviewTarget[], drafts: Record<string,string>, rules?: PlanningRules) {
  if (!rules || target.node.kind === "Epic" || !["target_pi", "iteration"].includes(target.field.backend_field)) return null;
  const value = (key: "target_pi" | "iteration") => { const peer = targets.find(item => item.node.id === target.node.id && item.field.backend_field === key);
    return peer ? (drafts[peer.key]?.trim() || peer.sourceValue) : target.node.planning?.[key]; };
  const pi = value("target_pi"), iteration = value("iteration");
  if (pi === undefined || iteration === undefined) return "The related planning value is unavailable. Refresh its source before reviewing a commitment.";
  if (pi && !iteration) return "Choose a compatible Iteration for this Target PI before marking the planning fields reviewed.";
  if (!pi && iteration && iteration !== rules.backlog_iteration_label) return "Select a Target PI for this Iteration, or keep the item uncommitted.";
  if (pi && iteration && !rules.iteration_prefix_templates.some(template => iteration.startsWith(template.replaceAll("<target_pi>", pi)))) return "Iteration must belong to this Target PI or an allowed Program-wide lane.";
  return null;
}

export function refinementPlanningField(target: RefinementReviewTarget, targets: RefinementReviewTarget[], drafts: Record<string,string>, rules?: PlanningRules) {
  if (!rules || target.field.backend_field !== "iteration" || target.field.field_kind !== "select") return target.field;
  const peer = targets.find(item => item.node.id === target.node.id && item.field.backend_field === "target_pi");
  const pi = peer ? (drafts[peer.key]?.trim() || peer.sourceValue) : target.node.planning?.target_pi;
  return { ...target.field, allowed_values: (target.field.allowed_values ?? []).filter(value => pi ? rules.iteration_prefix_templates.some(template => value.startsWith(template.replaceAll("<target_pi>", pi))) : value === rules.backlog_iteration_label) };
}
