"use client";

import { useState, type ReactNode } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasPanelStack,
  TerasContentTray,
  TerasEmptyState,
  TerasList,
  TerasMetadataList,
  TerasModalShell,
  TerasPanel,
  TerasPanelHeader,
  TerasPrimarySideLayout,
  TerasSegmentedControl,
  TerasStatusItem,
  TerasSummaryCard,
  TerasSummaryCardGrid,
  TerasTrayStack,
  TerasTechnicalDetails,
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
  connected = false,
  sourceCurrent = true,
  ownerOperations,
  ownerActions,
  onBack,
  onOpenReleaseWorkflow,
  onOpenRuntimeLifecycle,
  onRetryOperation,
  operations,
  product,
  receipts,
}: {
  connected?: boolean;
  sourceCurrent?: boolean;
  ownerOperations?: ReactNode;
  ownerActions?: (onInspect: () => void) => ReactNode;
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
  const productTone = connected ? sourceCurrent ? "info" : "warn" : dashboard.currentStep
    ? productReleaseStepPostureTones[dashboard.currentStep.posture]
    : "muted";

  return (
    <TerasModalShell
      bodyLayout="fill"
      description={connected ? sourceCurrent ? "Source-reported release support, runtime state and recorded evidence." : "Retained source records. Refresh the Console source, or inspect current records in GitHub." : "Design preview — sample product, release and runtime records. Actions are simulated."}
      footer={
        <TerasActionButton emphasis="secondary" onClick={onBack}>
          Back to Register
        </TerasActionButton>
      }
      height="fill"
      kicker={connected ? "Governed Releases" : "Governed Releases Preview"}
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
                description="Product identity and recorded release contract."
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
                    label: connected ? "Source" : "Current step",
                    tone: productTone,
                    value: dashboard.currentStep
                      ? dashboard.currentStep.label
                      : connected ? "Source records" : "Unavailable",
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
                value={formatProductReleaseStatus(dashboard.overview.highestRealEndpoint)}
                variant="dense"
              />
              <TerasSummaryCard
                label="Stage support"
                tone={
                  dashboard.overview.stageSupported ? "ok" : "muted"
                }
                value={
                  dashboard.overview.stageSupported
                    ? "Supported"
                    : "Not supported"
                }
                variant="dense"
              />
              <TerasSummaryCard
                label="Production support"
                tone={
                  dashboard.overview.productionPromotionSupported
                    ? "ok"
                    : "muted"
                }
                value={
                  dashboard.overview.productionPromotionSupported
                    ? "Supported"
                    : "Not supported"
                }
                variant="dense"
              />
              <TerasSummaryCard
                label={connected ? "Recorded runtime" : "Runtime"}
                tone={productRuntimeLifecycleTone(currentLifecycle)}
                value={connected ? formatProductReleaseStatus(product.recordedRuntime?.state??"not-recorded") : currentLifecycle?.label ?? "Unavailable"}
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
              ownerOperations={ownerOperations}
              operations={operations}
              product={product}
              receipts={receipts}
            />
          </TerasZone>
        }
        sideFill={
          <TerasPanelStack fill="last" scroll>
            <TerasPanel spacing="normal"
              fit="content"
              frame="padded"
              tone={dashboard.nextMove ? "info" : "muted"}
              treatment="rail"
            >
              <TerasPanelHeader
                description={
                  dashboard.nextMove?.reason ??
                  (connected ? product.unavailableReason : "No product release move is currently required.")
                }
                kicker={connected ? "Workflow route" : "Required Move"}
                statusLabel={
                  connected ? !sourceCurrent ? "Retained" : product.ownerWorkflows?.length ? "Release workflow" : "Not supported" : dashboard.currentStep
                    ? productReleaseStepPostureLabels[
                        dashboard.currentStep.posture
                      ]
                    : "Unavailable"
                }
                statusTone={productTone}
                title={
                  (connected && product.ownerWorkflows?.length ? "Protected workflow route" : dashboard.nextMove?.label) ??
                  dashboard.currentStep?.label ??
                  (connected ? "No governed release path" : "No action required")
                }
              />
              {dashboard.nextMove ? (
                <TerasMetadataList
                  columns={1}
                  items={[
                    {
                      label: "Responsible component",
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
              {connected && product.ownerGuidanceUrl ? <TerasActionRow><TerasActionButton emphasis="secondary" onClick={()=>window.open(product.ownerGuidanceUrl,"_blank","noopener,noreferrer")}>Read workflow guidance</TerasActionButton></TerasActionRow> : null}
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

            {connected ? <TerasPanel spacing="normal" fit="content" frame="padded" treatment="neutral">
              <TerasPanelHeader kicker="Workflow execution" title="Protected workflows" description={product.ownerWorkflows?.length ? "Submit through a commissioned Platform connection, or inspect the release workflow in GitHub. Environment approval and source review remain required." : product.unavailableReason}/>
              {ownerActions?.(() => setActiveTab("operations"))}
              {product.recordedRuntime ? <TerasMetadataList columns={1} items={[{label:"Recorded production state",value:formatProductReleaseStatus(product.recordedRuntime.state)},{label:"Recorded",value:product.recordedRuntime.recorded_at ? formatObservedAt(product.recordedRuntime.recorded_at) : "Not recorded"}]} topOffset="compact"/> : null}
              <TerasActionRow spacing="normal">{product.ownerWorkflows?.map(workflow=><TerasActionButton emphasis="secondary" key={workflow.id} onClick={()=>window.open(workflow.url,"_blank","noopener,noreferrer")}>{workflow.label}</TerasActionButton>)}</TerasActionRow>
              <TerasTechnicalDetails summary="Execution and source details" items={[{label:"Console dispatch",value:product.ownerWorkflows?.some(workflow=>workflow.native?.available) ? "Commissioned for the available actions" : product.ownerWorkflows?.find(workflow=>workflow.native)?.native?.unavailable_reason ?? "Not commissioned"},{label:"Recorded runtime",value:"Source contract; not an observation of running resources"},{label:"Source version",value:product.source.version},...(product.ownerWorkflows??[]).map(workflow=>({label:workflow.label,value:workflow.url}))]}/>
              {!sourceCurrent ? <TerasEmptyState>Retained Console source. Review current source and inputs in GitHub before running its protected workflow.</TerasEmptyState> : null}
            </TerasPanel> : (            <TerasPanel spacing="normal"
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
            </TerasPanel>)}

          </TerasPanelStack>
        }
      />
    </TerasModalShell>
  );
}

function ProductReleaseDashboardTabContent({
  activeTab,
  dashboard,
  onRetryOperation,
  ownerOperations,
  operations,
  product,
  receipts,
}: {
  activeTab: ProductDashboardTab;
  ownerOperations?: ReactNode;
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
          layout="header-body"
          treatment="neutral"
        >
          <TerasPanelHeader
            description="Stable responsibilities, endpoint, authority, rollback, and evidence."
            kicker="Release Contract"
            title="Product boundary"
          />
          <TerasTrayStack scroll>
            <TerasTrayStack columns={2}>
              <TerasContentTray kicker="Responsibilities and endpoint">
                <TerasMetadataList
                  items={[
                    {
                      label: "Highest endpoint",
                      value: formatProductReleaseStatus(dashboard.overview.highestRealEndpoint),
                    },
                    {
                      label: "Platform responsibility",
                      value: dashboard.overview.platformOwner,
                    },
                    {
                      label: "Security responsibility",
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
                      label: "Responsible component",
                      value: dashboard.operatorRoute.ownerRef,
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
              <TerasTechnicalDetails summary="Source and evidence details" items={[
                {label:"Authority",value:dashboard.overview.source.source},
                {label:"Registry record",value:dashboard.overview.source.ref},
                {label:"Source version",value:dashboard.overview.source.version},
                {label:"Operator guidance",value:dashboard.operatorRoute.ref},
                ...dashboard.supportingEvidenceRefs.map((reference,index)=>({label:`Supporting record ${index+1}`,value:reference})),
              ]}/>

            </TerasContentTray>
          </TerasTrayStack>
        </TerasPanel>
      );
    case "release-path":
      if(product.recordedEvidence)return <TerasPanel fit="fill" frame="padded" layout="header-body" overflow="hidden" treatment="neutral">
        <TerasPanelHeader kicker="Release records" title="Recorded source state" description="These are source records, not an executable workflow or proof of current environment health. Inspect each record for its candidate binding and evidence."/>
        <TerasTrayStack scroll>{product.recordedEvidence.length ? product.recordedEvidence.map(record=><TerasContentTray key={record.id} kicker={record.label}>
          <TerasMetadataList items={[{label:"Recorded status",value:formatProductReleaseStatus(record.status)},{label:"Recorded",value:record.recorded_at ? formatObservedAt(record.recorded_at) : "Not recorded"}]}/>
          <TerasActionRow spacing="normal"><TerasActionButton emphasis="secondary" onClick={()=>window.open(record.url,"_blank","noopener,noreferrer")}>Inspect {record.label.toLowerCase()}</TerasActionButton></TerasActionRow>
          <TerasTechnicalDetails summary="Candidate and evidence details" items={[{label:"Source bundle",value:record.source_bundle??"Not recorded"},{label:"Image digest",value:record.image_digest??"Not recorded"},{label:"Verification evidence",value:record.evidence_ref??"Not recorded"},{label:"Source record",value:record.url}]}/>
        </TerasContentTray>) : <TerasEmptyState>{product.unavailableReason}</TerasEmptyState>}</TerasTrayStack>
      </TerasPanel>;
      return (
        <TerasPanel
          fit="fill"
          frame="padded"
          overflow="hidden"
          layout="header-body"
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
            <TerasTrayStack scroll>
            <TerasList ariaLabel="Governed product release path">
              {dashboard.releasePath.steps.map(({ step }, index) => (
                <TerasStatusItem
                  detail={product.recordedEvidence?.find(record=>record.id===step.id)?.recorded_at ? `Recorded ${formatObservedAt(product.recordedEvidence.find(record=>record.id===step.id)!.recorded_at!)}` : "Inspect the source record for its exact evidence and candidate binding."}
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
            </TerasTrayStack>
          ) : (
            <TerasEmptyState fill>
              {dashboard.releasePath.unavailableReason ??
                "Product release path unavailable."}
            </TerasEmptyState>
          )}
        </TerasPanel>
      );
    case "operations":
      if(ownerOperations)return ownerOperations;
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
