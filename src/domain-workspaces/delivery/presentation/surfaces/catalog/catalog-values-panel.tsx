"use client";
import { useState } from "react";
import { deliveryFieldDisplayLabel } from "../../../read-model/terms/copy.ts";
import type { DeliveryCatalogItem, DeliveryCatalogValue } from "../../../read-model/index.ts";
import { TerasActionButton, TerasEmptyState, TerasFilterBar, TerasRegisterPanel, TerasRegisterPagination, TerasLoadingState, useRegisterPage } from "@/teras";
import { CatalogValuesTable } from "./catalog-current-values.tsx";
import { catalogPrimaryMutationActionLabel, catalogPrimaryMutationDisabledReason } from "./catalog-view-model.ts";
export function CatalogValuesPanel({ activeCatalog, canEdit, canMutate, canRetire, catalogValues, emptyMessage, loading, onRetry, recoveryRequired,
  onAdd, onManageMembers, onEdit, onRetire, onSearchChange, onSelect, search, selectedValue, visibleValues }: {
  activeCatalog: DeliveryCatalogItem | null; canEdit: (value: DeliveryCatalogValue) => boolean; canMutate: boolean;
  canRetire: (value: DeliveryCatalogValue) => boolean; catalogValues: DeliveryCatalogValue[]; emptyMessage?: string;
  loading: boolean; recoveryRequired: boolean; onRetry: () => Promise<unknown>; onAdd: () => void; onEdit: (value: DeliveryCatalogValue) => void;
  onManageMembers?: () => void;
  onRetire: (value: DeliveryCatalogValue) => void; onSearchChange: (value: string) => void;
  onSelect: (value: DeliveryCatalogValue) => void; search: string; selectedValue: DeliveryCatalogValue | null; visibleValues: DeliveryCatalogValue[];
}) {
  const [filter, setFilter] = useState("all"), [retrying, setRetrying] = useState(false);
  const filtered = visibleValues.filter(value => filter === "all" || (filter === "retired" ? value.lifecycle_state === "retired" : ["active", "admitted", "read_only"].includes(value.lifecycle_state)));
  const page = useRegisterPage(filtered, JSON.stringify([activeCatalog?.catalog_item_id, search, filter]), "Delivery Catalog values");
  const unavailable = Boolean(emptyMessage);
  const retry = async () => { setRetrying(true); try { await onRetry(); } catch {} finally { setRetrying(false); } };
  return <TerasRegisterPanel kicker={deliveryFieldDisplayLabel(activeCatalog?.label ?? "Catalog")} title="Catalog Values" density="normal"
    description={activeCatalog?.description ?? "Choose a catalog to inspect its values."}
    filterBar={loading || unavailable ? null : <TerasFilterBar
      action={activeCatalog?.catalog_item_id === "catalog-principal-lookup" && onManageMembers ? <TerasActionButton emphasis="primary" onClick={onManageMembers}>Manage Members</TerasActionButton> : activeCatalog?.console_capability === "read_only" || activeCatalog?.console_capability === "owner_routed" ? undefined :
        <TerasActionButton disabled={!canMutate} onClick={onAdd} title={canMutate ? undefined : catalogPrimaryMutationDisabledReason(activeCatalog)} emphasis="primary">{catalogPrimaryMutationActionLabel(activeCatalog)}</TerasActionButton>}
      filters={[{label:"Value status", value:filter, onValueChange:setFilter, options:[{label:"All values",value:"all"},{label:"Available values",value:"available"},{label:"Retired values",value:"retired"}]}]}
      search={{ariaLabel:"Search catalog values", onValueChange:onSearchChange, placeholder:"Search values...", value:search}} />}
    footer={!loading && !unavailable && filtered.length > 0 ? <TerasRegisterPagination label="Delivery Catalog values" offset={page.offset} count={page.rows.length} total={filtered.length} page={page.page} hasPrevious={page.hasPrevious} hasNext={page.hasNext} onPrevious={page.previous} onNext={page.next} /> : undefined}>
    {loading || retrying ? <TerasLoadingState fill label="Loading Catalog values…" /> : unavailable ? <TerasEmptyState fill>{emptyMessage}<TerasActionButton emphasis="primary" onClick={() => void retry()}>{recoveryRequired ? "Recover pending change" : "Retry loading"}</TerasActionButton></TerasEmptyState> : page.rows.length ?
      <CatalogValuesTable activeCatalog={activeCatalog} canEdit={canEdit} canRetire={canRetire} catalogValues={catalogValues} onEdit={onEdit} onRetire={onRetire} onSelect={onSelect} rows={page.rows} selectedRowId={selectedValue?.catalog_value_id ?? null} /> :
      <TerasEmptyState fill>{search || filter !== "all" ? "No values match these filters." : "No values yet. Add a value to make it available in Delivery."}</TerasEmptyState>}
  </TerasRegisterPanel>;
}
