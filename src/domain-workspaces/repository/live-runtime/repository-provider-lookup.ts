export type RepositoryProviderLookup = Readonly<{
  schema_version: 1; provider: "github"; provider_host: "github.com"; provider_repository_id: string;
  owner: string; name: string; canonical_url: string; visibility: "private" | "internal" | "public";
  provider_lifecycle_state: "active" | "archived"; observed_at: string;
}>;
export function repositoryCoordinatesFromUrl(value: string) {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("Enter a GitHub repository URL, such as https://github.com/organization/repository."); }
  const parts = url.pathname.replace(/\/$/, "").split("/").filter(Boolean);
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port || url.username || url.password || url.search || url.hash || parts.length !== 2 ||
      !parts.every(part => /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(part))) {
    throw new Error("Use the GitHub repository root URL, without a branch, file, query or fragment.");
  }
  return {owner: parts[0], name: parts[1].replace(/\.git$/i, "")};
}
export function assertRepositoryProviderLookup(value: unknown): RepositoryProviderLookup {
  if (!value || typeof value !== "object") throw new Error("Repository lookup is unavailable.");
  const row = value as Record<string, unknown>;
  if (row.schema_version !== 1 || row.provider !== "github" || row.provider_host !== "github.com" ||
      typeof row.provider_repository_id !== "string" || !/^[1-9][0-9]*$/.test(row.provider_repository_id) ||
      typeof row.owner !== "string" || typeof row.name !== "string" ||
      ![row.owner,row.name].every(part => /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(part)) ||
      row.canonical_url !== `https://github.com/${row.owner}/${row.name}` ||
      !["private","internal","public"].includes(String(row.visibility)) || !["active","archived"].includes(String(row.provider_lifecycle_state)) ||
      typeof row.observed_at !== "string" || !Number.isFinite(Date.parse(row.observed_at))) throw new Error("Repository lookup returned an invalid provider identity.");
  return {schema_version:1,provider:"github",provider_host:"github.com",provider_repository_id:row.provider_repository_id,
    owner:row.owner,name:row.name,canonical_url:String(row.canonical_url),visibility:row.visibility as RepositoryProviderLookup["visibility"],
    provider_lifecycle_state:row.provider_lifecycle_state as RepositoryProviderLookup["provider_lifecycle_state"],observed_at:row.observed_at};
}
