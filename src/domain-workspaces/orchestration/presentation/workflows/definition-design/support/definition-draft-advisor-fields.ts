import type { AdvisorEdit, AdvisorField } from "@/agent-console/model/advisor-drafts";
import type { OrchestrationDefinitionDesignDraft } from "../../../../work-model/definition-design/definition-design-types.ts";

const groups = {
  "delivery-versioning": "deliveryVersioning", "evidence-security": "evidenceSecurity",
  "execution-plan": "executionPlan", "failure-controls": "failureControls",
  "identity-ownership": "identityOwnership", qualification: "qualification", "trigger-result": "triggerResult",
} as const;
const decisions = new Set(["classification", "operatorApproved", "target", "targetRef", "id"]);
export function definitionDraftAdvisorFields(draft: OrchestrationDefinitionDesignDraft, selectedNodeId: string) {
  const group = draft.activeStage === "qualify" ? "qualification" : groups[draft.activeSection];
  const fields: AdvisorField[] = [];
  function add(value: Record<string, unknown>, prefix: string) {
    for (const [key, item] of Object.entries(value)) {
      if (decisions.has(key)) continue;
      if (typeof item === "string") fields.push({ key: `${prefix}.${key}`, label: key, value: item,
        ...(prefix.startsWith("node:") && key === "type" ? { allowedValues: ["activity", "subworkflow", "wait"] } : {}) });
      else if (typeof item === "boolean") fields.push({ key: `${prefix}.${key}`, label: key, value: String(item), allowedValues: ["true", "false"] });
      else if (Array.isArray(item) && item.every((part) => typeof part === "string")) fields.push({ key: `${prefix}.${key}`, label: `${key} (one item per line)`, value: item.join("\n") });
    }
  }
  add(draft[group] as unknown as Record<string, unknown>, group);
  if (group === "executionPlan") {
    const node = draft.executionPlan.nodes.find((item) => item.id === selectedNodeId);
    if (node) add(node as unknown as Record<string, unknown>, `node:${node.id}`);
  }
  return fields;
}

export function applyDefinitionDraftAdvisorEdits(draft: OrchestrationDefinitionDesignDraft, selectedNodeId: string, edits: AdvisorEdit[]) {
  const allowed = definitionDraftAdvisorFields(draft, selectedNodeId);
  const next = structuredClone(draft);
  for (const edit of edits) {
    if (!allowed.some((field) => field.key === edit.field)) throw Error("This Definition field is outside the selected local draft scope.");
    const dot = edit.field.lastIndexOf(".");
    const group = edit.field.slice(0, dot), key = edit.field.slice(dot + 1);
    const target = (group.startsWith("node:") ? next.executionPlan.nodes.find((node) => node.id === group.slice(5)) : next[group as keyof OrchestrationDefinitionDesignDraft]) as unknown as Record<string, unknown> | undefined;
    if (!target) throw Error("The selected Definition node no longer exists.");
    const previous = target[key], value = String(edit.value);
    if (Array.isArray(previous)) {
      const items = value.split("\n").filter((line) => line.trim());
      if (key === "supportedDispositions" && items.some((item) => !["accept-risk", "defer", "remove", "workaround"].includes(item))) throw Error("Unsupported recovery disposition.");
      target[key] = items;
    } else if (typeof previous === "boolean") target[key] = value === "true";
    else target[key] = value;
  }
  // Dependencies remain local data, but may not refer to absent nodes or self.
  const ids = new Set(next.executionPlan.nodes.map((node) => node.id));
  if (next.executionPlan.nodes.some((node) => node.dependencies.some((id) => id === node.id || !ids.has(id)))) throw Error("Execution node dependencies must refer to other existing nodes.");
  const visiting = new Set<string>(), visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) throw Error("Execution dependencies cannot form a cycle.");
    if (visited.has(id)) return;
    visiting.add(id);
    next.executionPlan.nodes.find((node) => node.id === id)!.dependencies.forEach(visit);
    visiting.delete(id); visited.add(id);
  }
  for (const id of ids) visit(id);
  return next;
}
