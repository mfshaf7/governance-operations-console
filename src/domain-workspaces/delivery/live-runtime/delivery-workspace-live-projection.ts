import type { DeliveryReadModel } from "../read-model/delivery-read-model.ts";
import type { DeliveryArtNode } from "../domain/delivery-execution.ts";
import type { DeliveryPackageSummary, DeliveryActiveBlockerProjection } from "../domain/delivery-package.ts";
import type { DeliveryBackendStatus, DeliveryComponentType, DeliveryPackagePosture, DeliveryTone, DeliveryWorkflowPhase } from "../domain/delivery-common.ts";

const postures: Record<DeliveryBackendStatus, DeliveryPackagePosture> = { new: "New", ready: "Ready", "in-progress": "In Progress", blocked: "Blocked", done: "Done", parked: "Deferred", retired: "Retired" };
const componentTypes = new Set(["Epic", "Feature", "User story", "Defect", "Task", "PI Objective", "Milestone", "Risk"]);

// These are routing/display projections, never work-start or completion authority.
// No fixture, browser-local mutation, receipt, custody or eligibility is inferred.
export function projectCanonicalDeliveryWorkspace(value: unknown, sourceRevision: string, observedAt: string): DeliveryReadModel {
  const source = record(value);
  if (source.workflow_id !== "delivery-initiatives" || record(source.project).identifier !== "workspace-delivery-art") invalid();
  const initiatives = array(source.initiatives);
  if (initiatives.length > 512) invalid();
  let nodeCount = 0;
  const seen = new Set<number>();
  function node(value: unknown, depth = 0): DeliveryArtNode {
    if (++nodeCount > 8192 || depth > 32) invalid();
    const item = record(value); const id = integer(item.id);
    if (seen.has(id) || !componentTypes.has(String(item.type))) invalid();
    seen.add(id);
    const backendStatus = status(item.status);
    return {
      id: `work-item-${id}`, legacy_work_package_id: id,
      backend_status: backendStatus, component_type: item.type as DeliveryComponentType,
      title: text(item.subject), description: typeof item.description === "string" ? item.description : "",
      owner_repo: nullableText(item.owner_repo),
      planning: {
        targetPI: nullableText(item.target_pi),
        iteration: nullableText(item.iteration),
        objectiveType: item.pi_objective_type === "Committed" || item.pi_objective_type === "Stretch" ? item.pi_objective_type : "",
        plannedBusinessValue: typeof item.planned_business_value === "number" && Number.isFinite(item.planned_business_value)
          ? String(item.planned_business_value)
          : nullableText(item.planned_business_value) ?? "",
      },
      blocker: blocker(item.blocker),
      dependency_blocked: item.dependency_blocked === true,
      depends_on_work_package_ids: Array.isArray(item.depends_on_work_package_ids) ? item.depends_on_work_package_ids.map(value => integer(value)) : [],
      metadata_status: item.ready_contract_applicable === false ? "not_applicable" : item.ready_contract_satisfied === true ? "complete" : "missing",
      tone: tone(backendStatus), children: array(item.children).map((child) => node(child, depth + 1)),
    };
  }
  const roots: DeliveryArtNode[] = [];
  const selected: DeliveryReadModel["selected_packages"] = [];
  const packages: DeliveryReadModel["packages"] = initiatives.map((entry) => {
    const item = record(entry), epic = record(item.epic), summary = record(item.summary);
    const id = integer(epic.id), backendStatus = status(epic.status);
    if (epic.type !== "Epic" || epic.record_ref !== `openproject://work_packages/${id}`) invalid();
    const root = node(item.execution_tree);
    if (root.legacy_work_package_id !== id) invalid();
    roots.push(root);
    const packageId = `delivery-${id}`;
    const navigation = executionNavigation(item.execution_navigation, root);
    const workSessions = sessions(item.work_sessions, root);
    selected.push({ delivery_package_id: packageId, owner_repo: typeof epic.owner_repo === "string" ? epic.owner_repo : "Unassigned", source_revision: sourceRevision,
      active_execution_target_id: navigation?.active_work_item_ids.length === 1 ? `work-item-${navigation.active_work_item_ids[0]}` : null,
      next_execution_target_id: navigation?.prepared_work_item_ids.length === 1 ? `work-item-${navigation.prepared_work_item_ids[0]}` : null, milestones: [],
      lineage_refs: { architecture_anchor_ref: nullableText(epic.architecture_anchor_ref), required_upstream_ref: nullableText(epic.required_upstream_ref) },
      advisor_summary: "Read the exact OOS work-session projection before starting source work; initiative inventory does not grant execution eligibility.",
    });
    return {
      delivery_package_id: packageId, legacy_epic_id: id, display_name: text(epic.subject),
      initiative_family: nullableText(epic.initiative_family),
      backend_status: backendStatus, package_posture: navigation?.package_posture ?? postures[backendStatus],
      execution_navigation: navigation, active_blocker: root.blocker, work_sessions: workSessions,
      open_child_count: integer(summary.open_descendant_count, true), source_custody: null,
      source_ref: String(epic.record_ref), target_pi: nullableText(epic.target_pi),
      summary: `Canonical ART ${backendStatus}; ${integer(summary.open_descendant_count, true)} open descendants. Repository custody and work eligibility are resolved by their owner workflows.`,
      tone: tone(backendStatus), tree_root_id: root.id, workflow_phase: navigation?.workflow_phase ?? workflowPhase(root),
      available_actions: [],
    };
  });
  const counts: Record<DeliveryPackagePosture, number> = { New: 0, Blocked: 0, "Closeout Pending": 0, Deferred: 0, Done: 0, "In Progress": 0, Ready: 0, Retired: 0 };
  for (const entry of packages) counts[entry.package_posture] += 1;
  return {
    schema_version: 1, generated_at: observedAt, source_truth: "OpenProject-backed OOS",
    projection_state: { checked_at: observedAt, detail: "Canonical ART inventory. Per-workflow reads retain eligibility, metadata, Catalog and mutation authority.", source_revision: sourceRevision, status: "fresh" },
    packages, selected_packages: selected, selected_delivery_package_id: packages[0]?.delivery_package_id ?? "",
    art_tree: { roots }, family_map: { groups: [] }, intake_sources: [], apply_intents: [], audit_events: [],
    board_summary: { total_packages: packages.length, by_posture: counts, blocked_count: counts.Blocked, closeout_pending_count: counts["Closeout Pending"], stale_count: 0 },
    catalog: { generated_at: observedAt, groups: [], items: [], values: [], projection_status: "backend_unavailable", summary: { drift_count: 0, missing_route_count: 0, owner_routed_count: 0, requestable_count: 0, total_items: 0 } },
  };
}

function workflowPhase(root: DeliveryArtNode): DeliveryWorkflowPhase {
  if (["done", "retired"].includes(root.backend_status)) return "audit_only";
  const descendants = (node: DeliveryArtNode): DeliveryArtNode[] => node.children.flatMap((child) => [child, ...descendants(child)]);
  const executable = descendants(root).filter((item) => ["User story", "Defect", "Task"].includes(item.component_type) && !["done", "retired"].includes(item.backend_status));
  // Older OOS versions do not return navigation yet. Retain active packages
  // here rather than losing their remaining closeout work during rollout.
  if (["in-progress", "blocked", "parked"].includes(root.backend_status)) return "execution";
  if (!executable.length) return descendants(root).some(item => ["User story", "Defect", "Task"].includes(item.component_type)) ? "execution" : "work_design";
  return executable.some((item) => item.backend_status === "in-progress" || item.backend_status === "blocked" || item.backend_status === "ready" && item.metadata_status === "complete") ? "execution" : "refinement";
}
function blocker(value: unknown): DeliveryActiveBlockerProjection | undefined {
  if (value === undefined || value === null) return undefined;
  const item = record(value);
  const result = Object.fromEntries(["statement", "impact", "owner", "discovered_on", "decision_path", "justification", "follow_up_owner", "review_date"].map(key => {
    if (item[key] !== null && item[key] !== undefined && typeof item[key] !== "string") invalid();
    return [key, item[key] ?? ""];
  }));
  if (result.decision_path && !["remove", "workaround", "accept-risk", "defer"].includes(String(result.decision_path))) invalid();
  return result as DeliveryActiveBlockerProjection;
}
function sessions(value: unknown, root: DeliveryArtNode): DeliveryPackageSummary["work_sessions"] {
  if (value === undefined || value === null) return null;
  const nodes = (node: DeliveryArtNode): DeliveryArtNode[] => [node, ...node.children.flatMap(nodes)];
  const refs = new Set(nodes(root).map(node => `work-item-${node.legacy_work_package_id}`));
  const values = array(value); if (values.length > 8192) invalid();
  return values.map(value => {
    const item = record(value);
    if (!/^work-session:delivery-[1-9][0-9]*:[a-z0-9][a-z0-9._:-]*$/.test(String(item.session_id)) ||
      item.state !== "recorded" || typeof item.updated_at !== "string" || !Number.isFinite(Date.parse(item.updated_at))) invalid();
    const ids = array(item.work_item_ids);
    if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !refs.has(String(id)))) invalid();
    return item as NonNullable<DeliveryPackageSummary["work_sessions"]>[number];
  });
}
function executionNavigation(value: unknown, root: DeliveryArtNode): DeliveryPackageSummary["execution_navigation"] {
  if (value === undefined) return undefined;
  const item = record(value);
  const nodes = (node: DeliveryArtNode): DeliveryArtNode[] => [node, ...node.children.flatMap(nodes)];
  const ids = new Set(nodes(root).map(node => node.legacy_work_package_id));
  if (item.authority !== "operator-orchestration-service" || item.eligibility !== "check-selected-work-item" || item.native_status !== root.backend_status ||
    !["execution", "refinement", "work_design", "audit_only"].includes(String(item.workflow_phase)) ||
    ![...Object.values(postures), "Closeout Pending"].includes(item.package_posture as DeliveryPackagePosture) || typeof item.closeout_pending !== "boolean") invalid();
  for (const key of ["active_work_item_ids", "prepared_work_item_ids", "blocked_work_item_ids", "refinement_work_item_ids",
    ...(item.planning_prepared_work_item_ids === undefined ? [] : ["planning_prepared_work_item_ids"])]) {
    const refs = array(item[key]);
    if (new Set(refs).size !== refs.length || refs.some(id => !Number.isSafeInteger(id) || !ids.has(Number(id)) || id === root.legacy_work_package_id)) invalid();
  }
  return item as NonNullable<DeliveryPackageSummary["execution_navigation"]>;
}
function tone(value: DeliveryBackendStatus): DeliveryTone { return value === "blocked" ? "danger" : value === "done" ? "ok" : ["retired", "parked"].includes(value) ? "muted" : "info"; }
function invalid(): never { throw new Error("Canonical Delivery inventory is missing or inconsistent."); }
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) invalid(); return value as Record<string, unknown>; }
function array(value: unknown): unknown[] { if (!Array.isArray(value)) invalid(); return value; }
function text(value: unknown): string { if (typeof value !== "string" || !value.trim()) invalid(); return value; }
function nullableText(value: unknown): string | null { return typeof value === "string" && value.trim() ? value : null; }
function integer(value: unknown, zero = false): number { if (!Number.isSafeInteger(value) || Number(value) < (zero ? 0 : 1)) invalid(); return Number(value); }
function status(value: unknown): DeliveryBackendStatus { const result = text(value); if (!Object.hasOwn(postures, result)) invalid(); return result as DeliveryBackendStatus; }
