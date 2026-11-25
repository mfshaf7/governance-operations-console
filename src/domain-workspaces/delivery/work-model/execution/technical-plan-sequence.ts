import type { ContextBoardSequence as TechnicalPlanSequence, ContextBoardSequenceNode as TechnicalPlanSequenceNode, ContextBoardSequenceEdge as TechnicalPlanSequenceEdge } from "../../product-adapters/context-board/sequence-model.ts";
import { technicalPlanChangeGroupName } from "./technical-plan-model.ts";
export { contextBoardSequenceLayout as technicalPlanSequenceLayout, contextBoardSequenceSvg as technicalPlanSequenceSvg } from "../../product-adapters/context-board/sequence-model.ts";
export type { ContextBoardSequence as TechnicalPlanSequence } from "../../product-adapters/context-board/sequence-model.ts";
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const array = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.map(object) : [];
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((value): value is string => typeof value === "string") : [];
function readablePlanName(id: string) {
  const label = id.replace(/^[^:]+:/, "").replace(/^\d+[-:]/, "").replaceAll(/[_:-]+/g, " ").trim();
  return label ? label[0].toUpperCase() + label.slice(1) : id;
}
function workTitle(title: string) {
  return { title, reference: /^([^#]+ #\d+) - /.exec(title)?.[1] };
}
function approvalTitle(id: string, authority: unknown, titles: Record<string, string>) {
  const work = typeof authority === "string" ? titles[authority] : undefined;
  const reference = work ? workTitle(work).reference : undefined;
  const name = readablePlanName(id);
  return { title: reference ? `${reference} - ${name}` : name, reference };
}
export function technicalPlanSequenceApprovalTitles(architecture: unknown, titles: Record<string, string>) {
  return Object.fromEntries(array(object(architecture).required_human_gates).flatMap(row =>
    typeof row.gate_id === "string" && row.gate_id
      ? [[row.gate_id, approvalTitle(row.gate_id, row.authority_work_item_id, titles).title]]
      : []));
}
function repositoryDetail(repository: unknown) {
  return `Repository: ${typeof repository === "string" && repository.trim() ? repository : "Not recorded"}`;
}
/** A rendering of recorded draft/approved facts, not another execution engine. */
export function technicalPlanSequence(architecture: unknown, mode: "changes" | "work", titles: Record<string,string> = {}): TechnicalPlanSequence {
  const data = object(architecture), nodes: TechnicalPlanSequenceNode[] = [], edges: TechnicalPlanSequenceEdge[] = [], issues: string[] = [];
  if (mode === "changes") {
    for (const row of array(data.landing_units)) {
      if (typeof row.id !== "string" || !row.id) { issues.push("A change group has no identifier."); continue; }
      nodes.push({ id: row.id, ...workTitle(technicalPlanChangeGroupName({ id: row.id, covered_work_item_ids: row.covered_work_item_ids }, titles)),
        kind: "change", detail: repositoryDetail(row.owner_repo), facts: row });
    }
    for (const row of array(object(data.source_landing_graph).edges)) edges.push({ from: String(row.prerequisite_landing_unit_id ?? ""), to: String(row.dependent_landing_unit_id ?? ""), label: "land before" });
    for (const row of array(data.required_human_gates)) {
      if (typeof row.gate_id !== "string" || !row.gate_id) { issues.push("An approval has no identifier."); continue; }
      const id = `approval:${row.gate_id}`;
      nodes.push({ id, ...approvalTitle(row.gate_id, row.authority_work_item_id, titles),
        kind: "approval", detail: repositoryDetail(row.authority_owner_repo), facts: row });
      for (const target of strings(row.affected_landing_unit_ids)) edges.push({ from: id, to: target, label: String(row.blocked_transition ?? "approval required").replaceAll("_", " ") });
    }
    for (const id of strings(object(data.source_landing_graph).nodes)) if (!nodes.some(node => node.id === id)) issues.push(`Landing order references an undefined change: ${id}.`);
  } else {
    const repositories = new Map(array(data.descendant_owner_map).map(row => [row.work_item_id, row.owner_repo]));
    for (const row of array(data.work_item_execution_plan)) {
      if (typeof row.work_item_id !== "string" || !row.work_item_id) { issues.push("A work dependency row has no work item."); continue; }
      const id = row.work_item_id;
      nodes.push({ id, ...workTitle(titles[id] ?? id.replace(/^work-item-(\d+)$/, "Work item #$1")),
        kind: "work", detail: repositoryDetail(repositories.get(id)), facts: row });
      for (const key of ["start_after_work_item_ids", "close_after_work_item_ids"] as const) {
        for (const from of strings(row[key])) edges.push({ from, to: id, label: key === "start_after_work_item_ids" ? "complete before start" : "complete before closeout" });
      }
    }
  }
  const ids = new Set<string>();
  for (const node of nodes) { if (ids.has(node.id)) issues.push(`Duplicate identifier: ${node.id}.`); ids.add(node.id); }
  for (const edge of edges) if (!ids.has(edge.from) || !ids.has(edge.to)) issues.push(`A dependency references work outside this view: ${edge.from} → ${edge.to}.`);
  if (nodes.length > 200 || edges.length > 1000) throw Error("This plan is too large for this sequence view. Narrow the plan scope; no nodes were silently removed.");
  return { nodes, edges, issues };
}
