import {TerasActionButton, TerasActionRow, TerasContentTray} from "@/teras";

export type RepositoryPageControl = {
  cursor: string | null; loadingMore: boolean; continuationError: string | null;
  loadMore: () => Promise<unknown>;
};
export function RepositoryPageControls({page, label = "records", compact = false}: {page?: RepositoryPageControl; label?: string; compact?: boolean}) {
  if (!page || !page.cursor && !page.continuationError) return null;
  if (compact) return <TerasActionButton emphasis="secondary" size="table-compact" busy={page.loadingMore}
    title={page.continuationError ?? `Load the next page of ${label}`} onClick={() => void page.loadMore()}>
    {page.continuationError ? `Retry loading ${label}` : `Load more ${label}`}</TerasActionButton>;
  return <TerasContentTray description={page.continuationError ?? `More ${label} are available. The list and filters currently cover loaded records.`}>
    <TerasActionRow><TerasActionButton emphasis="secondary" busy={page.loadingMore}
      onClick={() => void page.loadMore()}>{page.continuationError ? `Retry loading ${label}` : `Load more ${label}`}</TerasActionButton></TerasActionRow>
  </TerasContentTray>;
}
