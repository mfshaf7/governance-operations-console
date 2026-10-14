"use client";

import { useEffect, useMemo, useState } from "react";

import {
  TerasActionButton,
  TerasEmptyState,
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
  TerasSelectedPanel,
  TerasStatusPill,
} from "@/teras";
import type { WorkspaceContinuityProduct } from "../../../../../workspace-continuity/workspace-continuity-types.ts";
import {
  productContinuityMaturityLabel,
  productContinuityReadinessLabel,
  selectProductContinuityRecords,
} from "./product-continuity-view-model.ts";

export function ProductPortfolioContinuitySurface({
  error,
  focusProductId,
  loading,
  onOpenRegistry,
  onRetry,
  products,
}: {
  error: string | null;
  focusProductId: string | null;
  loading: boolean;
  onOpenRegistry: (product: WorkspaceContinuityProduct) => void;
  onRetry: () => void;
  products: readonly WorkspaceContinuityProduct[] | null;
}) {
  const [query, setQuery] = useState("");
  const [maturity, setMaturity] = useState<
    WorkspaceContinuityProduct["maturity"] | "all"
  >("all");
  const [posture, setPosture] = useState<
    WorkspaceContinuityProduct["posture"] | "all"
  >("all");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  useEffect(() => {
    if (focusProductId && products?.some((product) => product.product_id === focusProductId)) {
      setSelectedProductId(focusProductId);
    }
  }, [focusProductId, products]);
  const filtered = useMemo(
    () => selectProductContinuityRecords(products ?? [], { maturity, posture, query }),
    [maturity, posture, products, query],
  );
  const selected = filtered.find((item) => item.product_id === selectedProductId) ?? filtered[0] ?? null;

  if (!products) {
    return (
      <TerasPanelStack fill="last">
        <TerasPanel fit="content" frame="padded" treatment="neutral">
          <TerasPanelHeader
            description={error ?? "Reading canonical product continuity from WGCF."}
            kicker="Product Portfolio"
            statusLabel={error ? "Unavailable" : "Loading"}
            statusTone={error ? "danger" : "info"}
            title={error ? "Product continuity unavailable" : "Loading managed products"}
          />
          {error ? (
            <TerasActionButton emphasis="secondary" onClick={onRetry}>
              Retry Product Continuity
            </TerasActionButton>
          ) : null}
        </TerasPanel>
        <TerasEmptyState fill>
          {loading
            ? "Canonical managed products are loading."
            : "No canonical product projection is available."}
        </TerasEmptyState>
      </TerasPanelStack>
    );
  }

  return (
    <TerasRecordControlLayout
      composition="fullscreen-register"
      data-product-portfolio-continuity="live"
      mode="register-selected"
      register={
        <TerasRegisterPanel
          description="Canonical managed-product identity and lifecycle from Workspace Governance through WGCF."
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
                    { label: "Owner managed", value: "owner-managed" },
                    { label: "Platform integrated", value: "platform-integrated" },
                    { label: "Fully governed", value: "fully-governed" },
                  ],
                  value: maturity,
                },
              ]}
              search={{
                ariaLabel: "Search canonical managed products",
                onValueChange: setQuery,
                placeholder: "Search product, identity, or owner...",
                value: query,
              }}
            />
          }
          kicker="Canonical Product Register"
          statusLabel={`${filtered.length}/${products.length} shown`}
          statusTone="ok"
          title="Managed products"
        >
          {filtered.length ? (
            <TerasRecordTable
              columns={columns}
              fill
              getRowId={(item) => item.product_id}
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
        <TerasEmptyState fill>No canonical product is selected.</TerasEmptyState>
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
    <TerasPanelStack fill="last">
      <TerasSelectedPanel
        action={{
          description: "Continue lifecycle work in the canonical Workspace Registry owner surface.",
          kicker: "Owner Route",
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
          { label: "Runtime owner", value: product.owners.runtime },
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
          description="Exact source, lifecycle, ownership, and non-terminal readiness evidence from the same continuity projection."
          kicker="Canonical Continuity"
          statusLabel={productContinuityReadinessLabel(product)}
          statusTone={readiness.control_state === "current" ? "info" : "warn"}
          title="Authority evidence"
        />
        <TerasMetadataList
          columns={1}
          items={[
            { label: "Record digest", value: shortDigest(product.record_digest) },
            { label: "Lineage source", value: product.lineage.source },
            { label: "Lineage ref", value: product.lineage.source_ref },
            { label: "Source owners", value: product.owners.source.join(", ") },
            { label: "Platform owner", value: product.owners.platform },
            { label: "Security owner", value: product.owners.security },
            { label: "Stage supported", value: product.stage_supported ? "Yes" : "No" },
            { label: "Governed production", value: product.governed_prod_promotion ? "Supported" : "Not supported" },
            { label: "Latest lifecycle event", value: product.latest_lifecycle_event?.id ?? "No lifecycle event" },
            { label: "Publication readiness", value: productContinuityReadinessLabel(product) },
            { label: "Readiness ref", value: readiness.readiness_ref?.uri ?? "No readiness evidence" },
            { label: "Readiness expiry", value: readiness.expires_at ?? "Not available" },
          ]}
          shape="list"
        />
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
    header: "Runtime owner",
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

function shortDigest(value: string) {
  return `${value.slice(0, 12)}...${value.slice(-8)}`;
}
