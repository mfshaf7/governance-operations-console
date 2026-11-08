"use client";
import { useWorkspaceViewState } from "../../../console-integration/registers/workspace-view-state.ts";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  TerasEmptyState,
  TerasActionButton,
  TerasActionRow,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
  TerasRegisterPagination,
  TerasLoadingState,
} from "@/teras";
import type {
  ProductReleaseCapability,
  ProductReleaseMaturity,
} from "../../model/product-release-capability.ts";
import {
  filterProductReleaseCapabilities,
  selectProductReleaseCapabilityById,
  type ProductReleaseFilters,
} from "../../read-model/product-release-selectors.ts";
import type {
  EnvironmentLifecycleRuntimeController,
} from "../../state/use-environment-lifecycle-runtime.ts";
import { ProductReleaseActionWorkflow } from "./product-release-action-workflow.tsx";
import { ProductReleaseDashboard } from "./product-release-dashboard.tsx";
import { ProductRuntimeLifecycleWorkflow } from "./product-runtime-lifecycle-workflow.tsx";
import {
  productReleaseMaturityLabels,
} from "./governed-releases-labels.ts";
import {
  GovernedReleasesRegisterTable,
} from "./register/governed-releases-register-table.tsx";
import {
  GovernedReleaseSelectedProduct,
} from "./register/governed-release-selected-product.tsx";

type GovernedReleasesMode =
  | "dashboard"
  | "register"
  | "release-workflow"
  | "runtime-workflow";

const initialFilters: ProductReleaseFilters = {
  endpoint: "all",
  maturity: "all",
  query: "",
};

export function GovernedReleasesSurface({
  live,
  focusProductId = null,
  onDirtyChange,
  products,
  runtime,
}: {
  live?: {runtime: ReturnType<typeof import("../../live-runtime/use-governed-products.ts").useGovernedProducts>; history:(productId:string)=>ReactNode; actions?:(product:ProductReleaseCapability,onInspect:()=>void)=>ReactNode};
  focusProductId?: string | null;
  onDirtyChange: (dirty: boolean) => void;
  products: readonly ProductReleaseCapability[];
  runtime: EnvironmentLifecycleRuntimeController;
}) {
  const [localFilters, setLocalFilters] =
    useWorkspaceViewState<ProductReleaseFilters>('governed-releases-view:localFilters', initialFilters);
  const filters=live?.runtime.filters??localFilters;
  const setFilters=live?.runtime.setFilters??setLocalFilters;
  const [mode, setMode] =
    useState<GovernedReleasesMode>("register");
  const [releaseStepId, setReleaseStepId] =
    useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] =
    useWorkspaceViewState<string | null>('governed-releases-view:selectedProductId', products[0]?.productId ?? null);
  const filteredProducts = useMemo(
    () => filterProductReleaseCapabilities(products, filters),
    [filters, products],
  );
  const selectedProduct = selectedProductId
    ? selectProductReleaseCapabilityById(products, selectedProductId)
    : null;
  const selectedRegisterProduct =
    filteredProducts.find(
      (product) => product.productId === selectedProductId,
    ) ??
    filteredProducts[0] ??
    null;
  const selectedReleaseStep =
    selectedProduct && releaseStepId
      ? selectedProduct.releasePath.find(
          (step) => step.id === releaseStepId,
        ) ?? null
      : null;
  const selectedOperation =
    selectedProduct && selectedReleaseStep?.action
      ? selectedProduct.releaseOperations.find(
          (operation) =>
            operation.action === selectedReleaseStep.action,
        ) ?? null
      : null;

  useEffect(() => {
    if (
      !focusProductId ||
      !products.some((product) => product.productId === focusProductId)
    ) {
      return;
    }

    onDirtyChange(false);
    setFilters(initialFilters);
    setMode("register");
    setReleaseStepId(null);
    setSelectedProductId(focusProductId);
  }, [focusProductId, onDirtyChange, products]);

  function openProductDashboard(productId: string) {
    onDirtyChange(false);
    setSelectedProductId(productId);
    setReleaseStepId(null);
    setMode("dashboard");
  }

  function backToRegister() {
    onDirtyChange(false);
    setReleaseStepId(null);
    setMode("register");
  }

  function backToDashboard() {
    onDirtyChange(false);
    setReleaseStepId(null);
    setMode("dashboard");
  }

  return (
    <>
      <TerasRecordControlLayout
        composition="fullscreen-register"
        mode="register-selected"
        register={
          <TerasRegisterPanel
            footer={live ? <TerasRegisterPagination label="Governed products" offset={live.runtime.offset} count={products.length} total={live.runtime.projection?.page.total} page={Math.floor(live.runtime.offset/live.runtime.pageSize)+1}
              pending={live.runtime.loading} unavailable={Boolean(live.runtime.error)} hasPrevious={live.runtime.offset>0} hasNext={live.runtime.current && live.runtime.projection?.page.next_offset!=null}
              onReset={live.runtime.error?live.runtime.first:undefined} onPrevious={live.runtime.previous} onNext={()=>void live.runtime.loadMore()} /> : undefined}
            description="Each product retains its own release shape; unavailable paths remain explicit."
            filterBar={
              <TerasFilterBar
                filters={[
                  {
                    label: "Maturity",
                    onValueChange: (maturity) =>
                      setFilters((current) => ({
                        ...current,
                        maturity:
                          maturity as ProductReleaseMaturity | "all",
                      })),
                    options: [
                      { label: "All maturity", value: "all" },
                      ...Object.entries(productReleaseMaturityLabels).map(
                        ([value, label]) => ({ label, value }),
                      ),
                    ],
                    value: filters.maturity,
                  },
                  {
                    label: "Highest governed endpoint",
                    onValueChange: (endpoint) =>
                      setFilters((current) => ({
                        ...current,
                        endpoint:
                          endpoint as ProductReleaseFilters["endpoint"],
                      })),
                    options: [
                      { label: "All endpoints", value: "all" },
                      { label: "Stage highest", value: "stage" },
                      {
                        label: "Production highest",
                        value: "production",
                      },
                      {
                        label: "No governed endpoint",
                        value: "unavailable",
                      },
                    ],
                    value: filters.endpoint,
                  },
                ]}
                search={{
                  ariaLabel: "Search governed products",
                  onValueChange: (query) =>
                    setFilters((current) => ({ ...current, query })),
                  placeholder: "Search product, responsible component, or endpoint...",
                  value: filters.query,
                }}
              />
            }
            kicker="Governed Releases"
            statusLabel={live ? `${products.length} of ${live.runtime.projection?.page.total??"?"} matching` : `${filteredProducts.length}/${products.length} shown`}
            statusTone="info"
            title="Product Release Register"
          >
            {live?.runtime.loading ? <TerasLoadingState fill label="Loading matching products…" /> : filteredProducts.length > 0 ? (
              <GovernedReleasesRegisterTable
                onInspect={(product) =>
                  openProductDashboard(product.productId)
                }
                onSelect={(product) =>
                  setSelectedProductId(product.productId)
                }
                products={filteredProducts}
                selectedProductId={
                  selectedRegisterProduct?.productId ?? null
                }
              />
            ) : (
              <TerasEmptyState fill>
                No products match the current search and filters.
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={
          <GovernedReleaseSelectedProduct
            onOpenDashboard={(product) =>
              openProductDashboard(product.productId)
            }
            product={selectedRegisterProduct}
          />
        }
      />
      {selectedProduct &&
      (mode === "dashboard" ||
        mode === "release-workflow" ||
        mode === "runtime-workflow") ? (
        <ProductReleaseDashboard
          onBack={backToRegister}
          onOpenReleaseWorkflow={(stepId) => {
            onDirtyChange(false);
            if(live)return;
            setReleaseStepId(stepId);
            setMode("release-workflow");
          }}
          onOpenRuntimeLifecycle={() => {
            onDirtyChange(false);
            if(live)return;
            setMode("runtime-workflow");
          }}
          onRetryOperation={runtime.retryOperation}
          operations={runtime.snapshot.operations}
          product={selectedProduct}
          receipts={live ? [] : runtime.snapshot.receipts}
          connected={Boolean(live)}
          sourceCurrent={live?.runtime.current}
          ownerOperations={live?.history(selectedProduct.productId)}
          ownerActions={live?.actions ? onInspect => live.actions!(selectedProduct,onInspect) : undefined}
        />
      ) : null}
      {selectedProduct &&
      mode === "release-workflow" &&
      selectedReleaseStep &&
      selectedOperation ? (
        <ProductReleaseActionWorkflow
          key={`${selectedProduct.productId}:${selectedOperation.action}`}
          onBack={backToDashboard}
          onDirtyChange={onDirtyChange}
          onRetryOperation={runtime.retryOperation}
          onSubmit={(input) =>
            runtime.submitProductRelease(
              selectedProduct.productId,
              selectedReleaseStep.id,
              input,
            )
          }
          operation={selectedOperation}
          operations={runtime.snapshot.operations}
          product={selectedProduct}
          receipts={runtime.snapshot.receipts}
          releaseStep={selectedReleaseStep}
        />
      ) : null}
      {selectedProduct &&
      mode === "runtime-workflow" &&
      selectedProduct.runtimeLifecycle ? (
        <ProductRuntimeLifecycleWorkflow
          key={`${selectedProduct.productId}:runtime-lifecycle`}
          lifecycle={selectedProduct.runtimeLifecycle}
          onBack={backToDashboard}
          onDirtyChange={onDirtyChange}
          onRetryOperation={runtime.retryOperation}
          onSubmit={(request) =>
            runtime.submitProductRuntimeLifecycle(
              selectedProduct.productId,
              request,
            )
          }
          operations={runtime.snapshot.operations}
          product={selectedProduct}
          receipts={runtime.snapshot.receipts}
        />
      ) : null}
    </>
  );
}
