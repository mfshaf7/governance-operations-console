type HealthBinding = { revision: number; digest: string; configuration: { backends: Record<string, unknown>; models: Record<string, unknown> } };

type State = "available" | "unavailable" | "verification-needed" | "unknown";
type Observation = { state: State; code: string };
export type ProviderHealth = {
  configuration_revision: number; configuration_digest: string; checked_at: string; expires_at: string;
  backends: Array<Observation & { backend_id: string }>;
  models: Array<Observation & { model_id: string; observed_runtime_version: string | null; observed_model_digest: string | null;
    last_success?: { kind: "verification" | "request"; at: string; reference: string } | null }>;
};
const codes = ["connection-not-probed", "check-budget-exhausted", "metadata-available", "account-sign-in-required",
  "account-present-connection-unprobed", "provider-metadata-invalid", "provider-unavailable", "provider-busy",
  "model-not-advertised", "registration-changed", "metadata-matched", "connection-verified",
  "last-request-failed", "recent-model-success", "model-verification-required"];
function exact(value: unknown, fields: string[]): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join() === [...fields].sort().join();
}
function nullableText(value: unknown, max: number) { return value === null || typeof value === "string" && value.length > 0 && value.length <= max; }
export function readProviderHealth(value: unknown, snapshot: HealthBinding, now = Date.now()): ProviderHealth | null {
  if (!exact(value, ["configuration_revision", "configuration_digest", "checked_at", "expires_at", "backends", "models"]) ||
    value.configuration_revision !== snapshot.revision || value.configuration_digest !== snapshot.digest ||
    typeof value.checked_at !== "string" || typeof value.expires_at !== "string") return null;
  const start = Date.parse(value.checked_at), end = Date.parse(value.expires_at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > now || end <= now || end <= start || end - start > 120_000) return null;
  for (const [rows, field, known, limit] of [[value.backends, "backend_id", snapshot.configuration.backends, 32],
    [value.models, "model_id", snapshot.configuration.models, 256]] as const) {
    if (!Array.isArray(rows) || rows.length > limit) return null;
    const seen = new Set();
    for (const row of rows) {
      if (!exact(row, [field, "state", "code", ...(field === "model_id" ? ["observed_runtime_version", "observed_model_digest", ...(Object.hasOwn(row ?? {}, "last_success") ? ["last_success"] : [])] : [])]) ||
        typeof row[field] !== "string" || !Object.hasOwn(known, row[field] as string) || seen.has(row[field]) ||
        !["available", "unavailable", "verification-needed", "unknown"].includes(String(row.state)) || !codes.includes(String(row.code))) return null;
      if (field === "model_id" && (!nullableText(row.observed_runtime_version, 2048) || !nullableText(row.observed_model_digest, 200))) return null;
      if (field === "model_id" && row.last_success != null) {
        const success = row.last_success;
        if (!exact(success, ["kind", "at", "reference"]) || !["verification", "request"].includes(String(success.kind)) ||
            typeof success.at !== "string" || success.at.length > 64 || !Number.isFinite(Date.parse(success.at)) || Date.parse(success.at) < 0 || Date.parse(success.at) > start ||
            typeof success.reference !== "string" || !/^(sha256:|ai-routing-selection:)[0-9a-f]{64}$/.test(success.reference)) return null;
      }
      if ((row.code === "connection-verified" && (field !== "backend_id" || row.state !== "available")) ||
          (row.code === "recent-model-success" && (field !== "model_id" || row.state !== "available" || !row.last_success || start - Date.parse((row.last_success as { at: string }).at) > 900000)) ||
          (["last-request-failed", "model-verification-required"].includes(String(row.code)) && (field !== "model_id" || row.state !== "verification-needed"))) return null;
      seen.add(row[field]);
    }
  }
  return value as unknown as ProviderHealth;
}
export function currentProviderHealth(registry: { configuration: HealthBinding; health?: ProviderHealth | null }) {
  return readProviderHealth(registry.health, registry.configuration);
}
export function providerHealthLabel(observation?: Observation & { last_success?: { at: string } | null }) {
  if (!observation) return "Health unknown";
  if (observation.code === "account-sign-in-required") return "Account sign-in required";
  if (observation.code === "account-present-connection-unprobed") return "Verification needed";
  if (observation.code === "connection-verified") return "Connection verified";
  if (observation.code === "recent-model-success") return observation.last_success && Date.now() - Date.parse(observation.last_success.at) <= 900_000 ? "Recent model success" : "Verification needed";
  if (observation.code === "last-request-failed") return "Last attempt failed; verify again";
  return ({ available: "Metadata current", unavailable: "Unavailable", "verification-needed": "Verification needed", unknown: "Health unknown" })[observation.state];
}
