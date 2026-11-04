import type { OperationOwnerRepoCatalogOption } from "../domain-workspaces/operation-contracts/owner-repository.ts";
import type { WorkspaceRegistryRecord, WorkspaceRegistrySnapshot } from "./model/workspace-registry-types.ts";
import { assertWorkspaceRegistrySnapshot } from "./workspace-registry-contract.ts";
import type { RepositoryRegistrationLookup } from "./workspace-repository-status.ts";

function option(record: WorkspaceRegistryRecord): OperationOwnerRepoCatalogOption {
  return { admissionState: "admitted", description: "Active registered repository", id: record.id,
    label: record.name, owner: record.owner_refs.join(", "), repoRef: `repo://${record.name}`,
    routeSource: record.authority_kind === "internal-instance-record" ? "Internal registration" : "Workspace Inventory", valueKey: record.name };
}
export function repositoryRegistryCatalogOptions(snapshot: WorkspaceRegistrySnapshot, query = "") {
  return snapshot.records.filter(record => record.kind === "repo" && record.posture === "active" && record.name.includes(query))
    .map(option).sort((left, right) => left.valueKey < right.valueKey ? -1 : left.valueKey > right.valueKey ? 1 : 0);
}
export function repositoryCurrentCatalogOption(snapshot: WorkspaceRegistrySnapshot | null, name: string | undefined, lookup: RepositoryRegistrationLookup | null) {
  if (!snapshot || !name || !lookup) return null;
  if ((lookup.mode === "current") !== (snapshot.workflow_id === "workspace-registry-view")) return null;
  const legacy = snapshot.workflow_id === "workspace-registry-view" ? snapshot.legacy_snapshot : snapshot;
  const old = legacy.records.find(record => record.kind === "repo" && record.name === name);
  if (lookup.mode === "current") {
    if (!lookup.recordIds.includes(`repo:${name}`)) return null;
    if (snapshot.workflow_id === "workspace-registry-view" && snapshot.instance_page.authority.instance_id !== lookup.instanceId) return null;
    const current = lookup.records.find(record => record.record_id === `repo:${name}`);
    if (current) {
      if (old || current.phase !== "inventory" || current.status !== "active") return null;
      return { admissionState: "admitted", description: "Active registered repository", id: current.record_id,
        label: name, owner: current.record_id, repoRef: `repo://${name}`, routeSource: "Internal registration", valueKey: name };
    }
  }
  return old?.posture === "active" ? option(old) : null;
}
export async function readRepositoryCatalogChoices(query: string, { signal, fetchImpl = fetch }: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {}) {
  if (query.length > 128 || query !== query.trim().toLowerCase()) throw new Error("Search using a bounded repository name.");
  const response = await fetchImpl(`/api/workspace-registry?${new URLSearchParams({ scope: "inventory", query })}`, {
    cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Current registered repositories could not be read. Retry before selecting a repository.");
  const raw = await response.text();
  if (raw.length > 2_097_152) throw new Error("Repository choices exceeded the read budget.");
  const snapshot = assertWorkspaceRegistrySnapshot(JSON.parse(raw));
  if (snapshot.workflow_id === "workspace-registry-view" && (snapshot.instance_page.selection.scope !== "inventory" || snapshot.instance_page.selection.query !== query || snapshot.instance_page.after !== null)) throw new Error("Repository choices do not match the current search.");
  return { snapshot, options: repositoryRegistryCatalogOptions(snapshot, query), more: snapshot.workflow_id === "workspace-registry-view" && snapshot.instance_page.next_after !== null };
}
