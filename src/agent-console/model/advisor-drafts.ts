/** Inert, role-scoped draft data. No command or canonical mutation is represented. */
export const advisorRoles = [
  "proposal-triage", "proposal-disposition", "prototype-candidate", "prototype-baseline",
  "work-design-context", "work-design-tree", "refinement-metadata", "execution-tree",
  "work-design-blocker", "refinement-blocker", "definition-design", "execution-architecture",
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
export const workDesignDraftContextChars = 128_000;
export const advisorDraftReplyChars = 128_000;
const isWorkDesignRole = (role: unknown) => role === "work-design-context" || role === "work-design-tree";

/** Carry actual observations and their coverage; never silently trim evidence. */
export function advisorWorkContext(data: Record<string, unknown>, coverage: {
  provided: string[]; unavailable: string[];
}, maxChars = 16_000) {
  const context = JSON.stringify({ contextVersion: 1, observations: data,
    coverage: { ...coverage, referencesAreLoadedContents: false,
      boundary: "Only supplied observations are available; linked documents, other chats and repositories are not automatically inspected." } });
  if (!Number.isInteger(maxChars) || maxChars < 1 || maxChars > 64_000 || context.length > maxChars) throw Error("The selected work context is too large for one advisor request. Narrow the selected scope; no evidence was silently removed.");
  return context;
}

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
  text(value.context, isWorkDesignRole(value.role) ? 64_000 : 16_000, true);
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
  if (JSON.stringify(value).length > (isWorkDesignRole(value.role) ? workDesignDraftContextChars : advisorDraftContextChars)) throw Error("The selected draft is too large; select a smaller draft scope.");
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
  if (JSON.stringify(value).length > advisorDraftReplyChars) throw Error("Advisor draft response exceeds its bound.");
  return value as AdvisorReply;
}

export function parseAdvisorReply(raw: string, scope: AdvisorScope) {
  let value = raw.trim();
  if (value.startsWith("```json\n") && value.endsWith("```")) value = value.slice(8, -3).trim();
  try { return assertAdvisorReply(JSON.parse(value), scope); }
  catch (error) { throw Error(error instanceof SyntaxError ? "The advisor returned unstructured advice; no draft was changed." : (error as Error).message); }
}

export const advisorDraftInstructions = `Return the provider schema's native draft_reply object with intent, message and edits. Do not encode the reply or any patch as JSON text inside text. The backend serializes the validated structure for existing HTTP clients.
Each edit names an admitted field and value_type=text, board or tree. Fill exactly its matching text_value, board_patch or tree_patch; the other two are null. The provider schema defines these typed properties. Unchanged optional item/style/update properties use null.
Interpret the operator's actual chat request. Questions, evaluation, explanation, greetings and requests not to edit require intent=answer and edits=[]. Ambiguous editing requests require intent=clarify and edits=[]. Only an explicit request to draft/create/revise/fill/edit permits intent=draft. Do not treat a question about how something would be changed as a request to change it.
Work only inside the admitted selected draft. Preserve unrelated content. Never submit, approve, reject, activate, close, execute, publish or merge anything, and never invent a receipt or authority. Explain unavailable context instead of claiming inspection. Your edits are inert local drafts, not final decisions.
Text fields take strings in text_value. board_patch takes addItems/updateItems/removeItemIds/addConnections/updateConnections/removeConnectionIds/addTrays/updateTrays/removeTrayIds/arrangements/layers arrays and nullable placement. Leave unused arrays empty. Follow the supplied actual editor facts for group membership, arrangement and renderer semantics. Items use id,kind,label,detail,x,y and nullable width,height,tone,diagramType,autoSize. New text cards use automatic height by default; autoSize=true restores it on an existing fixed card. A tray's itemIds group existing custom card IDs; moving the tray moves its members. Removing a tray preserves cards unless removeItemIds explicitly removes them. Connector updates retain IDs. Center-new placement is the default for an empty diagram; choose as-authored only for an explicit operator positioning request. For a board field, its allowedValues list gives the exact supported card kind names. Plain rectangular cards use kind=shape-rect and do not display detail. Use unique IDs, finite geometry and readable spacing based on resolved sizes. Connections use native from/to endpoints; unused free/port coordinates and IDs are null. Preserve existing architecture, positions and other views unless their change was requested. tree_patch takes addNodes, updateNodes and removeNodeIds. Add individual Feature/User story/Risk nodes with children=[] and an explicit existing or earlier-added parentId. The Epic root already exists; never insert or remove it. Preserve existing IDs and valid Epic/Feature/User story/Risk hierarchy. Do not invent canonical work-item IDs.`;
