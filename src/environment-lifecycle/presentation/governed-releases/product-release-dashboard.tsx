"use client";

import { useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasContentFrame,
  TerasContentTray,
  TerasEmptyState,
  TerasList,
  TerasMetadataList,
  TerasModalShell,
  TerasPanel,
  TerasPanelHeader,
  TerasPrimarySideLayout,
  TerasReadoutField,
  TerasSegmentedControl,
  TerasStatusItem,
  TerasSummaryCard,
  TerasSummaryCardGrid,
  TerasTrayStack,
  TerasZone,
} from "@/teras";

import type { ProductReleaseCapability } from "../../model/product-release-capability";
import type {
  EnvironmentLifecycleOperation,
  EnvironmentLifecycleOperationReceipt,
} from "../../model/environment-lifecycle-command";
import { buildProductReleaseDashboard } from "../../read-model/product-release-dashboard";
import { environmentProductSubjectRef } from "../../work-model/commands/environment-lifecycle-command-factory";
import { EnvironmentOperationPanel } from "../operations/environment-operation-panel";
import {
  formatProductReleaseStatus,
  productReleaseMaturityLabels,
  productReleaseStepPostureLabels,
  productReleaseStepPostureTones,
  productRuntimeLifecycleTone,
} from "./governed-releases-labels";

function formatObservedAt(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatReferences(
  references: readonly string[],
  emptyLabel: string,
) {
  return references.length > 0 ? references.join(", ") : emptyLabel;
}

type ProductDashboardTab = "operations" | "overview" | "release-path";

const productDashboardTabs = [
  { label: "Overview", value: "overview" },
  { label: "Release Path", value: "release-path" },
  { label: "Operations", value: "operations" },
] as const;

export function ProductReleaseDashboard({
  onBack,
  onOpenReleaseWorkflow,
  onOpenRuntimeLifecycle,
  onRetryOperation,
  operations,
  product,
  receipts,
}: {
  onBack: () => void;
  onOpenReleaseWorkflow: (stepId: string) => void;
  onOpenRuntimeLifecycle: () => void;
  onRetryOperation: (
    operationId: string,
  ) => Promise<EnvironmentLifecycleOperation>;
  operations: readonly EnvironmentLifecycleOperation[];
  product: ProductReleaseCapability;
  receipts: readonly EnvironmentLifecycleOperationReceipt[];
}) {
  const [activeTab, setActiveTab] =
    useState<ProductDashboardTab>("overview");
  const dashboard = buildProductReleaseDashboard(product);
  const currentPathItem = dashboard.currentStep
    ? dashboard.releasePath.steps.find(
        (item) => item.step.id === dashboard.currentStep?.id,
      ) ?? null
    : null;
  const blockingRequirement =
    currentPathItem &&
    !currentPathItem.actionable &&
    currentPathItem.step.actionRequirement
      ? currentPathItem.step.actionRequirement
      : null;
  const currentLifecycle = dashboard.runtimeLifecycle.currentState;
  const productTone = dashboard.currentStep
    ? productReleaseStepPostureTones[dashboard.currentStep.posture]
    : "muted";

  return (
    <TerasModalShell
      bodyLayout="fill"
      description="Product-owned release capability, endpoint ceiling, runtime lifecycle, and operation evidence."
      footer={
        <TerasActionButton emphasis="secondary" onClick={onBack}>
          Back to Register
        </TerasActionButton>
      }
      height="fill"
      kicker="Governed Releases Dashboard"
      onClose={onBack}
      surfaceId="governed-product-dashboard"
      title="Product Dashboard"
      width="large"
    >
      <TerasPrimarySideLayout
        primaryTop={
          <TerasZone fit="content">
            <TerasPanel
              frame="padded"
              tone={productTone}
              treatment="rail"
            >
              <TerasPanelHeader
                description="Product identity and the current product-owned release projection."
                kicker="Selected Product"
                title={product.productLabel}
              />
              <TerasMetadataList
                items={[
                  {
                    label: "Product ID",
                    value: product.productId,
                  },
                  {
                    label: "Current step",
                    tone: productTone,
                    value: dashboard.currentStep
                      ? dashboard.currentStep.label
                      : "Unavailable",
                  },
                ]}
                shape="line"
                topOffset="compact"
                treatment="chip"
                wrap
              />
            </TerasPanel>
            <TerasSummaryCardGrid columns={5}>
              <TerasSummaryCard
                label="Maturity"
                tone={
                  product.maturity === "fully-governed" ? "ok" : "info"
                }
                value={productReleaseMaturityLabels[product.maturity]}
                variant="dense"
              />
              <TerasSummaryCard
                label="Endpoint"
                tone="info"
                value={dashboard.overview.highestRealEndpoint}
                variant="dense"
              />
              <TerasSummaryCard
                label="Stage"
                tone={
                  dashboard.overview.stageSupported ? "ok" : "muted"
                }
                value={
                  dashboard.overview.stageSupported
                    ? "Available"
                    : "Unavailable"
                }
                variant="dense"
              />
              <TerasSummaryCard
                label="Production"
                tone={
                  dashboard.overview.productionPromotionSupported
                    ? "ok"
                    : "muted"
                }
                value={
                  dashboard.overview.productionPromotionSupported
                    ? "Available"
                    : "Unavailable"
                }
                variant="dense"
              />
              <TerasSummaryCard
                label="Runtime"
                tone={productRuntimeLifecycleTone(currentLifecycle)}
                value={currentLifecycle?.label ?? "Unavailable"}
                variant="dense"
              />
            </TerasSummaryCardGrid>
          </TerasZone>
        }
        primaryMain={
          <TerasZone fit="fill">
            <TerasSegmentedControl
              ariaLabel="Select Product Dashboard section"
              layout="fill"
              onValueChange={setActiveTab}
              options={productDashboardTabs}
              value={activeTab}
            />
            <ProductReleaseDashboardTabContent
              activeTab={activeTab}
              dashboard={dashboard}
              onRetryOperation={onRetryOperation}
              operations={operations}
              product={product}
              receipts={receipts}
            />
          </TerasZone>
        }
        sideFill={
          <TerasContentFrame fill variant="standard">
            <TerasPanel
              fit="content"
              frame="padded"
              tone={dashboard.nextMove ? "info" : "muted"}
              treatment="rail"
            >
              <TerasPanelHeader
                description={
                  dashboard.nextMove?.reason ??
                  "No product release move is currently required."
                }
                kicker="Required Move"
                statusLabel={
                  dashboard.currentStep
                    ? productReleaseStepPostureLabels[
                        dashboard.currentStep.posture
                      ]
                    : "Unavailable"
                }
                statusTone={productTone}
                title={
                  dashboard.nextMove?.label ??
                  dashboard.currentStep?.label ??
                  "No action required"
                }
              />
              {dashboard.nextMove ? (
                <TerasMetadataList
                  columns={1}
                  items={[
                    {
                      label: "Owner",
                      value:
                        blockingRequirement?.blockedMove.ownerRef ??
                        currentPathItem?.operation?.workflowOwner ??
                        dashboard.nextMove?.ownerRef ??
                        "None",
                    },
                  ]}
                  topOffset="compact"
                />
              ) : null}
              {currentPathItem?.actionable ? (
                <TerasActionRow spacing="normal">
                  <TerasActionButton
                    onClick={() =>
                      onOpenReleaseWorkflow(currentPathItem.step.id)
                    }
                  >
                    Open Workflow
                  </TerasActionButton>
                </TerasActionRow>
              ) : null}
            </TerasPanel>

            <TerasPanel
              fit="content"
              frame="padded"
              tone={productRuntimeLifecycleTone(currentLifecycle)}
              treatment="rail"
            >
              <TerasPanelHeader
                description={
                  dashboard.runtimeLifecycle.unavailableReason ??
                  currentLifecycle?.description ??
                  "No separate runtime lifecycle control is declared."
                }
                kicker="Runtime Lifecycle"
                statusLabel={currentLifecycle?.label ?? "Unavailable"}
                statusTone={productRuntimeLifecycleTone(
                  currentLifecycle,
                )}
                title="Runtime state"
              />
              {dashboard.runtimeLifecycle.available ? (
                <>
                  <TerasMetadataList
                    columns={1}
                    items={[
                      {
                        label: "Available targets",
                        value: formatReferences(
                          dashboard.runtimeLifecycle.targetStates.map(
                            (state) => state.label,
                          ),
                          "No alternate states",
                        ),
                      },
                    ]}
                    topOffset="compact"
                  />
                  <TerasActionRow spacing="normal">
                    <TerasActionButton
                      emphasis="secondary"
                      onClick={onOpenRuntimeLifecycle}
                    >
                      Change Lifecycle
                    </TerasActionButton>
                  </TerasActionRow>
                </>
              ) : (
                <TerasEmptyState>
                  Lifecycle state remains with its owning authority.
                </TerasEmptyState>
              )}
            </TerasPanel>
          </TerasContentFrame>
        }
      />
    </TerasModalShell>
  );
}

function ProductReleaseDashboardTabContent({
  activeTab,
  dashboard,
  onRetryOperation,
  operations,
  product,
  receipts,
}: {
  activeTab: ProductDashboardTab;
  dashboard: ReturnType<typeof buildProductReleaseDashboard>;
  onRetryOperation: (
    operationId: string,
  ) => Promise<EnvironmentLifecycleOperation>;
  operations: readonly EnvironmentLifecycleOperation[];
  product: ProductReleaseCapability;
  receipts: readonly EnvironmentLifecycleOperationReceipt[];
}) {
  switch (activeTab) {
    case "overview":
      return (
        <TerasPanel
          fit="fill"
          frame="padded"
          overflow="hidden"
          treatment="neutral"
        >
          <TerasPanelHeader
            description="Stable ownership, endpoint, authority, rollback, and evidence truth."
            kicker="Release Contract"
            title="Product boundary"
          />
          <TerasTrayStack scroll>
            <TerasTrayStack columns={2}>
              <TerasContentTray kicker="Ownership and endpoint">
                <TerasMetadataList
                  items={[
                    {
                      label: "Highest endpoint",
                      value: dashboard.overview.highestRealEndpoint,
                    },
                    {
                      label: "Platform owner",
                      value: dashboard.overview.platformOwner,
                    },
                    {
                      label: "Security owner",
                      value: dashboard.overview.securityOwner,
                    },
                    {
                      label: "Rollback",
                      tone: dashboard.overview.rollback.supported
                        ? "ok"
                        : "muted",
                      value: dashboard.overview.rollback.supported
                        ? "Supported"
                        : "Unavailable",
                    },
                  ]}
                />
              </TerasContentTray>
              <TerasContentTray kicker="Authority route">
                <TerasMetadataList
                  items={[
                    {
                      label: "Route",
                      value: dashboard.operatorRoute.label,
                    },
                    {
                      label: "Route owner",
                      value: dashboard.operatorRoute.ownerRef,
                    },
                    {
                      label: "Route reference",
                      value: dashboard.operatorRoute.ref,
                    },
                    {
                      detail: dashboard.overview.source.ref,
                      label: "Authority source",
                      value: `${dashboard.overview.source.source} · v${dashboard.overview.source.version}`,
                    },
                  ]}
                />
              </TerasContentTray>
            </TerasTrayStack>
            <TerasContentTray kicker="Recorded evidence">
              <TerasMetadataList
                items={[
                  {
                    label: "Source observed",
                    value: formatObservedAt(
                      dashboard.overview.source.observedAt,
                    ),
                  },
                  {
                    label: "Rollback contract",
                    value:
                      dashboard.overview.rollback.contractRef ??
                      "Unavailable",
                  },
                ]}
              />
              <TerasReadoutField
                fit="content"
                label="Supporting references"
                value={formatReferences(
                  dashboard.supportingEvidenceRefs,
                  "No supporting evidence",
                )}
              />
            </TerasContentTray>
          </TerasTrayStack>
        </TerasPanel>
      );
    case "release-path":
      return (
        <TerasPanel
          fit="fill"
          frame="padded"
          overflow="hidden"
          treatment="neutral"
        >
          <TerasPanelHeader
            description={
              dashboard.releasePath.available
                ? "Canonical product steps and their authority-owned source references."
                : "No governed release path is declared for this product."
            }
            kicker="Release Path"
            title="Governed progression"
          />
          {dashboard.releasePath.available ? (
            <TerasList ariaLabel="Governed product release path">
              {dashboard.releasePath.steps.map(({ step }, index) => (
                <TerasStatusItem
                  detail={step.sourceRef}
                  index={String(index + 1).padStart(2, "0")}
                  key={step.id}
                  label={step.label}
                  status={formatProductReleaseStatus(
                    step.canonicalStatus,
                  )}
                  tone={productReleaseStepPostureTones[step.posture]}
                />
              ))}
            </TerasList>
          ) : (
            <TerasEmptyState fill>
              {dashboard.releasePath.unavailableReason ??
                "Product release path unavailable."}
            </TerasEmptyState>
          )}
        </TerasPanel>
      );
    case "operations":
      return (
        <TerasZone fit="content">
          <EnvironmentOperationPanel
            description="Latest release or runtime lifecycle command result for this product."
            onRetry={onRetryOperation}
            operations={operations}
            receipts={receipts}
            showHistory
            subjectRef={environmentProductSubjectRef(product.productId)}
            title="Product operation"
          />
        </TerasZone>
      );
  }
}
