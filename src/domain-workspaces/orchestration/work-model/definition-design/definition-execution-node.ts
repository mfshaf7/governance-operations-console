import type { OrchestrationExecutionNodeDraft } from "./definition-design-types.ts";

/** Shared defaults for manual and requested advisory step drafts; not admission. */
export function createDefinitionExecutionNode(id: string): OrchestrationExecutionNodeDraft {
  return { id, label: "", type: "activity", adapter: "", owner: "", dependencies: [],
    branchCondition: "", idempotency: "", optional: false, parallelGroup: "", skipReason: "", timeout: "" };
}

/** Materialize ordinary form data before changing any draft. Missing facts stay blank. */
export function definitionAdvisorNodes(raw: string, previous: OrchestrationExecutionNodeDraft[]) {
  const input: unknown = JSON.parse(raw);
  if (!Array.isArray(input) || input.length > 150) throw Error("Execution steps must be a bounded JSON array of step objects.");
  const reserved = new Set([...previous.map(node => node.id), ...input.map(value => value?.id).filter(value => typeof value === "string")]);
  const ids = new Set<string>();
  return input.map(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Each execution step must be an object, not a text line.");
    let id = value.id;
    if (id === undefined) {
      let number = 1; while (reserved.has(`node-${number}`) || ids.has(`node-${number}`)) number++;
      id = `node-${number}`;
    }
    if (typeof id !== "string" || !id.trim() || id.length > 256 || ids.has(id)) throw Error("Execution step identifiers must be present and unique.");
    ids.add(id);
    const initial = previous.find(node => node.id === id) ?? createDefinitionExecutionNode(id);
    if (Object.keys(value).some(key => !Object.hasOwn(initial, key))) throw Error("An execution step contains an unsupported field.");
    const node = { ...initial, ...value, id } as OrchestrationExecutionNodeDraft;
    for (const [key, field] of Object.entries(node)) {
      if (key === "dependencies") {
        if (!Array.isArray(field) || field.length > 150 || field.some(item => typeof item !== "string")) throw Error("Step dependencies must name existing steps.");
      } else if (key === "optional") {
        if (typeof field !== "boolean") throw Error("The optional step setting must be true or false.");
      } else if (typeof field !== "string" || field.length > 24_000) throw Error("Execution step fields must contain bounded text.");
    }
    if (!["activity", "subworkflow", "wait"].includes(node.type)) throw Error("Choose an available execution step type.");
    return node;
  });
}
