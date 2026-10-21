"use client";

import { TerasActionButton, TerasActionRow, TerasContentTray, TerasList, TerasSignalItem } from "@/teras";
import type { InventoryRequestJournalRuntime } from "../live-runtime/use-inventory-request-journal";

export function WorkspaceRegistryRequestJournal({ journal, disabled, onReopen }: {
  journal: InventoryRequestJournalRuntime; disabled: boolean; onReopen: (requestId: string) => void;
}) {
  return <TerasContentTray kicker="Original Inventory requests"
    description={journal.error ?? (journal.pending ? "Reading the OOS journal; unavailable data never means no pending requests."
      : journal.page ? `${journal.page.pending_request_count} pending request(s) across all pages. Reopening only reads the original request; it does not prepare or advance it.`
      : "Read the original journal before a new review.")}
    actions={<TerasActionRow>
      <TerasActionButton emphasis="secondary" disabled={disabled || journal.pending} onClick={() => void journal.load()}>Refresh original requests</TerasActionButton>
      {journal.page?.next_cursor ? <TerasActionButton emphasis="secondary" disabled={disabled || journal.pending}
        onClick={() => void journal.load(journal.page!.next_cursor!)}>More original requests</TerasActionButton> : null}
    </TerasActionRow>}>
    {journal.page?.records.length ? <TerasList frame="contained" scrollHeight="short">
      {journal.page.records.map(entry => <TerasSignalItem key={entry.request_id} label={entry.request_id}
        title={`${entry.action ? `${entry.action} / ` : ""}${entry.status}`} detail={entry.updated_at} tone="info"
        {...(disabled || journal.pending ? { statusLabel: "Wait for current read" } : {
          ariaLabel: `Reopen original request ${entry.request_id}`, actionLabel: "Reopen original request",
          onSelect: () => onReopen(entry.request_id),
        })} />)}
    </TerasList> : null}
  </TerasContentTray>;
}
