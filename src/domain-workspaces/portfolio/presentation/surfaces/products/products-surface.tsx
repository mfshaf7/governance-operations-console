"use client";

import { useState } from "react";

import {
  TerasActionRow,
  TerasEmptyState,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
  TerasSegmentedControl,
  TerasStatusPill,
} from "@/teras";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import { ProductPortfolioProductsRegisterTable } from "./products-register-table.tsx";
import { ProductPortfolioProductsSelectedPanel } from "./products-selected-panel.tsx";
import {
  productPortfolioAvailabilityOptions,
  type ProductPortfolioAvailabilityFilter,
  type ProductPortfolioListingView,
  productPortfolioListingViewOptions,
  type ProductPortfolioMaturityFilter,
  productPortfolioMaturityOptions,
  productPortfolioProductsForRegister,
  productPortfolioProductsViewCount,
  type ProductPortfolioScopeFilter,
  productPortfolioScopeOptions,
} from "./products-view-model.ts";

export function ProductPortfolioProductsSurface({
  entries,
  onOpenProduct,
}: {
  entries: ProductPortfolioEntry[];
  onOpenProduct: (entry: ProductPortfolioEntry) => void;
}) {
  const [availability, setAvailability] =
    useState<ProductPortfolioAvailabilityFilter>("all");
  const [listingView, setListingView] =
    useState<ProductPortfolioListingView>("active");
  const [maturity, setMaturity] =
    useState<ProductPortfolioMaturityFilter>("all");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<ProductPortfolioScopeFilter>("all");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const filteredEntries = productPortfolioProductsForRegister(entries, {
    availability,
    listingView,
    maturity,
    query,
    scope,
  });
  const selectedEntry =
    filteredEntries.find(
      (entry) => entry.identity.productId === selectedProductId,
    ) ??
    filteredEntries[0] ??
    null;
  const viewCount = productPortfolioProductsViewCount(entries, listingView);

  return (
    <TerasRecordControlLayout
      composition="fullscreen-register"
      data-product-portfolio-products-surface="true"
      mode="register-selected"
      register={
        <TerasRegisterPanel
          actions={
            <TerasActionRow spacing="tight">
              <TerasStatusPill tone="info">
                {filteredEntries.length}/{viewCount} shown
              </TerasStatusPill>
              <TerasSegmentedControl
                ariaLabel="Select product listing view"
                onValueChange={setListingView}
                options={productPortfolioListingViewOptions}
                value={listingView}
              />
            </TerasActionRow>
          }
          bodyProps={{
            "data-product-portfolio-register": listingView,
          }}
          description="Search managed products, compare operating posture, and open the stable Product Dashboard."
          filterBar={
            <TerasFilterBar
              filters={[
                {
                  label: "Filter product maturity",
                  onValueChange: setMaturity,
                  options: productPortfolioMaturityOptions,
                  value: maturity,
                },
                {
                  label: "Filter product availability",
                  onValueChange: setAvailability,
                  options: productPortfolioAvailabilityOptions,
                  value: availability,
                },
                {
                  label: "Filter listing scope",
                  onValueChange: setScope,
                  options: productPortfolioScopeOptions,
                  value: scope,
                },
              ]}
              search={{
                ariaLabel: "Search Product Portfolio",
                onValueChange: setQuery,
                placeholder: "Search product, owner, id, or tag...",
                value: query,
              }}
            />
          }
          kicker="Product Register"
          title="Managed products"
        >
          {filteredEntries.length > 0 ? (
            <ProductPortfolioProductsRegisterTable
              entries={filteredEntries}
              onOpenProduct={onOpenProduct}
              onSelectProduct={(entry) =>
                setSelectedProductId(entry.identity.productId)
              }
              selectedProductId={selectedEntry?.identity.productId ?? null}
            />
          ) : (
            <TerasEmptyState fill>
              No managed product matches the current search and filters.
            </TerasEmptyState>
          )}
        </TerasRegisterPanel>
      }
      selected={
        selectedEntry ? (
          <ProductPortfolioProductsSelectedPanel
            entry={selectedEntry}
            onOpenProduct={onOpenProduct}
          />
        ) : (
          <TerasEmptyState fill>
            No product is selected from the current results.
          </TerasEmptyState>
        )
      }
      selectedProps={{
        "data-product-portfolio-selected-product": "true",
      }}
    />
  );
}
