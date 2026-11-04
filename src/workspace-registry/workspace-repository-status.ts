export type RepositoryRegistrationStatus = {
  record_id: string; version: number; record_digest: string;
  phase: "intake" | "inventory"; status: "out-of-scope" | "proposed" | "admitted" | "active" | "suspended" | "retired";
  provider_repository: { provider: "github"; provider_repository_id: string; full_name: string };
};
export type RepositoryRegistrationLookup = { mode: "current"; instanceId: string; recordIds: string[]; records: RepositoryRegistrationStatus[] }
  | { mode: "not-configured" };
export function mergeRepositoryRegistrationLookups(current: RepositoryRegistrationLookup | null, next: RepositoryRegistrationLookup): RepositoryRegistrationLookup {
  if (current === null) return next;
  if (current.mode !== next.mode) throw new Error("Repository registration configuration changed during the read.");
  if (current.mode === "current" && next.mode === "current") {
    if (current.instanceId !== next.instanceId || next.recordIds.some(id => current.recordIds.includes(id))) throw new Error("Repository registration changed installation or overlapped its selection.");
    return { ...current, recordIds: [...current.recordIds, ...next.recordIds], records: [...current.records, ...next.records] };
  }
  return next;
}
export async function readRepositoryRegistrationLookups(names: readonly string[], options: { fetchImpl?: typeof fetch; signal?: AbortSignal } = {}): Promise<RepositoryRegistrationLookup> {
  const targets = [...new Set(names)].sort();
  let value: RepositoryRegistrationLookup | null = null;
  for (let index = 0; index < targets.length; index += 25) {
    options.signal?.throwIfAborted();
    const page = repositoryStatusNames(targets.slice(index, index + 25)), query = new URLSearchParams(page.map(name => ["name", name]));
    const response = await (options.fetchImpl ?? fetch)(`/api/workspace-registry/repository-status?${query}`, { cache: "no-store",
      signal: options.signal ? AbortSignal.any([AbortSignal.timeout(15000), options.signal]) : AbortSignal.timeout(15000) });
    if (!response.ok) throw invalid();
    const raw = await response.text(); if (raw.length > 65536) throw invalid();
    value = mergeRepositoryRegistrationLookups(value, assertRepositoryRegistrationLookup(JSON.parse(raw), page));
  }
  return value ?? { mode: "not-configured" };
}
const object = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === "object" && !Array.isArray(v));
const exact = (v: unknown, keys: string[]): v is Record<string, unknown> => object(v) && Object.keys(v).sort().join(",") === [...keys].sort().join(",");
const hash = (v: unknown) => typeof v === "string" && /^sha256:[0-9a-f]{64}$/.test(v);
const invalid = () => new Error("Current repository registration status is unavailable or does not bind its exact selection.");
export function repositoryStatusNames(names: unknown): string[] {
  if (!Array.isArray(names) || names.length < 1 || names.length > 25 || names.some(name => typeof name !== "string" || !/^[a-z0-9][a-z0-9._-]{0,185}$/.test(name)) ||
      [...new Set(names)].sort().join("\0") !== names.join("\0")) throw invalid();
  return names;
}
export function assertRepositoryRegistrationLookup(value: unknown, names: string[]): RepositoryRegistrationLookup {
  repositoryStatusNames(names);
  if (exact(value, ["schema_version", "mode", "projected_at"]) && value.schema_version === 1 && value.mode === "not-configured" && typeof value.projected_at === "string" && Number.isFinite(Date.parse(value.projected_at))) return { mode: "not-configured" };
  if (!exact(value, ["schema_version", "mode", "authority", "record_ids", "records", "projected_at", "projection_digest"]) || value.schema_version !== 1 || value.mode !== "current" ||
      !exact(value.authority, ["kind", "instance_id"]) || value.authority.kind !== "internal-instance-record" || typeof value.authority.instance_id !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value.authority.instance_id) || !Array.isArray(value.record_ids) ||
      value.record_ids.join("\0") !== names.map(name => `repo:${name}`).join("\0") || !Array.isArray(value.records) || value.records.length > names.length ||
      typeof value.projected_at !== "string" || !Number.isFinite(Date.parse(value.projected_at)) || !hash(value.projection_digest)) throw invalid();
  let previous = "";
  for (const row of value.records) {
    if (!exact(row, ["record_id", "version", "record_digest", "phase", "status", "provider_repository"]) || typeof row.record_id !== "string" ||
        !value.record_ids.includes(row.record_id) || row.record_id <= previous || !Number.isSafeInteger(row.version) || Number(row.version) < 1 || !hash(row.record_digest) ||
        !(row.phase === "intake" ? ["out-of-scope", "proposed", "admitted"] : row.phase === "inventory" ? ["active", "suspended", "retired"] : []).includes(String(row.status)) ||
        !exact(row.provider_repository, ["provider", "provider_repository_id", "full_name"]) || row.provider_repository.provider !== "github" ||
        typeof row.provider_repository.provider_repository_id !== "string" || !/^[1-9][0-9]*$/.test(row.provider_repository.provider_repository_id) ||
        typeof row.provider_repository.full_name !== "string" || !/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(row.provider_repository.full_name)) throw invalid();
    previous = row.record_id;
  }
  return { mode: "current", instanceId: value.authority.instance_id, recordIds: value.record_ids as string[], records: value.records as RepositoryRegistrationStatus[] };
}
