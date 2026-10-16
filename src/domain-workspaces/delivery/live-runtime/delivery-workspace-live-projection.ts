import type { DeliveryReadModel } from "../read-model/delivery-read-model.ts";
import type { DeliveryArtNode } from "../domain/delivery-execution.ts";
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
    selected.push({ delivery_package_id: packageId, owner_repo: typeof epic.owner_repo === "string" ? epic.owner_repo : "Unassigned", source_revision: sourceRevision,
      active_execution_target_id: null, next_execution_target_id: null, milestones: [],
      lineage_refs: { architecture_anchor_ref: nullableText(epic.architecture_anchor_ref), required_upstream_ref: nullableText(epic.required_upstream_ref) },
      advisor_summary: "Read the exact OOS work-session projection before starting source work; initiative inventory does not grant execution eligibility.",
    });
    return {
      delivery_package_id: packageId, legacy_epic_id: id, display_name: text(epic.subject),
      backend_status: backendStatus, package_posture: postures[backendStatus],
      open_child_count: integer(summary.open_descendant_count, true), source_custody: null,
      source_ref: String(epic.record_ref), target_pi: nullableText(epic.target_pi),
      summary: `Canonical ART ${backendStatus}; ${integer(summary.open_descendant_count, true)} open descendants. Repository custody and work eligibility are resolved by their owner workflows.`,
      tone: tone(backendStatus), tree_root_id: root.id, workflow_phase: workflowPhase(root),
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
    board_summary: { total_packages: packages.length, by_posture: counts, blocked_count: counts.Blocked, closeout_pending_count: 0, stale_count: 0 },
    catalog: { generated_at: observedAt, groups: [], items: [], values: [], projection_status: "backend_unavailable", summary: { drift_count: 0, missing_route_count: 0, owner_routed_count: 0, requestable_count: 0, total_items: 0 } },
  };
}

function workflowPhase(root: DeliveryArtNode): DeliveryWorkflowPhase {
  if (["done", "retired"].includes(root.backend_status)) return "audit_only";
  const descendants = (node: DeliveryArtNode): DeliveryArtNode[] => node.children.flatMap((child) => [child, ...descendants(child)]);
  const executable = descendants(root).filter((item) => ["User story", "Defect", "Task"].includes(item.component_type) && !["done", "retired"].includes(item.backend_status));
  if (!executable.length) return "work_design";
  return executable.some((item) => item.backend_status === "in-progress" || item.backend_status === "blocked" || item.backend_status === "ready" && item.metadata_status === "complete") ? "execution" : "refinement";
}
function tone(value: DeliveryBackendStatus): DeliveryTone { return value === "blocked" ? "danger" : value === "done" ? "ok" : ["retired", "parked"].includes(value) ? "muted" : "info"; }
function invalid(): never { throw new Error("Canonical Delivery inventory is missing or inconsistent."); }
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) invalid(); return value as Record<string, unknown>; }
function array(value: unknown): unknown[] { if (!Array.isArray(value)) invalid(); return value; }
function text(value: unknown): string { if (typeof value !== "string" || !value.trim()) invalid(); return value; }
function nullableText(value: unknown): string | null { return typeof value === "string" && value.trim() ? value : null; }
function integer(value: unknown, zero = false): number { if (!Number.isSafeInteger(value) || Number(value) < (zero ? 0 : 1)) invalid(); return Number(value); }
function status(value: unknown): DeliveryBackendStatus { const result = text(value); if (!Object.hasOwn(postures, result)) invalid(); return result as DeliveryBackendStatus; }
