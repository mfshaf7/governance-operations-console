type HealthBinding = { revision: number; digest: string; configuration: { backends: Record<string, unknown>; models: Record<string, unknown> } };

type State = "available" | "unavailable" | "verification-needed" | "unknown";
type Observation = { state: State; code: string };
export type ProviderHealth = {
  configuration_revision: number; configuration_digest: string; checked_at: string; expires_at: string;
  backends: Array<Observation & { backend_id: string }>;
  models: Array<Observation & { model_id: string; observed_runtime_version: string | null; observed_model_digest: string | null }>;
};
const codes = ["connection-not-probed", "check-budget-exhausted", "metadata-available", "account-sign-in-required",
  "account-present-connection-unprobed", "provider-metadata-invalid", "provider-unavailable", "provider-busy",
  "model-not-advertised", "registration-changed", "metadata-matched"];
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
      if (!exact(row, [field, "state", "code", ...(field === "model_id" ? ["observed_runtime_version", "observed_model_digest"] : [])]) ||
        typeof row[field] !== "string" || !Object.hasOwn(known, row[field] as string) || seen.has(row[field]) ||
        !["available", "unavailable", "verification-needed", "unknown"].includes(String(row.state)) || !codes.includes(String(row.code))) return null;
      if (field === "model_id" && (!nullableText(row.observed_runtime_version, 2048) || !nullableText(row.observed_model_digest, 200))) return null;
      seen.add(row[field]);
    }
  }
  return value as unknown as ProviderHealth;
}
export function currentProviderHealth(registry: { configuration: HealthBinding; health?: ProviderHealth | null }) {
  return readProviderHealth(registry.health, registry.configuration);
}
export function providerHealthLabel(observation?: Observation) {
  if (!observation) return "Health unknown";
  if (observation.code === "account-sign-in-required") return "Account sign-in required";
  if (observation.code === "account-present-connection-unprobed") return "Account present; connection unprobed";
  return ({ available: "Metadata current", unavailable: "Unavailable", "verification-needed": "Verification needed", unknown: "Health unknown" })[observation.state];
}
