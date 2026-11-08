"use client";

import { TerasEmptyState, TerasRegisterPagination, TerasLoadingState, TerasActionButton, TerasContentTray, TerasList, TerasSignalItem } from "@/teras";
import { registryRequestStatus, registryTimestamp } from "./workspace-registry-copy";
import type { InventoryRequestJournalRuntime } from "../live-runtime/use-inventory-request-journal";

export function WorkspaceRegistryRequestJournal({ journal, disabled, onReopen }: {
  journal: InventoryRequestJournalRuntime; disabled: boolean; onReopen: (requestId: string) => void;
}) {
  return <TerasContentTray kicker="Request history"
    description={journal.error ?? (journal.pending ? "Reading request history…"
      : journal.page ? journal.page.pending_request_count ? `${journal.page.pending_request_count} pending. Open the original request before starting another.` : journal.page.records.length ? "Open a request to inspect its recorded progress." : "No previous requests for this item."
      : "History must be available before a new request.")}
    >
    {journal.error ? <TerasEmptyState><TerasActionButton emphasis="secondary" disabled={disabled || journal.pending} onClick={() => void journal.refresh()}>Retry request history</TerasActionButton></TerasEmptyState> : null}
    {journal.pending ? <TerasLoadingState inline={!!journal.page} label="Loading request history…" /> : null}
    {!journal.error && journal.page?.records.length ? <TerasList frame="contained" scrollHeight="short">
      {journal.page.records.map(entry => <TerasSignalItem key={entry.request_id} label={entry.action ? ({ update: "Metadata update", suspend: "Suspension", restore: "Restoration", retire: "Retirement" } as Record<string, string>)[entry.action] ?? entry.action : "Promotion"}
        title={registryRequestStatus(entry.status)} detail={registryTimestamp(entry.updated_at)} tone="info"
        {...(disabled || journal.pending ? { statusLabel: "Wait for current read" } : {
          ariaLabel: `Reopen original request ${entry.request_id}`, actionLabel: "Open request",
          onSelect: () => onReopen(entry.request_id),
        })} />)}
    </TerasList> : null}
    {!journal.error && journal.page && (journal.page.records.length > 0 || journal.hasPrevious || journal.page.next_cursor) ? <TerasRegisterPagination label="Inventory request history" offset={journal.offset} count={journal.page?.records.length ?? 0} page={journal.pageNumber}
      pending={journal.pending} unavailable={Boolean(journal.error)} hasPrevious={!disabled && journal.hasPrevious} hasNext={!disabled && Boolean(journal.page?.next_cursor)}
      onPrevious={()=>void journal.back()} onNext={()=>void journal.next()} /> : null}
  </TerasContentTray>;
}
