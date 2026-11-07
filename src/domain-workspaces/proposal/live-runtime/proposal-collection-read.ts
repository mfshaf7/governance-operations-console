import { assertProposalLiveSnapshot } from "./proposal-live-contract.ts";
import type { ProposalLiveRecord, ProposalLiveSnapshot } from "./proposal-live-types.ts";

// Collection consumers need continuation; the visible register still reads one
// page. Summaries never load every record's journal or authorize a command.
const collectionByteBudget = 2_097_152;
export function proposalCollectionComplete(snapshot: ProposalLiveSnapshot | null) {
  if (!snapshot || snapshot.status !== "current") return false;
  if (snapshot.coverage) return snapshot.coverage.complete;
  return !snapshot.page || !snapshot.page.next_cursor && snapshot.page.source_total === snapshot.records.length;
}

export async function readProposalCollection(fetchImpl: typeof fetch = fetch, options: {
  signal?: AbortSignal; onProgress?: (snapshot: ProposalLiveSnapshot) => void;
} = {}): Promise<ProposalLiveSnapshot> {
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(80_000)]) : AbortSignal.timeout(80_000);
  const rows: ProposalLiveRecord[] = [], ids = new Set<string>(), cursors = new Set<string>();
  let cursor: string | null = null, total: number | null = null, first: ProposalLiveSnapshot | null = null, bytes = 0;
  const projection = (complete: boolean, detail: string | null): ProposalLiveSnapshot => ({
    mode: "live", status: "current", error: null, observedAt: first!.observedAt, records: [...rows],
    coverage: { complete, loaded: rows.length, total: total!, next_cursor: cursor, detail },
  });
  while (true) {
    let response: Response;
    try {
      response = await fetchImpl(`/api/proposals${cursor ? `?${new URLSearchParams({cursor})}` : ""}`, {cache:"no-store",signal});
    } catch (error) {
      if (!first) throw error;
      return projection(false, "The remaining proposals could not be read. Counts and required moves are incomplete; refresh to retry.");
    }
    if (!response.ok) {
      if (first && ![401,403,409].includes(response.status)) return projection(false, "The remaining proposals could not be read. Counts and required moves are incomplete; refresh to retry.");
      throw Object.assign(new Error("Proposal collection could not be confirmed. Refresh its source before continuing."), {status:response.status});
    }
    const page = assertProposalLiveSnapshot(await response.json());
    if (page.mode !== "live" || page.status !== "current") return page;
    if (!page.page) {
      if (cursor) throw new Error("Proposal continuation lost its page metadata.");
      return page;
    }
    if(page.records.some(row=>row.projection.projection_state!=="current" || row.selectedOnly))throw Error("Proposal source rows are not current collection summaries.");
    const selected = page.page.selector;
    if (selected.query !== "" || selected.status !== "all" || selected.ingress !== "all" || page.records.length > 25 ||
        total !== null && total !== page.page.source_total || rows.length+page.records.length>page.page.source_total ||
        new Set(page.records.map(row=>row.projection.proposal_id)).size !== page.records.length || page.records.some(row=>ids.has(row.projection.proposal_id)) ||
        page.page.next_cursor !== null && (page.page.next_cursor === cursor || cursors.has(page.page.next_cursor))) {
      throw new Error("The Proposal collection changed or its continuation is invalid. Refresh from the first page.");
    }
    first ??= page; total = page.page.source_total;
    const pageBytes = new TextEncoder().encode(JSON.stringify(page.records)).byteLength;
    if (bytes + pageBytes > collectionByteBudget) return projection(false, "This overview reached its read budget. Coverage is incomplete; use Proposal search to inspect other records.");
    bytes += pageBytes;
    for (const row of page.records) { ids.add(row.projection.proposal_id); rows.push(row); }
    cursor = page.page.next_cursor;
    if (cursor) cursors.add(cursor);
    if (!cursor) {
      if (rows.length !== total) throw new Error("The Proposal collection does not cover the reported backlog. Refresh its source.");
      return projection(true, null);
    }
    options.onProgress?.(projection(false, "Reading remaining Proposal pages…"));
  }
}
