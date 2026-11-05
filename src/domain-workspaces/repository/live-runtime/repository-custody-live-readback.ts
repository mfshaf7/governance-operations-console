import { assertRepositoryCustodyWorkflowResult } from "./repository-custody-live-contract.ts";
import type { RepositoryCustodyWorkflowResult } from "./repository-custody-live-types.ts";

export class RepositoryCustodyReadError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) { super(message); this.retryable = retryable; }
}
export type RepositoryCustodySelection = Readonly<{
  view?: "register" | "requests"; providerRepositoryId?: string; proposalId?: string;
}>;
export type RepositoryCustodyPage = Readonly<{
  records: RepositoryCustodyWorkflowResult[]; next_cursor: string | null;
}>;

// One bounded canonical page. Continuations are explicit rather than requiring
// complete request history before the workspace can open.
export async function readRepositoryCustodyRegister(fetchImpl: typeof fetch = fetch,
  {cursor = null, signal, ...selection}: RepositoryCustodySelection & {cursor?: string | null; signal?: AbortSignal} = {},
): Promise<RepositoryCustodyPage> {
  const query = new URLSearchParams();
  if (cursor) query.set("cursor", cursor);
  if (selection.view) query.set("view", selection.view);
  if (selection.providerRepositoryId) query.set("provider_repository_id", selection.providerRepositoryId);
  if (selection.proposalId) query.set("proposal_id", selection.proposalId);
  let response: Response;
  try {
    const deadline = AbortSignal.timeout(12_000);
    response = await fetchImpl(`/api/repositories/custody/requests${query.size ? `?${query}` : ""}`,
      {cache: "no-store", signal: signal ? AbortSignal.any([signal, deadline]) : deadline});
  } catch { throw new RepositoryCustodyReadError("Repository records could not be reached. Try loading them again.", true); }
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = value && typeof value === "object" ? value as {code?: string; retryable?: boolean} : null;
    throw new RepositoryCustodyReadError("Repository records are unavailable or invalid.",
      failure?.retryable === true || (!failure?.code && [408,429,502,503,504].includes(response.status)));
  }
  if (!value || typeof value !== "object" || !("mode" in value) || value.mode !== "live" ||
      !("status" in value) || value.status !== "current" || !("schema_version" in value) || value.schema_version !== 1 ||
      !("records" in value) || !Array.isArray(value.records) || value.records.length > 25 ||
      !("next_cursor" in value) || value.next_cursor !== null &&
      (typeof value.next_cursor !== "string" || !/^[a-f0-9]{64}$/.test(value.next_cursor))) {
    throw new RepositoryCustodyReadError("Repository records are unavailable or invalid.", false);
  }
  if (cursor && value.next_cursor === cursor) throw new RepositoryCustodyReadError("Repository pagination did not advance.", false);
  try {
    const records = value.records.map(assertRepositoryCustodyWorkflowResult);
    if (new Set(records.map(record => record.request.request_id)).size !== records.length) throw new Error();
    if (selection.view === "register" && (records.some(record => record.status !== "succeeded" || !record.provider_readback) ||
        new Set(records.map(record => record.provider_readback!.repository_identity.provider_repository_id)).size !== records.length)) throw new Error();
    if (selection.providerRepositoryId && records.some(record =>
      (record.provider_readback?.repository_identity.provider_repository_id ?? record.provider_operation.provider_repository_id ?? record.request.target.provider_repository_id) !== selection.providerRepositoryId)) throw new Error();
    if (selection.proposalId && records.some(record => record.request.correlation.correlation_id !== `repo-request://proposal/${selection.proposalId}`)) throw new Error();
    return {records, next_cursor: value.next_cursor as string | null};
  } catch { throw new RepositoryCustodyReadError("Repository records are unavailable or invalid.", false); }
}
