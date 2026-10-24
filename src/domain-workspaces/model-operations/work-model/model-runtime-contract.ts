import type { NativeModelEffort } from "../../../console-integration/governed-ai/model-selection.ts";

export type ModelChoice = { model_id: string; effort: NativeModelEffort };
export type ModelRoute = { primary: ModelChoice; fallbacks: ModelChoice[]; on_exhausted: "fail-closed" };
export type RegisteredModel = {
  backend_id: string; model: string; supported_efforts: NativeModelEffort[];
  model_digest: string | null; runtime_version: string; verification_ref: string;
};
export type ModelConfiguration = {
  backends: Record<string, { backend_id: string }>;
  models: Record<string, RegisteredModel>;
  default: ModelRoute | null;
  overrides: Record<string, ModelRoute | null>;
};
export type ConfigurationSnapshot = {
  revision: number; current_revision: number; digest: string; configuration: ModelConfiguration;
  history: Array<{ revision: number; digest: string }>;
};
export type ModelBackend = {
  backend_id: string; provider: string; allowed_tasks: string[]; registered: boolean;
  account_login_supported: boolean; availability: "not-probed";
};
export type ModelRegistry = {
  schema_version: 1; tasks: string[]; backends: ModelBackend[]; configuration: ConfigurationSnapshot;
};
export type ModelCatalogue = {
  backend_id: string;
  models: Array<{ model: string; supported_efforts: NativeModelEffort[] | null; model_digest: string | null; runtime_version: string }>;
};
export const modelActions = ["backend.register", "backend.remove", "model.register", "model.remove", "routing.save", "routing.rollback", "account.login.start", "account.login.cancel"] as const;
export type ModelAction = typeof modelActions[number];
export type ModelRuntimeRequest = {
  schema_version: 1; request_id: string; idempotency_key: string;
  expected_configuration_revision: number; action: ModelAction; input: Record<string, unknown>;
};
export type ModelConfigurationReceipt = {
  command_id: string; command_digest: string; actor: string; action: string;
  previous_revision: number; revision: number; configuration_digest: string; receipt_digest: string;
};
export type ModelLogin = {
  command_id: string; request_digest: string; backend_id: string; actor: string;
  state: "starting" | "waiting-for-operator" | "cancel-requested" | "connected" | "cancelled" | "failed" | "interrupted";
  verification_url: string | null; user_code: string | null; failure: string | null;
};
export type ModelRuntimeOperation = {
  schema_version: 1; workflow_id: "model-operations"; request_id: string; revision: number;
  request: ModelRuntimeRequest; state: "queued" | "running" | "awaiting-account" | "retryable" | "unknown" | "blocked" | "completed" | "cancelled" | "rejected";
  owner_command_id: string; attempt: number; owner_receipt: ModelConfigurationReceipt | null;
  applied_configuration: ConfigurationSnapshot | null; account_login: ModelLogin | null;
  failure: { code: string; retryable: boolean } | null;
  history: Array<{ sequence: number; type: string; state: string; occurred_at: string }>;
  next_action: string;
};
export type ModelRuntimeControl = { control_id: string; expected_revision: number; action: "retry" | "reconcile" | "cancel" };
export type ModelRuntimePage = { requests: ModelRuntimeOperation[]; next_cursor: string | null };
export const terminalModelStates = new Set(["completed", "cancelled", "rejected"]);
export function sameModelRuntimeRequest(a: ModelRuntimeRequest, b: ModelRuntimeRequest): boolean {
  const stable = (value: unknown): string => {
    if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
    if (value && typeof value === "object") {
      const row = value as Record<string, unknown>;
      return "{" + Object.keys(row).sort().map(key => JSON.stringify(key) + ":" + stable(row[key])).join(",") + "}";
    }
    return JSON.stringify(value);
  };
  return stable(a) === stable(b);
}

export class ModelRuntimeContractError extends Error {
  constructor(message = "The model owner returned incomplete or conflicting evidence.") { super(message); }
}
export function modelRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ModelRuntimeContractError();
  return value as Record<string, unknown>;
}
export function modelExact(value: unknown, keys: string[]): Record<string, unknown> {
  const row = modelRecord(value);
  if (Object.keys(row).sort().join(",") !== [...keys].sort().join(",")) throw new ModelRuntimeContractError();
  return row;
}
export function modelText(value: unknown, max = 200): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}
export function modelInteger(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) >= 0; }
export function modelHash(value: unknown): value is string { return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value); }
export function modelIdentifier(value: unknown): value is string { return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,180}$/.test(value); }
export function nativeEffort(value: unknown): value is NativeModelEffort { return value === null || typeof value === "boolean" || modelText(value); }
function requireModel(value: unknown): asserts value { if (!value) throw new ModelRuntimeContractError(); }

export function assertModelRoute(value: unknown): ModelRoute | null {
  if (value === null) return null;
  const route = modelExact(value, ["primary", "fallbacks", "on_exhausted"]);
  requireModel(Array.isArray(route.fallbacks) && route.fallbacks.length <= 4 && route.on_exhausted === "fail-closed");
  for (const choice of [route.primary, ...(route.fallbacks as unknown[])]) {
    const row = modelExact(choice, ["model_id", "effort"]);
    requireModel(modelHash(row.model_id) && nativeEffort(row.effort));
  }
  return value as ModelRoute;
}
export function assertModelConfiguration(value: unknown): ConfigurationSnapshot {
  const row = modelExact(value, ["revision", "current_revision", "digest", "configuration", "history"]);
  requireModel(modelInteger(row.revision) && modelInteger(row.current_revision) && row.current_revision >= row.revision && modelHash(row.digest) && Array.isArray(row.history));
  const config = modelExact(row.configuration, ["backends", "models", "default", "overrides"]);
  for (const [id, value] of Object.entries(modelRecord(config.backends))) requireModel(modelExact(value, ["backend_id"]).backend_id === id);
  for (const [id, value] of Object.entries(modelRecord(config.models))) {
    const model = modelExact(value, ["backend_id", "model", "supported_efforts", "model_digest", "runtime_version", "verification_ref"]);
    requireModel(modelHash(id) && modelText(model.backend_id) && modelText(model.model) && modelText(model.runtime_version, 2048) && modelHash(model.verification_ref) &&
      (model.model_digest === null || modelText(model.model_digest)) && Array.isArray(model.supported_efforts) && model.supported_efforts.length > 0 && model.supported_efforts.every(nativeEffort) &&
      Object.hasOwn(modelRecord(config.backends), model.backend_id));
  }
  assertModelRoute(config.default);
  Object.values(modelRecord(config.overrides)).forEach(assertModelRoute);
  for (const value of row.history as unknown[]) {
    const entry = modelExact(value, ["revision", "digest"]);
    requireModel(modelInteger(entry.revision) && modelHash(entry.digest) && entry.revision <= row.current_revision);
  }
  return value as ConfigurationSnapshot;
}
export function assertModelRegistry(value: unknown): ModelRegistry {
  const row = modelExact(value, ["schema_version", "tasks", "backends", "configuration"]);
  requireModel(row.schema_version === 1 && Array.isArray(row.tasks) && row.tasks.every(task => modelText(task, 300)) && Array.isArray(row.backends));
  const snapshot = assertModelConfiguration(row.configuration);
  requireModel(snapshot.revision === snapshot.current_revision);
  for (const value of row.backends as unknown[]) {
    const backend = modelExact(value, ["backend_id", "provider", "allowed_tasks", "registered", "account_login_supported", "availability"]);
    requireModel(modelText(backend.backend_id) && modelText(backend.provider) && Array.isArray(backend.allowed_tasks) &&
      backend.allowed_tasks.every(task => (row.tasks as string[]).includes(task)) && typeof backend.registered === "boolean" &&
      typeof backend.account_login_supported === "boolean" && backend.availability === "not-probed");
  }
  return value as ModelRegistry;
}
export function assertModelCatalogue(value: unknown, backendId: string): ModelCatalogue {
  const row = modelExact(value, ["backend_id", "models"]);
  requireModel(row.backend_id === backendId && Array.isArray(row.models));
  for (const value of row.models as unknown[]) {
    const model = modelExact(value, ["model", "supported_efforts", "model_digest", "runtime_version"]);
    requireModel(modelText(model.model) && modelText(model.runtime_version, 2048) && (model.model_digest === null || modelText(model.model_digest)) &&
      (model.supported_efforts === null || Array.isArray(model.supported_efforts) && model.supported_efforts.length > 0 && model.supported_efforts.every(nativeEffort)));
  }
  return value as ModelCatalogue;
}
export function assertModelRuntimeRequest(value: unknown): ModelRuntimeRequest {
  const row = modelExact(value, ["schema_version", "request_id", "idempotency_key", "expected_configuration_revision", "action", "input"]);
  requireModel(row.schema_version === 1 && modelIdentifier(row.request_id) && modelIdentifier(row.idempotency_key) && modelInteger(row.expected_configuration_revision) && modelActions.includes(row.action as ModelAction));
  const action = row.action as ModelAction;
  if (["backend.register", "backend.remove", "account.login.start"].includes(action)) requireModel(modelText(modelExact(row.input, ["backend_id"]).backend_id));
  if (action === "model.register") { const input = modelExact(row.input, ["backend_id", "model"]); requireModel(modelText(input.backend_id) && modelText(input.model)); }
  if (action === "model.remove") requireModel(modelHash(modelExact(row.input, ["model_id"]).model_id));
  if (action === "routing.rollback") requireModel(modelInteger(modelExact(row.input, ["revision"]).revision));
  if (action === "account.login.cancel") requireModel(modelIdentifier(modelExact(row.input, ["login_command_id"]).login_command_id));
  if (action === "routing.save") {
    const input = modelExact(row.input, ["default", "overrides"]);
    assertModelRoute(input.default);
    const overrides = modelRecord(input.overrides);
    requireModel(Object.keys(overrides).length <= 100); Object.values(overrides).forEach(assertModelRoute);
  }
  return value as ModelRuntimeRequest;
}
export function assertModelRuntimeControl(value: unknown): ModelRuntimeControl {
  const row = modelExact(value, ["control_id", "expected_revision", "action"]);
  requireModel(modelIdentifier(row.control_id) && modelInteger(row.expected_revision) && row.expected_revision >= 1 && ["retry", "reconcile", "cancel"].includes(String(row.action)));
  return value as ModelRuntimeControl;
}
export function assertModelRuntimeOperation(value: unknown, requestId?: string): ModelRuntimeOperation {
  const row = modelExact(value, ["schema_version", "workflow_id", "request_id", "revision", "request", "state", "owner_command_id", "attempt", "owner_receipt", "applied_configuration", "account_login", "failure", "history", "next_action"]);
  const request = assertModelRuntimeRequest(row.request);
  requireModel(row.schema_version === 1 && row.workflow_id === "model-operations" && row.request_id === request.request_id &&
    (!requestId || row.request_id === requestId) && modelInteger(row.revision) && row.revision >= 1 && modelInteger(row.attempt) && row.attempt >= 1 &&
    modelIdentifier(row.owner_command_id) && ["queued", "running", "awaiting-account", "retryable", "unknown", "blocked", "completed", "cancelled", "rejected"].includes(String(row.state)) &&
    ["await-progress", "complete-account-sign-in", "retry-or-cancel", "reconcile-original-operation", "review-owner-evidence", "complete", "refresh-and-create-corrected-request"].includes(String(row.next_action)) &&
    Array.isArray(row.history) && row.history.length > 0 && row.history.length <= 128);
  for (const value of row.history as unknown[]) {
    const entry = modelExact(value, ["sequence", "type", "state", "occurred_at"]);
    requireModel(modelInteger(entry.sequence) && entry.sequence >= 1 && modelText(entry.type) && modelText(entry.state) && Number.isFinite(Date.parse(String(entry.occurred_at))));
  }
  if (row.owner_receipt !== null) {
    const receipt = modelExact(row.owner_receipt, ["command_id", "command_digest", "actor", "action", "previous_revision", "revision", "configuration_digest", "receipt_digest"]);
    requireModel(receipt.command_id === row.owner_command_id && receipt.action === request.action && modelText(receipt.actor) &&
      receipt.previous_revision === request.expected_configuration_revision && receipt.revision === request.expected_configuration_revision + 1 &&
      modelHash(receipt.command_digest) && modelHash(receipt.configuration_digest) && modelHash(receipt.receipt_digest));
  }
  if (row.applied_configuration !== null) assertModelConfiguration(row.applied_configuration);
  if (row.account_login !== null) {
    const login = modelExact(row.account_login, ["command_id", "request_digest", "backend_id", "actor", "state", "verification_url", "user_code", "failure"]);
    requireModel(modelIdentifier(login.command_id) && modelHash(login.request_digest) && modelText(login.backend_id) && modelText(login.actor) &&
      ["starting", "waiting-for-operator", "cancel-requested", "connected", "cancelled", "failed", "interrupted"].includes(String(login.state)) &&
      (login.user_code === null || modelText(login.user_code, 128)) && (login.failure === null || modelText(login.failure)));
    if (login.verification_url !== null) {
      requireModel(modelText(login.verification_url, 2048));
      const url = new URL(login.verification_url); requireModel(url.protocol === "https:" && !url.username && !url.password);
    }
  }
  if (row.failure !== null) { const failure = modelExact(row.failure, ["code", "retryable"]); requireModel(modelText(failure.code) && typeof failure.retryable === "boolean"); }
  const operation = value as ModelRuntimeOperation;
  if (operation.state === "completed") {
    if (request.action.startsWith("account.")) requireModel(operation.account_login?.state === "connected");
    else requireModel(operation.owner_receipt && operation.applied_configuration &&
      operation.owner_receipt.revision === operation.applied_configuration.revision && operation.owner_receipt.configuration_digest === operation.applied_configuration.digest);
  }
  if (operation.state === "cancelled" && operation.account_login) requireModel(operation.account_login.state === "cancelled");
  return operation;
}
