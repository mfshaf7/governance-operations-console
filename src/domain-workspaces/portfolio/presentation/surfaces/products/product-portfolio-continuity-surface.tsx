"use client";

import {useWorkspaceProductsPage} from "../../../../../workspace-continuity/live-runtime/use-workspace-products-page.ts";
import { useEffect, useMemo, useState } from "react";

import {
  TerasActionButton,
  TerasContentRegion,
  TerasEmptyState,
  TerasLoadingState,
  TerasFilterBar,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
  TerasRecordCellText,
  TerasRecordControlLayout,
  TerasRecordStatusStack,
  TerasRecordTable,
  TerasRegisterPanel,
  TerasRegisterPagination,
  TerasSelectedPanel,
  TerasStatusPill,
  TerasTechnicalDetails,
} from "@/teras";
import type { WorkspaceContinuityProduct } from "../../../../../workspace-continuity/workspace-continuity-types.ts";
import {
  productContinuityMaturityLabel,
  productContinuityReadinessLabel,
  selectProductContinuityRecords,
} from "./product-continuity-view-model.ts";

export function ProductPortfolioContinuitySurface({
  focusProductId,
  onOpenRegistry,
}: {
  focusProductId: string | null;
  onOpenRegistry: (product: WorkspaceContinuityProduct) => void;
}) {
  const [query, setQuery] = useState("");
  const [maturity, setMaturity] = useState<
    WorkspaceContinuityProduct["maturity"] | "all"
  >("all");
  const [posture, setPosture] = useState<
    WorkspaceContinuityProduct["posture"] | "all"
  >("all");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const page=useWorkspaceProductsPage({query,maturity,posture},focusProductId);
  const products=page.products??[],error=page.error,loading=page.loading,onRetry=()=>void page.refresh();
  useEffect(() => {
    if (focusProductId && (products?.some((product) => product.product_id === focusProductId)||page.original?.product_id===focusProductId)) {
      setSelectedProductId(focusProductId);
    }
  }, [focusProductId, products,page.original]);
  const filtered = useMemo(
    () => selectProductContinuityRecords(products ?? [], { maturity, posture, query }),
    [maturity, posture, products, query],
  );
  const selected = page.original?.product_id===selectedProductId?page.original:filtered.find((item) => item.product_id === selectedProductId) ?? filtered[0] ?? null;


  return (
    <TerasRecordControlLayout
      composition="fullscreen-register"
      data-product-portfolio-continuity="live"
      mode="register-selected"
      register={
        <TerasRegisterPanel
          footer={<TerasRegisterPagination label="Managed products" offset={page.offset} count={filtered.length} total={page.total} page={page.pageNumber} pending={loading} unavailable={Boolean(error)} hasPrevious={page.hasPrevious} hasNext={Boolean(page.nextCursor)} onReset={error&&page.hasPrevious?page.first:undefined} onPrevious={page.previous} onNext={page.next}/> }
          description="Product identity and lifecycle from Workspace Governance. Select a product to inspect responsibilities and readiness."
          filterBar={
            <TerasFilterBar
              filters={[
                {
                  label: "Filter product posture",
                  onValueChange: setPosture,
                  options: [
                    { label: "All posture", value: "all" },
                    { label: "Active", value: "active" },
                    { label: "Suspended", value: "suspended" },
                    { label: "Retired", value: "retired" },
                  ],
                  value: posture,
                },
                {
                  label: "Filter product maturity",
                  onValueChange: setMaturity,
                  options: [
                    { label: "All maturity", value: "all" },
                    { label: "Managed by product component", value: "owner-managed" },
                    { label: "Platform integrated", value: "platform-integrated" },
                    { label: "Fully governed", value: "fully-governed" },
                  ],
                  value: maturity,
                },
              ]}
              search={{
                ariaLabel: "Search canonical managed products",
                onValueChange: setQuery,
                placeholder: "Search product, identity, or repository...",
                value: query,
              }}
            />
          }
          kicker="Product register"
          statusLabel={`${filtered.length} on this page · ${page.total??"—"} matching`}
          statusTone="ok"
          title="Managed products"
        >
          {loading?<TerasLoadingState fill label="Loading matching products…"/>:error?<TerasEmptyState fill><p role="alert">{error}</p><TerasActionButton emphasis="secondary" onClick={onRetry}>Retry product read</TerasActionButton></TerasEmptyState>:filtered.length ? (
            <TerasRecordTable
              columns={columns}
              fill
              getRowId={(item) => item.product_id}
              profile="inventory"
              onSelect={(item) => setSelectedProductId(item.product_id)}
              rows={[...filtered]}
              selectedRowId={selected?.product_id ?? null}
            />
          ) : (
            <TerasEmptyState fill>No canonical product matches the current filters.</TerasEmptyState>
          )}
        </TerasRegisterPanel>
      }
      selected={selected ? (
        <ProductContinuitySelected product={selected} onOpenRegistry={onOpenRegistry} />
      ) : (
        loading?<TerasLoadingState fill label="Preparing product details…" skeleton="details"/>:<TerasEmptyState fill>No canonical product is selected.</TerasEmptyState>
      )}
      selectedProps={{ "data-product-portfolio-selected-product": "true" }}
    />
  );
}

function ProductContinuitySelected({
  onOpenRegistry,
  product,
}: {
  onOpenRegistry: (product: WorkspaceContinuityProduct) => void;
  product: WorkspaceContinuityProduct;
}) {
  const readiness = product.publication_readiness;
  return (
    <TerasPanelStack fill="last" scroll>
      <TerasSelectedPanel
        action={{
          description: "Continue lifecycle work in the canonical Workspace Registry originating surface.",
          kicker: "Workflow route",
          node: (
            <TerasActionButton onClick={() => onOpenRegistry(product)}>
              Open Registry Record
            </TerasActionButton>
          ),
          title: "Workspace Registry",
        }}
        description="Canonical product identity and lifecycle; Portfolio does not own or repair these fields."
        facts={[
          { label: "Identity", value: product.product_id },
          { label: "Version", value: String(product.record_version) },
          { label: "Lifecycle", value: product.lifecycle },
          { label: "Maturity", value: productContinuityMaturityLabel(product.maturity) },
          { label: "Runtime responsibility", value: product.owners.runtime },
          { label: "Endpoint", value: product.highest_real_endpoint },
        ]}
        kicker="Selected Managed Product"
        selected
        status={{
          label: product.posture,
          tone: product.posture === "active" ? "ok" : "warn",
        }}
        title={product.name}
        tone={product.posture === "active" ? "ok" : "warn"}
        variant="rich"
      />
      <TerasPanel fit="fill" frame="padded" layout="header-body" overflow="auto" treatment="neutral">
        <TerasPanelHeader
          description="Responsibility and publication readiness from the same product record. Expand the source details for exact references."
          kicker="Product evidence"
          statusLabel={productContinuityReadinessLabel(product)}
          statusTone={readiness.control_state === "current" ? "info" : "warn"}
          title="Responsibilities and readiness"
        />
        <TerasContentRegion fill scroll>
        <TerasMetadataList
          columns={1}
          items={[
            { label: "Source repositories", value: product.owners.source.join(", ") },
            { label: "Platform responsibility", value: product.owners.platform },
            { label: "Security responsibility", value: product.owners.security },
            { label: "Stage supported", value: product.stage_supported ? "Yes" : "No" },
            { label: "Governed production", value: product.governed_prod_promotion ? "Supported" : "Not supported" },
            { label: "Publication readiness", value: productContinuityReadinessLabel(product) },
          ]}
          shape="list"
        />
        <TerasTechnicalDetails summary="Source and readiness details" items={[
          { label: "Record digest", value: product.record_digest },
          { label: "Lineage source", value: product.lineage.source },
          { label: "Lineage ref", value: product.lineage.source_ref },
          { label: "Latest lifecycle event", value: product.latest_lifecycle_event?.id ?? "No lifecycle event" },
          { label: "Readiness ref", value: readiness.readiness_ref?.uri ?? "No readiness evidence" },
          { label: "Readiness expiry", value: readiness.expires_at ?? "Not available" },
        ]} />
        </TerasContentRegion>
      </TerasPanel>
    </TerasPanelStack>
  );
}

const columns = [
  {
    header: "Product",
    intent: "primary" as const,
    key: "product",
    render: (item: WorkspaceContinuityProduct) => (
      <TerasRecordCellText description={item.product_id} title={item.name} />
    ),
  },
  {
    header: "Maturity",
    intent: "secondary" as const,
    key: "maturity",
    render: (item: WorkspaceContinuityProduct) => productContinuityMaturityLabel(item.maturity),
  },
  {
    header: "Runtime responsibility",
    intent: "secondary" as const,
    key: "owner",
    render: (item: WorkspaceContinuityProduct) => item.owners.runtime,
  },
  {
    header: "Readiness",
    intent: "status" as const,
    key: "readiness",
    render: (item: WorkspaceContinuityProduct) => (
      <TerasRecordStatusStack
        status={
          <TerasStatusPill tone={item.publication_readiness.control_state === "current" ? "info" : "warn"}>
            {productContinuityReadinessLabel(item)}
          </TerasStatusPill>
        }
      />
    ),
  },
  {
    header: "Posture",
    intent: "status" as const,
    key: "posture",
    render: (item: WorkspaceContinuityProduct) => (
      <TerasStatusPill tone={item.posture === "active" ? "ok" : "warn"}>
        {item.posture}
      </TerasStatusPill>
    ),
  },
];
