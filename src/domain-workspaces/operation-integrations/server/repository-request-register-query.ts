import { ownerQueryFetch } from "../../../console-integration/server/owner-query-fetch.ts";
import { scanRegisterPage } from "../../../console-integration/server/scan-register-page.ts";
import { listProposalRegister, ProposalOosError } from "../../proposal/server/proposal-oos-client.ts";
import type { ProposalLiveRecord } from "../../proposal/live-runtime/proposal-live-types.ts";
import { projectCanonicalRepositoryGateRequests, repositoryRequestState } from "../proposal-repository-live-projection.ts";

export async function readRepositoryRequestRegister(query: URLSearchParams, signal?: AbortSignal,
  options: { readSource?: (cursor: string | null, search: string) => Promise<{ records: ProposalLiveRecord[]; page: { next_cursor: string | null } }> } = {}) {
  const selection = { query: (query.get("q") ?? "").trim().toLowerCase(), status: query.get("status") ?? "attention" };
  if ([...query.keys()].some(key => !["q", "status", "cursor"].includes(key) || query.getAll(key).length !== 1) ||
    selection.query.length > 128 || !["attention", "repository", "confirmation", "resolved", "all"].includes(selection.status)) {
    throw new ProposalOosError("Select a valid repository request search and page.", "repository_request_query_invalid", 400);
  }
  const owner = ownerQueryFetch(signal);
  const readSource = options.readSource ?? ((cursor, search) => listProposalRegister({ query: search, status: "all", ingress: "all" }, cursor, { fetchImpl: owner.fetchImpl }));
  const project = (records: ProposalLiveRecord[]) => projectCanonicalRepositoryGateRequests({ mode: "live", status: "current", error: null, observedAt: new Date().toISOString(), records });
  const page = await scanRegisterPage<ProposalLiveRecord>({ signal: owner.signal, selection, cursor: query.get("cursor"),
    identity: row => row.projection.proposal_id,
    readPage: async cursor => { const source = await readSource(cursor, selection.query); return { records: source.records, next_cursor: source.page.next_cursor }; },
    matches: row => project([row]).some(request => selection.status === "all" || (selection.status === "attention" ? repositoryRequestState(request) !== "resolved" : repositoryRequestState(request) === selection.status)),
  });
  return { mode: "live", status: "current", error: null, records: project(page.records), page: { selection, next_cursor: page.next_cursor, total: null } };
}
