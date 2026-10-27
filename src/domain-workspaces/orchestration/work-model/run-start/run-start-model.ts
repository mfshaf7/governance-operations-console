export type OrchestrationStartContext = Readonly<{
  initiativeId: number;
  title: string;
  recordRef: string;
  sourceVersion: string;
  projectionRef: string;
  projectionVersion: string;
  startAllowed: boolean;
  blockers: readonly string[];
}>;

export type OrchestrationStartDraft = Readonly<{
  requestId: string;
  initiativeId: number;
  expectedSourceVersion: string;
  purpose: string;
  approved: true;
  issuedAt: string;
}>;

export type OrchestrationStartReceipt = Readonly<{
  duplicate: boolean;
  runId: string;
  state: string | null;
}>;

const noncePattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,255}$/;

export function orchestrationInitiativeId(value: unknown): number {
  const id = typeof value === "string" && /^[1-9][0-9]*$/.test(value) ? Number(value) : value;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1) throw new Error("Enter an ART Epic number.");
  return id;
}

export function originalOrchestrationRunId(requestId: string) {
  if (!noncePattern.test(requestId)) throw new Error("The original start identity is invalid.");
  return `oos:validation-readiness-run:v1:console-orchestration-start:${requestId}`;
}

export function assertOrchestrationStartDraft(value: unknown): OrchestrationStartDraft {
  const draft = object(value);
  exact(draft, ["requestId", "initiativeId", "expectedSourceVersion", "purpose", "approved", "issuedAt"]);
  if (typeof draft.requestId !== "string" || !noncePattern.test(draft.requestId) ||
      !identifier(draft.expectedSourceVersion) || typeof draft.purpose !== "string" ||
      !draft.purpose.trim() || draft.purpose.trim().length > 512 || draft.approved !== true ||
      typeof draft.issuedAt !== "string" || !Number.isFinite(Date.parse(draft.issuedAt))) {
    throw new Error("Review the current source, run purpose and explicit approval before starting.");
  }
  orchestrationInitiativeId(draft.initiativeId);
  return draft as OrchestrationStartDraft;
}

export function assertOrchestrationStartContext(value: unknown): OrchestrationStartContext {
  const context = object(value);
  exact(context, ["initiativeId", "title", "recordRef", "sourceVersion", "projectionRef", "projectionVersion", "startAllowed", "blockers"]);
  const id = orchestrationInitiativeId(context.initiativeId);
  if (typeof context.title !== "string" || !context.title.trim() ||
      context.recordRef !== `openproject://work_packages/${id}` ||
      !identifier(context.sourceVersion) || !identifier(context.projectionRef) || !identifier(context.projectionVersion) ||
      typeof context.startAllowed !== "boolean" || !Array.isArray(context.blockers) ||
      context.blockers.some(value => typeof value !== "string" || !value.trim()) ||
      (context.startAllowed && context.blockers.length !== 0)) throw new Error("Current run source is invalid or unbound.");
  return context as OrchestrationStartContext;
}

export function assertOrchestrationStartReceipt(value: unknown, requestId: string): OrchestrationStartReceipt {
  const receipt = object(value);
  exact(receipt, ["duplicate", "runId", "state"]);
  if (typeof receipt.duplicate !== "boolean" || receipt.runId !== originalOrchestrationRunId(requestId) ||
      !(receipt.state === null || ["queued", "running", "waiting", "blocked", "completed", "cancelled", "failed"].includes(String(receipt.state)))) {
    throw new Error("The original start acknowledgement is unconfirmed. Read that same run.");
  }
  return receipt as OrchestrationStartReceipt;
}

function identifier(value: unknown): value is string { return typeof value === "string" && identifierPattern.test(value); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Run start input is malformed.");
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, fields: readonly string[]) {
  if (Object.keys(value).length !== fields.length || Object.keys(value).some(key => !fields.includes(key))) throw new Error("Run start accepts the reviewed intent only.");
}
