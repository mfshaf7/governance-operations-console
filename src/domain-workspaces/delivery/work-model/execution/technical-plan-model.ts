import type { DeliveryReadModel } from "../../read-model/delivery-read-model.ts";
import type { DeliveryArtNode } from "../../domain/delivery-execution.ts";
export type TechnicalPlanDraft = {
  architectureJson: string; conformanceJson: string; coveredWorkItemIds: string[];
  deliveryId: string; rationale: string; repoRevisionsJson: string;
};
type ArchitecturePacketEditor = TechnicalPlanDraft;
import { architectureFormContract, planFieldLabel, type PlanSchema } from "./architecture-form-model.ts";

export const technicalPlanSections = [
  ["architecture:descendant_owner_map", "Work responsibilities", "Selecting covered work fills its recorded type, parent relationships and implementation repository where available. Review those observations before approval."],
  ["architecture:landing_units", "Changes that land together", "Group changes that share review, deployment and rollback. A group can cover several work items; separate it only for a real delivery boundary."],
  ["architecture:source_landing_graph", "Repository landing order", "Which change groups must land before another? Leave the edge list empty when there is no dependency."],
  ["architecture:work_item_execution_plan", "Work dependencies", "Record prerequisites for starting and completing each work item, including any approvals it produces."],
  ["architecture:lifecycle_state_model", "States and recovery", "Explain meaningful states, transitions, failure and resumption for the system being built."],
  ["architecture:authorization_session_execution_model", "Access and execution", "Explain who can act, how a session is authorized, and the boundary between a suggestion and an accepted action."],
  ["architecture:evidence_receipt_handoffs", "Evidence handoffs", "Describe evidence passed between changes. An empty list means there are no such handoffs in this scope."],
  ["architecture:runtime_boundaries", "Runtime responsibilities", "Identify runtime responsibilities and prohibited actions relevant to this design. Do not invent a deployed service."],
  ["architecture:required_human_gates", "Required approvals", "Name the real approval and the transition it blocks. The advisor can draft this description; it cannot grant approval."],
  ["architecture:runtime_activation_chains", "Activation order", "For an affected runtime, record source activation before dependent commissioning. Do not add runtime work for a project that has none."],
  ["architecture:rollback_cleanup_terminal_conditions", "Rollback and completion", "Explain how to recover, clean up and recognize completion. This is a plan, not proof that recovery has run."],
  ["architecture:contradictions_open_decisions", "Open decisions", "Record unresolved contradictions and decisions. An approved plan must satisfy the applicable rules for unresolved matters."],
  ["conformance_plan:protocol_applicability", "Verification applicability", "Decide which protocol checks apply and explain why. This choice is not made automatically."],
  ["conformance_plan:dimensions", "What must be verified", "Describe the behaviours and boundaries that need evidence."],
  ["conformance_plan:work_item_dimension_applicability", "Checks for each work item", "Connect applicable verification dimensions to the work that must prove them."],
  ["conformance_plan:git_causality", "Source dependencies", "Explain source ordering and compatibility where relevant; keep applicability and actual evidence separate."],
  ["conformance_plan:cases", "Verification cases", "Describe positive and negative checks, expected outcomes and required evidence. Do not claim tests already passed."],
  ["repo_revisions", "Source revisions", "Use verified repository revisions. These identify source observations; they are not an architecture decision."],
] as const;
export type TechnicalPlanSection = typeof technicalPlanSections[number][0];
export const technicalPlanDefaultSection: TechnicalPlanSection = "architecture:descendant_owner_map";
export function technicalPlanSection(section: string) {
  const found = technicalPlanSections.find(item => item[0] === section);
  if (!found) throw Error("Choose an available technical plan section.");
  return found;
}
export function technicalPlanSectionBinding(section: string) {
  technicalPlanSection(section);
  const [group, key] = section.split(":") as ["architecture" | "conformance_plan" | "repo_revisions", string?];
  const field = group === "architecture" ? "architectureJson" : group === "conformance_plan" ? "conformanceJson" : "repoRevisionsJson";
  const schema = key ? architectureFormContract.properties[group].properties?.[key] ?? {} : architectureFormContract.properties[group];
  return { group, key, field, schema } as const;
}
export function technicalPlanSectionValue(editor: ArchitecturePacketEditor, section: string) {
  const { field, key } = technicalPlanSectionBinding(section), value = JSON.parse(editor[field]);
  return key ? value[key] : value;
}
export function technicalPlanSetSection(editor: ArchitecturePacketEditor, section: string, value: unknown) {
  const { field, key } = technicalPlanSectionBinding(section), current = JSON.parse(editor[field]);
  return { ...editor, [field]: JSON.stringify(key ? { ...current, [key]: value } : value, null, 2) };
}
export function technicalPlanWorkItems(model: DeliveryReadModel, deliveryId: string): DeliveryArtNode[] {
  const item = model.packages.find(item => item.delivery_package_id === deliveryId || `delivery-${item.legacy_epic_id}` === deliveryId);
  const flatten = (node: DeliveryArtNode): DeliveryArtNode[] => [node, ...node.children.flatMap(flatten)];
  return model.art_tree.roots.filter(node => node.id === item?.tree_root_id).flatMap(flatten);
}
/** Observed facts only. Preserve existing operator decisions and other rows. */
export function technicalPlanFillRecordedFacts(editor: ArchitecturePacketEditor, model: DeliveryReadModel) {
  const nodes = technicalPlanWorkItems(model, editor.deliveryId);
  let architecture: Record<string, unknown>;
  try { const value = JSON.parse(editor.architectureJson); if (!value || typeof value !== "object" || Array.isArray(value)) return editor; architecture = value; }
  catch { return editor; } // Preserve malformed manual input for explicit repair.
  const existing = Array.isArray(architecture.descendant_owner_map) ? architecture.descendant_owner_map : [];
  const parents = new Map(nodes.flatMap(parent => parent.children.map(child => [child.id, parent] as const)));
  const rows = [...existing];
  for (const node of nodes.filter(node => editor.coveredWorkItemIds.includes(`work-item-${node.legacy_work_package_id}`))) {
    const ref = `work-item-${node.legacy_work_package_id}`, parent = parents.get(node.id);
    const facts = { work_item_id: ref, work_item_type: node.component_type,
      parent_work_item_id: parent ? `work-item-${parent.legacy_work_package_id}` : null,
      owner_repo: node.owner_repo ?? (()=>{ const repo=model.selected_packages.find(item=>item.delivery_package_id===(model.packages.find(item=>item.delivery_package_id===editor.deliveryId||`delivery-${item.legacy_epic_id}`===editor.deliveryId)?.delivery_package_id))?.owner_repo; return repo&&/^[a-z0-9][a-z0-9-]*$/.test(repo)?repo:""; })() };
    const index = rows.findIndex(row => row.work_item_id === ref);
    if (index < 0) rows.push(facts);
    else rows[index] = { ...facts, ...rows[index] };
  }
  return { ...editor, architectureJson: JSON.stringify({ ...architecture, descendant_owner_map: rows }, null, 2) };
}
/** Send only the selected section's actual contract and referenced definitions. */
export function technicalPlanSectionContract(section: string) {
  const { schema } = technicalPlanSectionBinding(section), definitions: Record<string, PlanSchema> = {};
  function visit(value: unknown) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    const node = value as Record<string, unknown>;
    if (typeof node.$ref === "string") {
      const key = node.$ref.split("/").at(-1)!;
      if (!Object.hasOwn(definitions, key) && architectureFormContract.$defs[key]) { definitions[key] = architectureFormContract.$defs[key]; visit(definitions[key]); }
    }
    Object.values(node).forEach(visit);
  }
  visit(schema);
  return { version: architectureFormContract.authoringVersion, section, schema, definitions };
}
export function technicalPlanAdvisorEdit(editor: ArchitecturePacketEditor, section: string, edits: Array<{ field: string; value: unknown }>) {
  if (section === "repo_revisions") throw Error("The advisor cannot author source revision evidence. Read verified source observations instead.");
  let next = editor;
  for (const edit of edits) {
    if (edit.field !== "sectionJson" || typeof edit.value !== "string") throw Error("The advisor can edit only the selected local plan section.");
    const value = JSON.parse(edit.value), { schema } = technicalPlanSectionBinding(section);
    if (schema.type === "array" ? !Array.isArray(value) : schema.type === "object" ? !value || typeof value !== "object" || Array.isArray(value) : false) throw Error("The proposed section has the wrong data shape. No draft was changed.");
    const inspect = (input: unknown) => {
      if (!input || typeof input !== "object") return;
      if (Object.keys(input).some(key => ["__proto__", "prototype", "constructor"].includes(key))) throw Error("Unsafe draft data was rejected.");
      Object.values(input).forEach(inspect);
    };
    inspect(value); next = technicalPlanSetSection(next, section, value);
  }
  return next;
}
export function technicalPlanDisplayLabel(key: string) {
  return ({ start_after_work_item_ids: "Start after", close_after_work_item_ids: "Complete after", emits_human_gate_ids: "Approvals produced",
    prerequisite_landing_unit_id: "Prerequisite change", dependent_landing_unit_id: "Dependent change",
    authority_work_item_id: "Approval work item", authority_owner_repo: "Approval repository", affected_landing_unit_ids: "Affected changes",
    blocked_transition: "Approval required before", evidence_requirement: "Evidence to review", source_backed: "Changes files", covered_work_item_ids: "Covered work" } as Record<string,string>)[key] ?? planFieldLabel(key);
}
