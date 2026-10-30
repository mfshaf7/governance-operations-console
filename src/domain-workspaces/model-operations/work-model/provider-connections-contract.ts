import { modelExact, modelHash, modelIdentifier, modelInteger, ModelRuntimeContractError } from "./model-runtime-contract.ts";

export const providerPresets = {
  "claude-api": { label: "Claude API", origin: "https://api.anthropic.com" },
  "deepseek-api": { label: "DeepSeek API", origin: "https://api.deepseek.com" },
  "glm-api": { label: "GLM · Z.AI Standard API", origin: "https://api.z.ai" },
} as const;
export type ApiProvider = keyof typeof providerPresets;
export const experimentalQualification = "real-account-verification-pending" as const;
export const experimentalLabel = "Experimental — real-account testing pending";
type Maturity = { experimental: true; qualification: typeof experimentalQualification };
export type ProviderConnection = Maturity & {
  connection_id: string; provider: ApiProvider; name: string; state: "active" | "disconnected" | "removing";
  credential_generation: string | null; credential_present: boolean; pending_operation: string | null; updated_at: string;
};
export type ProviderConnections = { revision: number; presets: Array<Maturity & {
  provider: ApiProvider; label: string; endpoint_origin: string; catalogue_supported: boolean;
}>; connections: ProviderConnection[] };
export const connectionActions = ["connection.create", "connection.disconnect", "connection.reconnect", "connection.remove"] as const;
export type ConnectionAction = typeof connectionActions[number];
// This is the only recoverable command shape. It cannot contain an API key.
export type SafeConnectionCommand = { command_id: string; expected_revision: number;
  action: ConnectionAction | "connection.credentials"; input: { provider: ApiProvider; name: string } | { connection_id: string } };
export type ConnectionReceipt = { command_id: string; command_digest: string; actor: string; action: SafeConnectionCommand["action"];
  connection_id: string; previous_revision: number; revision: number; state_digest: string; receipt_digest: string };
export type ConnectionOperation = { command_id: string; command_digest: string; actor: string; action: SafeConnectionCommand["action"];
  connection_id: string; state: "pending" | "finished" | "cancelled"; receipt: ConnectionReceipt | null };
function requireConnection(value: unknown): asserts value { if (!value) throw new ModelRuntimeContractError("Provider-connection evidence is incomplete or conflicting."); }
export function isApiProvider(value: unknown): value is ApiProvider { return typeof value === "string" && Object.hasOwn(providerPresets, value); }
export function connectionIdentifier(value: unknown): value is string { return typeof value === "string" && /^api-[a-f0-9]{32}$/.test(value); }
function connectionName(value: unknown) { return typeof value === "string" && value.trim().length > 0 && value.length <= 100 && !/[\x00-\x1f\x7f]/.test(value); }
function maturity(row: Record<string, unknown>) { requireConnection(row.experimental === true && row.qualification === experimentalQualification); }
export function assertProviderConnections(value: unknown): ProviderConnections {
  const row = modelExact(value, ["revision", "presets", "connections"]);
  requireConnection(modelInteger(row.revision) && Array.isArray(row.presets) && row.presets.length === 3 && Array.isArray(row.connections) && row.connections.length <= 16);
  const seen = new Set();
  for (const value of row.presets as unknown[]) {
    const preset = modelExact(value, ["provider", "label", "endpoint_origin", "experimental", "qualification", "catalogue_supported"]);
    requireConnection(isApiProvider(preset.provider));
    const expected = providerPresets[preset.provider];
    requireConnection(!seen.has(preset.provider) && preset.label === expected.label && preset.endpoint_origin === expected.origin && preset.catalogue_supported === (preset.provider !== "glm-api"));
    maturity(preset); seen.add(preset.provider);
  }
  seen.clear();
  for (const value of row.connections as unknown[]) {
    const item = modelExact(value, ["connection_id", "provider", "name", "state", "credential_generation", "credential_present", "pending_operation", "updated_at", "experimental", "qualification"]);
    requireConnection(connectionIdentifier(item.connection_id) && !seen.has(item.connection_id) && isApiProvider(item.provider) && connectionName(item.name) &&
      ["active", "disconnected", "removing"].includes(String(item.state)) && (item.credential_generation === null || modelHash(item.credential_generation)) &&
      item.credential_present === (item.credential_generation !== null) && (item.pending_operation === null || modelIdentifier(item.pending_operation)) &&
      typeof item.updated_at === "string" && item.updated_at.length <= 64 && Number.isFinite(Date.parse(item.updated_at)));
    maturity(item); seen.add(item.connection_id);
  }
  return value as ProviderConnections;
}
export function assertSafeConnectionCommand(value: unknown): SafeConnectionCommand {
  const row = modelExact(value, ["command_id", "expected_revision", "action", "input"]);
  requireConnection(modelIdentifier(row.command_id) && modelInteger(row.expected_revision) && [...connectionActions, "connection.credentials"].includes(String(row.action)));
  if (row.action === "connection.create") {
    const input = modelExact(row.input, ["provider", "name"]); requireConnection(isApiProvider(input.provider) && connectionName(input.name));
  } else requireConnection(connectionIdentifier(modelExact(row.input, ["connection_id"]).connection_id));
  return value as SafeConnectionCommand;
}
export function safeCredentialCommand(value: unknown): SafeConnectionCommand {
  const row = modelExact(value, ["command_id", "expected_revision", "connection_id", "api_key"]);
  requireConnection(typeof row.api_key === "string" && row.api_key.length >= 8 && row.api_key.length <= 8192 && !/[^\x21-\x7e]/.test(row.api_key));
  return assertSafeConnectionCommand({ command_id: row.command_id, expected_revision: row.expected_revision, action: "connection.credentials", input: { connection_id: row.connection_id } });
}
export function assertConnectionReceipt(value: unknown): ConnectionReceipt {
  const row = modelExact(value, ["command_id", "command_digest", "actor", "action", "connection_id", "previous_revision", "revision", "state_digest", "receipt_digest"]);
  requireConnection(modelIdentifier(row.command_id) && modelIdentifier(row.actor) && [...connectionActions, "connection.credentials"].includes(String(row.action)) && connectionIdentifier(row.connection_id) &&
    modelInteger(row.previous_revision) && row.revision === row.previous_revision + 1 && modelHash(row.command_digest) && modelHash(row.state_digest) && modelHash(row.receipt_digest));
  return value as ConnectionReceipt;
}
export function assertConnectionOperation(value: unknown, commandId: string): ConnectionOperation {
  const row = modelExact(value, ["command_id", "command_digest", "actor", "action", "connection_id", "state", "receipt"]);
  requireConnection(row.command_id === commandId && modelIdentifier(row.actor) && modelHash(row.command_digest) && [...connectionActions, "connection.credentials"].includes(String(row.action)) &&
    connectionIdentifier(row.connection_id) && ["pending", "finished", "cancelled"].includes(String(row.state)));
  if (row.state === "finished") {
    const receipt = assertConnectionReceipt(row.receipt);
    requireConnection(receipt.command_id === commandId && receipt.command_digest === row.command_digest && receipt.actor === row.actor && receipt.action === row.action && receipt.connection_id === row.connection_id);
  } else requireConnection(row.receipt === null);
  return value as ConnectionOperation;
}
