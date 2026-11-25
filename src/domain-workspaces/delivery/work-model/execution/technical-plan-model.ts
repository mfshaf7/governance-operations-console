import type { DeliveryReadModel } from "../../read-model/delivery-read-model.ts";
import type { DeliveryArtNode } from "../../domain/delivery-execution.ts";
const optionalArchitectureSections = ["lifecycle_state_model", "authorization_session_execution_model"] as const;
type OptionalArchitectureSection = typeof optionalArchitectureSections[number];
export type InactiveArchitectureSections = Partial<Record<OptionalArchitectureSection, Record<string, unknown>>>;

export function isOptionalArchitectureSection(key: string | undefined): key is OptionalArchitectureSection {
  return optionalArchitectureSections.some(section => section === key);
}

export function technicalPlanHasDraftInput(value: unknown): boolean {
  if (typeof value === "string") return Boolean(value.trim());
  if (value && typeof value === "object") return Object.values(value).some(technicalPlanHasDraftInput);
  return value !== undefined && value !== null;
}

export type TechnicalPlanDraft = {
  architectureJson: string; conformanceJson: string; coveredWorkItemIds: string[];
  deliveryId: string; rationale: string; repoRevisionsJson: string;
  inactiveArchitectureSections?: InactiveArchitectureSections;
  starterBasis?: { workItemId: number; scope: string };
};
type ArchitecturePacketEditor = TechnicalPlanDraft;
import { architectureFormContract, planFieldLabel, type PlanSchema } from "./architecture-form-model.ts";

function previewRecord(text: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export function technicalPlanOverviewFacts(plan: TechnicalPlanDraft) {
  const architecture = previewRecord(plan.architectureJson);
  const verification = previewRecord(plan.conformanceJson);
  const groups = architecture.landing_units;
  const decisions = architecture.contradictions_open_decisions;
  return {
    workItems: plan.coveredWorkItemIds.filter(Boolean).length,
    sourceGroups: Array.isArray(groups) ? groups.filter(group => group?.source_backed === true).length : null,
    verificationCases: Array.isArray(verification.cases) ? verification.cases.length : null,
    openDecisions: Array.isArray(decisions) ? decisions.filter(decision => decision?.status === "open").length : null,
  };
}

export const technicalPlanSections = [
  ["architecture:descendant_owner_map", "Work responsibilities", "Review the type, parent, and repository recorded in Delivery."],
  ["architecture:landing_units", "Change groups", "Group work by repository for review, merge, and rollback."],
  ["architecture:source_landing_graph", "Change merge order", "Set which changes must merge first.", "Set the order in which repository changes merge. For example, merge an API change before the change that calls it. Use Work dependencies to plan when work can start or close."],
  ["architecture:work_item_execution_plan", "Work dependencies", "Set prerequisites for starting and closing.", "Set what must be finished before an item can start or close. For example, finish a contract before starting its implementation, and finish acceptance checks before closing it. Approvals are linked here from Required approvals."],
  ["architecture:lifecycle_state_model", "States and recovery", "Describe how the system moves between states.", "Describe how the system moves between states. For example, a failed import can return to ready after its input is corrected. Use Rollback and completion for the operator’s recovery steps."],
  ["architecture:authorization_session_execution_model", "Access and execution", "Describe session access and approval rules.", "Explain who can open a work session and who can approve an action that changes data or source. Link the existing records that authorize those actions."],
  ["architecture:evidence_receipt_handoffs", "Evidence handoffs", "Pass evidence between repositories when a change needs it.", "For example, an API change supplies a compatibility report that the Console uses before merge. Leave this empty when no such handoff is needed."],
  ["architecture:runtime_boundaries", "Runtime responsibilities", "Define what each runtime component can do.", "Record the actions each component can and cannot perform using capability IDs from its owning contract. Include the approved boundaries for plan authorship, evidence storage and reference publishing."],
  ["architecture:required_human_gates", "Required approvals", "Set approval timing and evidence.", "Choose the approval work item, when approval is needed, and what evidence to review. Its repository and Work dependencies link are filled for you. For example, a maintainer approves a compatibility report before merging. Record the actual decision in Review & record."],
  ["architecture:runtime_activation_chains", "Activation order", "Set the order of runtime activation.", "For each approval before runtime activation, show what must be enabled first and which changes verify it is working. If the plan has no such approval, record no activation steps."],
  ["architecture:rollback_cleanup_terminal_conditions", "Rollback and completion", "Plan rollback, cleanup, and completion checks.", "Describe what to reverse, what to clean up, and how to tell the work is complete. For example, restore the last working release, remove temporary build files, and confirm the homepage still loads."],
  ["architecture:contradictions_open_decisions", "Open decisions", "Track open choices and their resolutions.", "Record unresolved design choices as they arise. Resolve them before approving the plan. Keep the resolution with each resolved decision."],
  ["conformance_plan:protocol_applicability", "Verification applicability", "Approval requires verification cases.", "Every approved Technical Plan requires verification cases. Choose whether extra checks apply because this work changes how systems exchange commands, data, or results. Explain your choice below."],
  ["conformance_plan:dimensions", "What must be verified", "List the behaviors and safeguards to verify.", "List the behaviours or safeguards to check. The required protocol areas are filled when protocol checks apply. For example, Saving a page sends one request, even if the user retries. In Checks for each work item, assign that check to the work it covers."],
  ["conformance_plan:work_item_dimension_applicability", "Checks for each work item", "Assign checks to the work items they cover.", "Select a work item and the behaviours it has to prove. For example, assign Saving sends one request to the work item that adds retries, then write the scenarios in Verification cases."],
  ["conformance_plan:git_causality", "Source dependencies", "Decide whether to verify Git dependencies.", "Say whether verification needs to prove a dependency between Git changes. For example, check that the Console still builds when it uses the exact API revision listed in Source revisions. Set the actual merge order under Sequence & Handoffs."],
  ["conformance_plan:cases", "Verification cases", "Plan success and failure checks.", "Plan checks for a successful action and a rejected or failed action. For example, saving with access succeeds, and saving without access leaves the file unchanged. Record the expected result and where each check will run."],
  ["repo_revisions", "Source revisions", "Review each repository’s branch and commit.", "Read the revisions for repositories in this plan. Existing pins stay in place until you choose to update them."],
] as const;
export type TechnicalPlanSection = typeof technicalPlanSections[number][0];
export const technicalPlanDefaultSection: TechnicalPlanSection = "architecture:landing_units";
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
  const { field, key, group } = technicalPlanSectionBinding(section), current = JSON.parse(editor[field]);
  const next = key ? { ...current, [key]: value } : value;
  if (group === "architecture" && (key === "landing_units" || key === "source_landing_graph") &&
    Array.isArray(next.landing_units)) {
    const graph = next.source_landing_graph ?? { edges: [] };
    if (typeof graph === "object" && !Array.isArray(graph)) {
      next.source_landing_graph = {
        ...graph,
        nodes: next.landing_units.filter((unit: Record<string, unknown> | null) =>
          unit?.source_backed === true && typeof unit.id === "string" && unit.id).map((unit: { id: string }) => unit.id),
      };
    }
  }
  const updated = { ...editor, [field]: JSON.stringify(next, null, 2) };
  if (group !== "architecture" || !isOptionalArchitectureSection(key)) return updated;
  const previous = planRecord(current[key]);
  const inactive = { ...editor.inactiveArchitectureSections };
  if (value === null && previous && technicalPlanHasDraftInput(previous)) inactive[key] = previous;
  else if (value !== null) delete inactive[key];
  if (Object.keys(inactive).length) updated.inactiveArchitectureSections = inactive;
  else delete updated.inactiveArchitectureSections;
  return updated;
}
export function technicalPlanWorkReference(item: Pick<DeliveryArtNode, "component_type" | "legacy_work_package_id">) {
  return `${item.component_type} #${item.legacy_work_package_id}`;
}

export function technicalPlanWorkLabel(item: DeliveryArtNode) {
  return `${technicalPlanWorkReference(item)} - ${item.title}`;
}

export function technicalPlanWorkItems(model: DeliveryReadModel, deliveryId: string): DeliveryArtNode[] {
  const item = model.packages.find(item => item.delivery_package_id === deliveryId || `delivery-${item.legacy_epic_id}` === deliveryId);
  const flatten = (node: DeliveryArtNode): DeliveryArtNode[] => [node, ...node.children.flatMap(flatten)];
  return model.art_tree.roots.filter(node => node.id === item?.tree_root_id).flatMap(flatten);
}
/** Refresh the source-owned facts while preserving decisions in other sections. */
export function technicalPlanFillRecordedFacts(editor: ArchitecturePacketEditor, model: DeliveryReadModel) {
  const nodes = technicalPlanWorkItems(model, editor.deliveryId);
  let architecture: Record<string, unknown>;
  try { const value = JSON.parse(editor.architectureJson); if (!value || typeof value !== "object" || Array.isArray(value)) return editor; architecture = value; }
  catch { return editor; } // Preserve malformed manual input for explicit repair.
  if (architecture.descendant_owner_map !== undefined && !Array.isArray(architecture.descendant_owner_map)) return editor;
  const existing = new Map((architecture.descendant_owner_map ?? []).map(row => [row?.work_item_id, row]));
  const scope = new Set(editor.coveredWorkItemIds);
  const parents = new Map(nodes.flatMap(parent => parent.children.map(child => [child.id, parent] as const)));
  const observed = new Map(nodes.flatMap(node => {
    if (!node.legacy_work_package_id) return [];
    const ref = `work-item-${node.legacy_work_package_id}`;
    const parent = `work-item-${parents.get(node.id)?.legacy_work_package_id}`;
    return [[ref, {
      work_item_id: ref,
      work_item_type: node.component_type,
      parent_work_item_id: scope.has(parent) ? parent : null,
      owner_repo: node.owner_repo ?? "",
    }] as const];
  }));
  const rows = [...scope].flatMap(id => {
    const row = observed.get(id) ?? existing.get(id);
    return row ? [row] : [];
  });
  if (JSON.stringify(rows) === JSON.stringify(architecture.descendant_owner_map ?? [])) return editor;
  return { ...editor, architectureJson: JSON.stringify({ ...architecture, descendant_owner_map: rows }, null, 2) };
}

export function technicalPlanReplaceScope(editor: ArchitecturePacketEditor, ids: string[], model: DeliveryReadModel) {
  const next = { ...editor, coveredWorkItemIds: ids };
  const removed = new Set(editor.coveredWorkItemIds.filter(id => !ids.includes(id)));
  const updated = technicalPlanFillRecordedFacts(next, model);
  if (!removed.size) return updated;
  return ["architecture:descendant_owner_map", "architecture:work_item_execution_plan", "conformance_plan:work_item_dimension_applicability"]
    .reduce((plan, section) => {
      try {
        const rows = technicalPlanSectionValue(plan, section);
        return Array.isArray(rows)
          ? technicalPlanSetSection(plan, section, rows.filter(row => !removed.has(row?.work_item_id))) : plan;
      } catch { return plan; }
    }, updated);
}

export function technicalPlanScopeDropsChoices(editor: TechnicalPlanDraft, ids: string[]) {
  const removed = new Set(editor.coveredWorkItemIds.filter(id => !ids.includes(id)));
  if (!removed.size) return false;
  const checks = previewRecord(editor.conformanceJson).work_item_dimension_applicability;
  if (Array.isArray(checks) && checks.some(row =>
    removed.has(row?.work_item_id) && Array.isArray(row.dimension_ids) && row.dimension_ids.length > 0)) return true;
  const timings = previewRecord(editor.architectureJson).work_item_execution_plan;
  return Array.isArray(timings) && timings.some(row =>
    Array.isArray(row?.close_after_work_item_ids) && row.close_after_work_item_ids.some((id: string) =>
      removed.has(row.work_item_id) || removed.has(id)));
}

export function technicalPlanAddDependencyRows(editor: ArchitecturePacketEditor, nodes: DeliveryArtNode[]) {
  const section = "architecture:work_item_execution_plan";
  const existing = technicalPlanSectionValue(editor, section);
  if (existing !== undefined && !Array.isArray(existing)) return editor;
  const priorRows: Array<{ work_item_id?: string; close_after_work_item_ids?: string[]; emits_human_gate_ids?: string[] } | null> = existing ?? [];
  const recorded = new Map(priorRows.map(row => [row?.work_item_id, row]));
  const scope = new Set(editor.coveredWorkItemIds);
  const byId = new Map(nodes.map(node => [`work-item-${node.legacy_work_package_id}`, node]));
  const rows = [...scope].flatMap(id => {
    const node = byId.get(id);
    const previous = recorded.get(id);
    if (!node) return previous ? [previous] : [];
    const links = [...new Set((node.depends_on_work_package_ids ?? [])
      .map(dependency => `work-item-${dependency}`).filter(dependency => dependency !== id && scope.has(dependency)))];
    const close = new Set(Array.isArray(previous?.close_after_work_item_ids) ? previous.close_after_work_item_ids : []);
    return [{
      work_item_id: id,
      start_after_work_item_ids: links.filter(id => !close.has(id)),
      close_after_work_item_ids: links.filter(id => close.has(id)),
      emits_human_gate_ids: previous?.emits_human_gate_ids ?? [],
    }];
  });
  return JSON.stringify(rows) !== JSON.stringify(existing ?? []) ? technicalPlanSetSection(editor, section, rows) : editor;
}

function parsePlanValue(text: string): unknown {
  try { return JSON.parse(text); }
  catch { return null; }
}
function planRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function appendVerificationRows(plan: TechnicalPlanDraft) {
  const current = planRecord(parsePlanValue(plan.conformanceJson));
  if (!current || !plan.coveredWorkItemIds.length) return plan;
  const next = { ...current };
  const existing = current.work_item_dimension_applicability;
  if (existing === undefined || Array.isArray(existing)) {
    const rows = existing ?? [];
    const present = new Set(rows.map(row => row?.work_item_id));
    next.work_item_dimension_applicability = [
      ...rows,
      ...plan.coveredWorkItemIds.filter(id => !present.has(id)).map(id => ({ work_item_id: id, dimension_ids: [] })),
    ];
  }
  if (planRecord(current.protocol_applicability)?.applies === true &&
      (current.dimensions === undefined || Array.isArray(current.dimensions))) {
    next.dimensions = [...new Set([...(current.dimensions ?? []), ...architectureFormContract.requiredProtocolDimensions])];
  }
  return JSON.stringify(next) === JSON.stringify(current) ? plan : { ...plan, conformanceJson: JSON.stringify(next, null, 2) };
}

function connectApprovalAndActivationFacts(plan: TechnicalPlanDraft, architecture: Record<string, unknown>) {
  const updated = { ...architecture };
  const ownerRows = Array.isArray(architecture.descendant_owner_map) ? architecture.descendant_owner_map : [];
  const owners = new Map(ownerRows.map(row => [row?.work_item_id, row?.owner_repo]));
  if (Array.isArray(architecture.required_human_gates) && architecture.required_human_gates.every(row => planRecord(row))) {
    const approvals = architecture.required_human_gates.map(row => {
      const owner = owners.get(row.authority_work_item_id);
      return typeof owner === "string" && owner ? { ...row, authority_owner_repo: owner } : row;
    });
    const byWork = new Map<string, string[]>();
    for (const approval of approvals) {
      if (typeof approval.gate_id !== "string" || !approval.gate_id || typeof approval.authority_work_item_id !== "string") continue;
      const work = approval.authority_work_item_id;
      byWork.set(work, [...(byWork.get(work) ?? []), approval.gate_id]);
    }
    updated.required_human_gates = approvals;
    if (Array.isArray(architecture.work_item_execution_plan)) {
      updated.work_item_execution_plan = architecture.work_item_execution_plan.map(row => planRecord(row) ?
        { ...row, emits_human_gate_ids: byWork.get(row.work_item_id) ?? [] } : row);
    }
  }
  const approvalGroups = new Map(Array.isArray(updated.required_human_gates) ?
    updated.required_human_gates.filter(row => row?.blocked_transition === "before_runtime_activation")
      .map(row => [row.gate_id, row.affected_landing_unit_ids]) : []);
  const pins = parsePlanValue(plan.repoRevisionsJson);
  if (Array.isArray(architecture.runtime_activation_chains) && Array.isArray(pins)) {
    const revisionByRepo = new Map(pins.filter(row => typeof row?.repo === "string" && /^[a-f0-9]{40}$/.test(row.commit))
      .map(row => [row.repo, row.commit] as const));
    updated.runtime_activation_chains = architecture.runtime_activation_chains.map(row => {
      const evidence = planRecord(row?.source_activation_evidence);
      const commit = revisionByRepo.get(row?.source_owner_repo);
      const groups = approvalGroups.get(row?.gate_id);
      const chain = Array.isArray(groups) ? { ...row, commissioning_landing_unit_ids: groups } : row;
      if (!evidence || !commit || evidence.observed_value != null && evidence.observed_value !== "") return chain;
      return { ...chain, source_activation_evidence: { ...evidence, repo: row.source_owner_repo, revision: commit } };
    });
  }
  return updated;
}

/** Fill deterministic draft data from scope, the owner contract, and pinned source. */
export function technicalPlanPrepareDraft(editor: TechnicalPlanDraft, model: DeliveryReadModel) {
  const refreshed = technicalPlanFillRecordedFacts(editor, model);
  const seeded = planRecord(parsePlanValue(refreshed.architectureJson)) && refreshed.coveredWorkItemIds.length ?
    technicalPlanAddDependencyRows(refreshed, technicalPlanWorkItems(model, refreshed.deliveryId)) : refreshed;
  const current = planRecord(parsePlanValue(seeded.architectureJson));
  const connected = current && seeded.coveredWorkItemIds.length ? connectApprovalAndActivationFacts(seeded, {
    lifecycle_state_model: null,
    authorization_session_execution_model: null,
    evidence_receipt_handoffs: [],
    required_human_gates: [],
    runtime_activation_chains: [],
    contradictions_open_decisions: [],
    source_landing_graph: { nodes: [], edges: [] },
    ...current,
  }) : current;
  if (connected && connected.landing_units === undefined && Array.isArray(connected.descendant_owner_map)) {
    const rows = connected.descendant_owner_map;
    const repo = rows[0]?.owner_repo;
    if (repo && rows.length === seeded.coveredWorkItemIds.length && rows.every(row => row?.owner_repo === repo)) {
      connected.landing_units = [{
        id: `change-${crypto.randomUUID()}`, owner_repo: repo, source_backed: null,
        covered_work_item_ids: seeded.coveredWorkItemIds,
      }];
    }
  }
  const prepared = connected && JSON.stringify(connected) !== JSON.stringify(current)
    ? { ...seeded, architectureJson: JSON.stringify(connected, null, 2) } : seeded;
  return appendVerificationRows(prepared);
}

export function technicalPlanChangeGroupName(group: { id: string; covered_work_item_ids?: unknown }, titles: Record<string, string>) {
  const items = Array.isArray(group.covered_work_item_ids) ? group.covered_work_item_ids : [];
  const first = items.find(item => typeof titles[item] === "string");
  if (first) return items.length > 1 ? `${titles[first]} + ${items.length - 1} more` : titles[first];
  if (/^change-[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(group.id)) return "New change group";
  return group.id.replace(/^.*:/, "").replace(/[-_]/g, " ").replace(/^./, letter => letter.toUpperCase());
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
function preservePlanEvidence(previous: unknown, proposed: unknown, section: string) {
  const left = planRecord(previous), right = planRecord(proposed);
  if (section === "architecture:authorization_session_execution_model" && right) {
    const accepted = left?.authority_refs ?? [];
    if (right.authority_refs !== undefined && JSON.stringify(right.authority_refs) !== JSON.stringify(accepted)) {
      throw Error("Use the authorization lookup to add or change an evidence reference.");
    }
    return left?.authority_refs === undefined ? proposed : { ...right, authority_refs: accepted };
  }
  if (section !== "architecture:runtime_activation_chains" || !Array.isArray(proposed)) return proposed;
  const byId = new Map(Array.isArray(previous) ? previous.map(row => [row?.chain_id, row]) : []);
  return proposed.map(row => {
    const next = planRecord(row);
    if (!next) return row;
    const old = byId.get(next.chain_id);
    const evidence = planRecord(next.source_activation_evidence);
    const retained = planRecord(old?.source_activation_evidence);
    const observed = (value: Record<string, unknown> | null) =>
      typeof value?.observed_value === "boolean" || typeof value?.observed_value === "string" && Boolean(value.observed_value);
    if (observed(evidence) && (next.source_owner_repo !== old?.source_owner_repo ||
        Object.keys(evidence!).length !== Object.keys(retained ?? {}).length ||
        Object.entries(evidence!).some(([key, value]) => value !== retained?.[key]))) {
      throw Error("Use Read setting to verify activation evidence at its pinned revision.");
    }
    if (!evidence && observed(retained) && next.source_owner_repo === old.source_owner_repo) {
      return { ...next, source_activation_evidence: retained };
    }
    return row;
  });
}

export function technicalPlanAdvisorEdit(editor: ArchitecturePacketEditor, section: string, edits: Array<{ field: string; value: unknown }>) {
  if (section === "repo_revisions") throw Error("The advisor cannot author source revision evidence. Read verified source observations instead.");
  if (section === "architecture:descendant_owner_map") throw Error("Work responsibilities come from the Delivery record.");
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
    inspect(value);
    next = technicalPlanSetSection(next, section, preservePlanEvidence(technicalPlanSectionValue(next, section), value, section));
  }
  return next;
}
export function technicalPlanDisplayLabel(key: string) {
  return ({ start_after_work_item_ids: "Start after", close_after_work_item_ids: "Complete after", emits_human_gate_ids: "Approvals produced",
    prerequisite_landing_unit_id: "Prerequisite change", dependent_landing_unit_id: "Dependent change",
    authority_work_item_id: "Approval work item", authority_owner_repo: "Approval repository", affected_landing_unit_ids: "Affected changes",
    blocked_transition: "Approval required before", evidence_requirement: "Evidence to review", source_backed: "Changes files", covered_work_item_ids: "Covered work" } as Record<string,string>)[key] ?? planFieldLabel(key);
}
