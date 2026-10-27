/** Inert, role-scoped draft data. No command or canonical mutation is represented. */
export const advisorRoles = [
  "proposal-triage", "proposal-disposition", "prototype-candidate", "prototype-baseline",
  "work-design-context", "work-design-tree", "refinement-metadata", "execution-tree",
  "work-design-blocker", "refinement-blocker", "definition-design",
] as const;
export type AdvisorRole = typeof advisorRoles[number];
export type AdvisorField = {
  key: string;
  label: string;
  value: unknown;
  kind?: "text" | "board" | "tree";
  allowedValues?: string[];
  maxLength?: number;
};
export type AdvisorScope = {
  role: AdvisorRole;
  ref: string;
  sourceRef: string;
  sourceRevision: string;
  context: string;
  fields: AdvisorField[];
  packageRef?: string;
  readOnly?: boolean;
};
export type AdvisorEdit = { field: string; value: unknown };
export type AdvisorReply = {
  intent: "answer" | "clarify" | "draft";
  message: string;
  edits: AdvisorEdit[];
};
export type AdvisorEvidence = {
  profileId: string;
  auditRef: string;
  contextRef: string;
  receiptRef?: string;
  invocationId?: string;
  effectiveModel?: string;
};
export type GovernedAdvisorReply = AdvisorReply & { evidence: AdvisorEvidence };
export type AdvisorTransport = (
  scope: AdvisorScope, prompt: string, signal: AbortSignal,
  conversation: Array<{ role: "operator" | "advisor"; text: string }>,
) => Promise<GovernedAdvisorReply>;

const finalFields = new Set([
  "submit", "approve", "reject", "activate", "close", "execute", "publish", "merge",
  "status", "outcome", "decision", "receipt", "operator_id", "caller_id",
]);
const dangerousKeys = new Set(["__proto__", "prototype", "constructor"]);
export const advisorDraftContextChars = 32_000;

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function exact(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some((key) => !keys.includes(key))) throw Error("Unexpected advisor data field.");
}
function text(value: unknown, limit: number, empty = false): asserts value is string {
  if (typeof value !== "string" || (!empty && !value.trim()) || value.length > limit) {
    throw Error("Advisor text is absent or exceeds its bounded context.");
  }
}
function jsonValue(value: unknown, depth = 0): void {
  if (depth > 24) throw Error("Advisor draft data is too deeply nested.");
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value === "string") { text(value, 24_000, true); return; }
  if (Array.isArray(value)) {
    if (value.length > 250) throw Error("Advisor draft collection exceeds its bound.");
    value.forEach((item) => jsonValue(item, depth + 1)); return;
  }
  if (object(value)) {
    if (Object.keys(value).length > 100 || Object.keys(value).some((key) => dangerousKeys.has(key))) {
      throw Error("Advisor draft contains an unsupported object field.");
    }
    Object.values(value).forEach((item) => jsonValue(item, depth + 1)); return;
  }
  throw Error("Advisor draft must contain ordinary JSON data only.");
}

export function assertAdvisorScope(value: unknown): AdvisorScope {
  if (!object(value)) throw Error("A selected advisor draft scope is required.");
  exact(value, ["role", "ref", "sourceRef", "sourceRevision", "context", "fields", "packageRef", "readOnly"]);
  if (!(advisorRoles as readonly unknown[]).includes(value.role)) throw Error("Unknown advisor role.");
  text(value.ref, 1024); text(value.sourceRef, 1024); text(value.sourceRevision, 256);
  text(value.context, 16_000, true);
  if (value.packageRef !== undefined) text(value.packageRef, 256);
  if (value.readOnly !== undefined && typeof value.readOnly !== "boolean") throw Error("Invalid advisor read-only posture.");
  if (!Array.isArray(value.fields) || value.fields.length > 80) throw Error("Advisor field scope exceeds its bound.");
  const keys = new Set<string>();
  for (const field of value.fields) {
    if (!object(field)) throw Error("Malformed advisor draft field.");
    exact(field, ["key", "label", "value", "kind", "allowedValues", "maxLength"]);
    text(field.key, 300); text(field.label, 500);
    if (keys.has(field.key) || dangerousKeys.has(field.key) || finalFields.has(field.key)) {
      throw Error("Advisor scope contains duplicate or final-decision fields.");
    }
    keys.add(field.key);
    if (field.kind !== undefined && !["text", "board", "tree"].includes(String(field.kind))) {
      throw Error("Unsupported advisor draft field kind.");
    }
    if (field.kind === undefined || field.kind === "text") text(field.value, 24_000, true);
    else jsonValue(field.value);
    if (field.allowedValues !== undefined && (!Array.isArray(field.allowedValues) ||
      field.allowedValues.length > 150 || field.allowedValues.some((item) => typeof item !== "string" || item.length > 1000))) {
      throw Error("Malformed advisor field choices.");
    }
    if (field.maxLength !== undefined && (!Number.isInteger(field.maxLength) || Number(field.maxLength) < 1 || Number(field.maxLength) > 24_000)) {
      throw Error("Malformed advisor field limit.");
    }
  }
  if (JSON.stringify(value).length > advisorDraftContextChars) throw Error("The selected draft is too large; select a smaller draft scope.");
  return value as AdvisorScope;
}

export function advisorScopeIdentity(scope: AdvisorScope) {
  return JSON.stringify([scope.role, scope.ref, scope.sourceRef, scope.sourceRevision]);
}
export function advisorScopeSnapshot(scope: AdvisorScope) {
  return JSON.stringify([advisorScopeIdentity(scope), scope.context, scope.fields]);
}

export function assertAdvisorReply(value: unknown, scope: AdvisorScope): AdvisorReply {
  if (!object(value)) throw Error("The advisor did not return a draft proposal.");
  exact(value, ["intent", "message", "edits"]);
  if (!["answer", "clarify", "draft"].includes(String(value.intent))) throw Error("Invalid advisor intent.");
  text(value.message, 12_000);
  if (!Array.isArray(value.edits) || value.edits.length > 80) throw Error("Invalid advisor edit batch.");
  if ((value.intent !== "draft" && value.edits.length) || (value.intent === "draft" && !value.edits.length)) {
    throw Error("Answer and clarification replies cannot edit drafts.");
  }
  if (scope.readOnly && value.edits.length) throw Error("The selected draft is read-only; no edits are allowed.");
  const seen = new Set<string>();
  for (const edit of value.edits) {
    if (!object(edit)) throw Error("Malformed advisor edit.");
    exact(edit, ["field", "value"]); text(edit.field, 300);
    const field = scope.fields.find((candidate) => candidate.key === edit.field);
    if (!field || seen.has(edit.field)) throw Error("The advisor proposed an unavailable or duplicate draft target.");
    seen.add(edit.field);
    if (!field.kind || field.kind === "text") {
      text(edit.value, field.maxLength ?? 24_000, true);
      if (field.allowedValues?.length && !field.allowedValues.includes(edit.value)) throw Error("The advisor proposed an invalid field choice.");
    } else {
      if (!object(edit.value)) throw Error("Diagram and tree edits must be structured data.");
      jsonValue(edit.value);
    }
  }
  if (JSON.stringify(value).length > 48_000) throw Error("Advisor draft response exceeds its bound.");
  return value as AdvisorReply;
}

export function parseAdvisorReply(raw: string, scope: AdvisorScope) {
  let value = raw.trim();
  if (value.startsWith("```json\n") && value.endsWith("```")) value = value.slice(8, -3).trim();
  try { return assertAdvisorReply(JSON.parse(value), scope); }
  catch (error) { throw Error(error instanceof SyntaxError ? "The advisor returned unstructured advice; no draft was changed." : (error as Error).message); }
}

export const advisorDraftInstructions = `Return your advice text as one JSON object with exactly these keys:
{"intent":"answer|clarify|draft","message":"readable answer or edit summary","edits":[{"field":"an admitted field key","value":"draft text or a structured board/tree patch"}]}.
Interpret the operator's actual chat request. Questions, evaluation, explanation, greetings and requests not to edit require intent=answer and edits=[]. Ambiguous editing requests require intent=clarify and edits=[]. Only an explicit request to draft/create/revise/fill/edit permits intent=draft. Do not treat a question about how something would be changed as a request to change it.
Work only inside the admitted selected draft. Preserve unrelated content. Never submit, approve, reject, activate, close, execute, publish or merge anything, and never invent a receipt or authority. Explain unavailable context instead of claiming inspection. Your edits are inert local drafts, not final decisions.
Text fields take strings. Board fields take {addItems:[],updateItems:[],removeItemIds:[],addConnections:[],removeConnectionIds:[]}; items use id,kind,label,detail,x,y and optional width,height,tone; use existing diagram kinds and unique IDs. Connections use id,from:{endpointType:"port",itemId,itemType:"custom",side:"right"},to:{endpointType:"port",itemId,itemType:"custom",side:"left"},label and optional tone/shape/stroke/tip. Preserve current items unless removal is explicitly requested. Tree fields take {addNodes:[{parentId,node:{id,kind,title,description,draftBody,remark,children:[]}}],updateNodes:[{id,title,description,draftBody,remark}],removeNodeIds:[]}; preserve existing IDs and valid Epic/Feature/User story/Risk hierarchy. Do not invent canonical work-item IDs. Return no markdown around the JSON.`;
