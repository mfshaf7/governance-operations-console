import type { RepositoryCustodyArtifactRef } from "./repository-custody-live-types.ts";

export type RepositoryConnection = Readonly<{
  id: string; account: string; account_id: string; account_type: "personal" | "organization";
  capabilities: Readonly<Record<"metadata" | "provisioning" | "lifecycle", boolean>>;
  credential_bindings: Readonly<Partial<Record<"metadata" | "provisioning" | "lifecycle", RepositoryCustodyArtifactRef>>>;
}>;
export type RepositoryConnections = Readonly<{
  schema_version: 1; default_connection_id: string | null; connections: readonly RepositoryConnection[];
}>;

export function assertRepositoryConnections(input: unknown): RepositoryConnections {
  const value = input as RepositoryConnections;
  if (!value || value.schema_version !== 1 || !Array.isArray(value.connections) || value.connections.length > 32 ||
      ![null, ...value.connections.map(item => item?.id)].includes(value.default_connection_id)) throw new Error("GitHub connections could not be verified.");
  const accounts = new Set();
  for (const item of value.connections) {
    if (!item || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(item.account) || item.id !== `github:${item.account.toLowerCase()}` ||
        !/^[1-9][0-9]*$/.test(item.account_id) || !["personal", "organization"].includes(item.account_type) || accounts.has(item.id) ||
        !item.capabilities || !item.credential_bindings) throw new Error("GitHub connection identity could not be verified.");
    accounts.add(item.id);
    for (const role of ["metadata", "provisioning", "lifecycle"] as const) {
      const ref = item.credential_bindings[role];
      if (typeof item.capabilities[role] !== "boolean" || item.capabilities[role] &&
          (!ref || typeof ref.uri !== "string" || !/^[a-z][a-z0-9+.-]*:\/\/[A-Za-z0-9/._:-]+$/.test(ref.uri) || !/^sha256:[a-f0-9]{64}$/.test(ref.digest))) {
        throw new Error("GitHub connection permissions could not be verified.");
      }
    }
  }
  return value;
}

export function repositoryDefaultDestination(value: RepositoryConnections): RepositoryConnection | null {
  const eligible = value.connections.filter(item => item.capabilities.provisioning);
  return eligible.length === 1 ? eligible[0] : eligible.find(item => item.id === value.default_connection_id) ?? null;
}
