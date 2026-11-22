"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import {
  getOperationWorkbenchSurfaceAttributes,
  type OperationWorkbenchDomainContract,
} from "../../../../operation-workbench/operation-workbench-contract.ts";

import type {
  DeliveryIntakeSource,
  DeliveryPackageSummary,
  DeliveryReadModel,
} from "../../read-model/index.ts";

import {
  TerasDraftCloseGuardDialog,
  TerasActionRow,
  TerasModalShell,
  TerasFullscreenSurfaceFrame,
  TerasSurfaceNav,
  TerasSegmentedControl,
  TerasSurfaceNavButton,
  TerasSurfaceSummaryHeader,
} from "@/teras";
import { projectOperationSurfaceStatusItems } from "@/domain-workspaces/operation-projections";
import { DeliveryHomeSurface } from "../surfaces/home/home-surface.tsx";
import type { DeliveryHomeTarget } from "../surfaces/home/home-view-model.ts";
import {
  DeliveryExecutionBoard,
  type ExecutionTreeEditState,
} from "../surfaces/execution-board/execution-board-surface.tsx";
import type { ExecutionWorkBoardSummary } from "../surfaces/execution-board/execution-package-work-board.tsx";
import { DeliveryIntakeSurface } from "../surfaces/intake/intake-surface.tsx";
import { DeliveryCatalogSurface } from "../surfaces/catalog/catalog-surface.tsx";
import { DeliveryRefinementSurface } from "../surfaces/refinement/refinement-surface.tsx";
import { DeliveryWorkDesignSurface } from "../surfaces/work-design/work-design-surface.tsx";
import type { WorkDesignApplyReceipt } from "../../work-model/work-design/work-design-types.ts";
import type { CatalogDeliveryLinkTarget } from "../../live-runtime/catalog-live-types.ts";
import { packageActionForSurface } from "../workflows/shared/package-actions/package-action-routing.ts";
import type { DeliveryPackageActionState } from "../workflows/shared/package-actions/package-action-types.ts";
import {
  deliverySurfaces,
  deliveryWorkspaceSurfaces,
} from "./workspace-config.ts";
import type {
  DeliveryWorkspaceSurfaceId,
  DeliveryPackageRegisterFocus,
} from "./workspace-types.ts";
import {
  deliverySurfaceItemCount,
  deliveryWorkspaceComponentStatuses,
  deliveryWorkspaceSummaryDescription,
  deliveryWorkspaceSummaryStats,
  deliveryWorkspaceSummaryTitle,
} from "./workspace-view-model.ts";
import { DeliveryPackageWorkflowRouter } from "../package-register/index.ts";
import { DeliveryPIPlanningSurface } from "../surfaces/pi-planning/pi-planning-surface.tsx";
import { PIPlanningPreviewContext } from "./pi-planning-preview-context.ts";

export function DeliveryWorkspaceModal({
  activeSurfaceId,
  contract,
  entryIntent,
  executionCount,
  onExecutionChanged,
  model,
  onActiveSurfaceChange,
  onRecordScopeChange,
  onClose,
  onConsumeSource,
  onRequestPackageRegisterFocus,
  onWorkDesignApplied,
  packageRegisterFocus,
}: {
  activeSurfaceId: DeliveryWorkspaceSurfaceId;
  contract: OperationWorkbenchDomainContract;
  entryIntent: ConsoleSurfaceEntryIntent | null;
  executionCount: number;
  onExecutionChanged?: () => Promise<void>;
  model: DeliveryReadModel;
  onActiveSurfaceChange: (surfaceId: DeliveryWorkspaceSurfaceId) => void;
  onClose: () => void;
  onRecordScopeChange?: (scope: "current" | "history") => void;
  onConsumeSource: (source: DeliveryIntakeSource) => void;
  onRequestPackageRegisterFocus: (
    surfaceId: Extract<
      DeliveryWorkspaceSurfaceId,
      "refinement" | "work-design"
    >,
    packageId: string,
  ) => void;
  onWorkDesignApplied: (
    deliveryPackage: DeliveryPackageSummary,
    record: WorkDesignApplyReceipt,
  ) => void;
  packageRegisterFocus: DeliveryPackageRegisterFocus | null;
}) {
  const localPlanning = model.source_truth === "mock";
  const [planningSource, setPlanningSource] = useState<DeliveryReadModel | null>(null);
  const [planningDraftDirty, setPlanningDraftDirty] = useState(false);
  const [planningIncrement, setPlanningIncrement] = useState("");
  const [planningHandoff, setPlanningHandoff] = useState<{ packageId: string; from: "refinement" | "execution-board" } | null>(null);
  const workspaceSections = model.history_scope !== "history"
    ? [
        ...deliveryWorkspaceSurfaces.slice(0, 4),
        { id: "pi-planning" as const, title: "PI Planning", tone: "info" as const },
        ...deliveryWorkspaceSurfaces.slice(4),
      ]
    : deliveryWorkspaceSurfaces;
  const [workspacePackageAction, setWorkspacePackageAction] =
    useState<DeliveryPackageActionState | null>(null);
  const [catalogDeliveryLinkTarget, setCatalogDeliveryLinkTarget] =
    useState<CatalogDeliveryLinkTarget | null>(null);
  const [workspaceIntakeFocus, setWorkspaceIntakeFocus] = useState<{
    returnSurfaceId: DeliveryWorkspaceSurfaceId;
    sourceId: string;
    token: number;
  } | null>(null);
  const [executionWorkBoardSummary, setExecutionWorkBoardSummary] = useState<ExecutionWorkBoardSummary | null>(null);
  const [executionTreeEditState, setExecutionTreeEditState] =
    useState<ExecutionTreeEditState>({
      active: false,
      dirty: false,
      packageLabel: null,
    });
  const [pendingWorkspaceExit, setPendingWorkspaceExit] = useState<
    | {
        type: "close";
      }
    | {
        surfaceId: DeliveryWorkspaceSurfaceId;
        type: "surface";
      }
    | { type: "scope"; scope: "current" | "history" }
    | null
  >(null);
  const compactBoardLayout = activeSurfaceId === "execution-board" || activeSurfaceId === "pi-planning";
  const workBoardSummary = activeSurfaceId === "execution-board" ? executionWorkBoardSummary : null;
  const workspaceSummaryStats = workBoardSummary?.metrics ?? deliveryWorkspaceSummaryStats({
    activeSurfaceId,
    executionCount,
    model: activeSurfaceId === "pi-planning" && planningSource ? planningSource : model,
    planningIncrement,
  });
  const workspaceSummaryDescription =
    deliveryWorkspaceSummaryDescription(activeSurfaceId);
  const recordExecutionTreeEditState = useCallback(
    (nextState: ExecutionTreeEditState) => {
      setExecutionTreeEditState((current) =>
        current.active === nextState.active &&
        current.dirty === nextState.dirty &&
        current.packageLabel === nextState.packageLabel
          ? current
          : nextState,
      );
    },
    [],
  );

  useEffect(() => {
    if (
      !entryIntent ||
      !entryIntent.requiredMoveRef.startsWith("delivery.intake.")
    ) {
      return;
    }

    setWorkspaceIntakeFocus({
      returnSurfaceId: "home",
      sourceId: entryIntent.subjectRef,
      token: Date.now(),
    });
  }, [entryIntent]);

  function dirtyExecutionTreeDraftActive() {
    return executionTreeEditState.dirty;
  }

  function requestWorkspaceClose() {
    if (planningDraftDirty || dirtyExecutionTreeDraftActive()) {
      setPendingWorkspaceExit({ type: "close" });
      return;
    }

    onClose();
  }

  function requestActiveSurfaceChange(surfaceId: DeliveryWorkspaceSurfaceId) {
    if (surfaceId === activeSurfaceId) {
      return;
    }

    if (planningDraftDirty || dirtyExecutionTreeDraftActive()) {
      setPendingWorkspaceExit({
        surfaceId,
        type: "surface",
      });
      return;
    }

    if (surfaceId !== "catalog") setCatalogDeliveryLinkTarget(null);
    setPlanningHandoff(null);
    onActiveSurfaceChange(surfaceId);
  }

  function keepExecutionTreeDraft() {
    setPendingWorkspaceExit(null);
  }

  function leaveExecutionTreeDraft() {
    const pendingExit = pendingWorkspaceExit;

    setPendingWorkspaceExit(null);

    if (!pendingExit) {
      return;
    }

    if (pendingExit.type === "close") {
      onClose();
      return;
    }

    if(pendingExit.type === "scope") { onRecordScopeChange?.(pendingExit.scope); return; }
    setPlanningHandoff(null);
    onActiveSurfaceChange(pendingExit.surfaceId);
  }

  function openWorkspacePackageAction(target: DeliveryHomeTarget) {
    if (target.surfaceId === "intake" && target.sourceId) {
      setWorkspaceIntakeFocus({
        returnSurfaceId: activeSurfaceId,
        sourceId: target.sourceId,
        token: Date.now(),
      });
      onActiveSurfaceChange("intake");
      return;
    }

    if (!target.packageId) {
      onActiveSurfaceChange(target.surfaceId);
      return;
    }

    const targetSurface = deliverySurfaces.find(
      (surface) => surface.id === target.surfaceId,
    );
    const targetPackage = model.packages.find(
      (deliveryPackage) =>
        deliveryPackage.delivery_package_id === target.packageId,
    );

    if (!targetSurface || !targetPackage) {
      onActiveSurfaceChange(target.surfaceId);
      return;
    }

    setWorkspacePackageAction({
      deliveryPackage: targetPackage,
      route: packageActionForSurface(targetSurface, targetPackage).route,
      surface: targetSurface,
    });
  }

  function closeFocusedIntakeSource() {
    const returnSurfaceId = workspaceIntakeFocus?.returnSurfaceId ?? "home";

    setWorkspaceIntakeFocus(null);
    onActiveSurfaceChange(returnSurfaceId);
  }

  return (
    <PIPlanningPreviewContext.Provider value={model.history_scope !== "history" ? {
      plans: model.preview_pi_plans ?? {},
      preview: localPlanning,
      open: (packageId) => {
        if (activeSurfaceId !== "refinement" && activeSurfaceId !== "execution-board") return;
        if (dirtyExecutionTreeDraftActive()) return;
        setPlanningHandoff({ packageId, from: activeSurfaceId });
        onActiveSurfaceChange("pi-planning");
      },
    } : null}>
    <TerasModalShell
      agentHost
      bodyLayout="fill"
      description={localPlanning ? "Disconnected preview of the Delivery workspace." : contract.surfacePurpose}
      kicker="Delivery Workspace"
      modalAttributes={getOperationWorkbenchSurfaceAttributes(contract)}
      onClose={requestWorkspaceClose}
      height="fill"
      surfaceId="delivery-workspace-modal"
      title="Delivery Workspace"
      width="viewport"
    >
      <TerasFullscreenSurfaceFrame
        data-compact-toolbar={compactBoardLayout ? "true" : undefined}
        nav={
          <TerasSurfaceNav
            ariaLabel="Delivery workspace sections"
            description="Switch between delivery control surfaces."
            keepCurrentVisible={compactBoardLayout}
            kicker="Workspace Nav"
            title="Delivery Areas"
          >
            {onRecordScopeChange ? (
              <TerasActionRow spacing="none">
                <TerasSegmentedControl
                  ariaLabel="Delivery record scope"
                  disabled={activeSurfaceId === "home" || activeSurfaceId === "catalog" || activeSurfaceId === "pi-planning"}
                  layout="fit"
                  size="compact"
                  value={model.history_scope ?? "current"}
                  options={[
                    { label: "Current", value: "current" as const },
                    { label: "History", value: "history" as const },
                  ]}
                  onValueChange={(scope) => {
                    if (planningDraftDirty || dirtyExecutionTreeDraftActive()) {
                      setPendingWorkspaceExit({ type: "scope", scope });
                    } else {
                      onRecordScopeChange(scope);
                    }
                  }}
                />
              </TerasActionRow>
            ) : null}
            {workspaceSections.map((surface, index) => {
              const count = deliverySurfaceItemCount({
                executionCount,
                model,
                surfaceId: surface.id,
              });

              return (
                <TerasSurfaceNavButton
                  current={activeSurfaceId === surface.id}
                  data-delivery-workspace-section={surface.id}
                  key={surface.id}
                  kicker={String(index + 1).padStart(2, "0")}
                  meta={
                    surface.id === "home"
                      ? "Command"
                      : surface.id === "catalog"
                        ? undefined
                        : String(count)
                  }
                  onClick={() => requestActiveSurfaceChange(surface.id)}
                  title={surface.id === "pi-planning" ? surface.title : workspaceNavTitle(surface.id)}
                  tone={surface.tone}
                />
              );
            })}
          </TerasSurfaceNav>
        }
        summary={
          <TerasSurfaceSummaryHeader
            ariaLabel="Delivery workspace summary"
            description={workspaceSummaryDescription}
            metrics={workspaceSummaryStats.map(metric => ({
              ...metric,
              value: metric.value === "—" ? <span aria-label="Total not available"
                title={activeSurfaceId === "pi-planning" ? "Select a PI after planning data has loaded."
                  : "The full total is not available. Open Intake to browse source history."}>—</span> : metric.value,
            }))}
            statuses={projectOperationSurfaceStatusItems(
              deliveryWorkspaceComponentStatuses(model),
            )}
            title={`${model.history_scope ? model.history_scope === "history" ? "History · " : "Current · " : ""}${workBoardSummary?.title ?? deliveryWorkspaceSummaryTitle(activeSurfaceId)}`}
          />
        }
      >
        {activeSurfaceId === "pi-planning" ? <DeliveryPIPlanningSurface
          model={model}
          source={localPlanning ? null : planningSource}
          previousPI={planningIncrement}
          focusPackageId={planningHandoff?.packageId ?? null}
          onDirtyChange={setPlanningDraftDirty}
          onPlanningIncrementChange={setPlanningIncrement}
          onCanonicalChanged={onExecutionChanged}
          onModelRead={setPlanningSource}
          returnLabel={planningHandoff ? "Back to " + workspaceNavTitle(planningHandoff.from) : undefined}
          onReturn={planningHandoff ? () => {
            if (planningHandoff.from === "refinement") onRequestPackageRegisterFocus("refinement", planningHandoff.packageId);
            else onActiveSurfaceChange("execution-board");
            setPlanningHandoff(null);
          } : undefined}
        /> : <DeliveryWorkspaceSurfaceContent
          onExecutionChanged={onExecutionChanged}
          key={`${activeSurfaceId}:${model.history_scope??"preview"}`}
          activeSurfaceId={activeSurfaceId}
          catalogDeliveryLinkTarget={catalogDeliveryLinkTarget}
          catalogRepositoryFocusId={
            entryIntent?.requiredMoveRef ===
            "delivery.catalog.repository-reconciliation"
              ? entryIntent.subjectRef
              : null
          }
          executionFocusPackageId={
            entryIntent?.requiredMoveRef.startsWith("delivery.execution-board.")
              ? entryIntent.subjectRef
              : null
          }
          model={model}
          onActiveSurfaceChange={requestActiveSurfaceChange}
          onClearIntakeFocus={() => setWorkspaceIntakeFocus(null)}
          onCloseFocusedIntakeSource={closeFocusedIntakeSource}
          onConsumeSource={onConsumeSource}
          onExecutionTreeEditStateChange={recordExecutionTreeEditState}
          onExecutionWorkBoardSummaryChange={setExecutionWorkBoardSummary}
          onOpenCatalogForDelivery={(target) => {
            setCatalogDeliveryLinkTarget(target);
            onActiveSurfaceChange("catalog");
          }}
          intakeFocus={workspaceIntakeFocus}
          onOpenPackageAction={openWorkspacePackageAction}
          onRequestPackageRegisterFocus={onRequestPackageRegisterFocus}
          onWorkDesignApplied={onWorkDesignApplied}
          packageRegisterFocus={packageRegisterFocus}
        />}
      </TerasFullscreenSurfaceFrame>
      <DeliveryPackageWorkflowRouter
        model={model}
        onCloseRefinement={() => setWorkspacePackageAction(null)}
        onCloseWorkDesign={() => setWorkspacePackageAction(null)}
        onOpenRefinementPackage={onRequestPackageRegisterFocus}
        onRefreshRegister={() => undefined}
        onWorkDesignApplied={(deliveryPackage, record) => {
          onWorkDesignApplied(deliveryPackage, record);
        }}
        packageAction={workspacePackageAction}
      />
      <TerasDraftCloseGuardDialog
        description={
          planningDraftDirty ? "This PI plan has unsaved changes. Record the plan or discard the draft before leaving."
            : pendingWorkspaceExit?.type === "close"
            ? `An execution tree draft${executionTreeEditState.packageLabel ? ` for ${executionTreeEditState.packageLabel}` : ""} has unsaved changes. Closing Delivery Workspace will discard it.`
            : `An execution tree draft${executionTreeEditState.packageLabel ? ` for ${executionTreeEditState.packageLabel}` : ""} has unsaved changes. Switching Delivery areas will discard it.`
        }
        kicker={planningDraftDirty ? "PI Planning Draft" : "Execution Tree Draft"}
        keepEditingLabel="Keep Editing"
        leaveLabel={
          pendingWorkspaceExit?.type === "close"
            ? "Close Workspace"
            : "Switch Area"
        }
        onKeepEditing={keepExecutionTreeDraft}
        onLeave={leaveExecutionTreeDraft}
        open={Boolean(pendingWorkspaceExit)}
        title={
          pendingWorkspaceExit?.type === "close"
            ? "Close Delivery Workspace?"
            : planningDraftDirty ? "Leave PI Planning?" : "Leave Execution Board?"
        }
      />
    </TerasModalShell>
    </PIPlanningPreviewContext.Provider>
  );
}

function DeliveryWorkspaceSurfaceContent({
  onExecutionChanged,
  activeSurfaceId,
  catalogDeliveryLinkTarget,
  catalogRepositoryFocusId,
  executionFocusPackageId,
  model,
  onActiveSurfaceChange,
  onClearIntakeFocus,
  onCloseFocusedIntakeSource,
  onConsumeSource,
  onExecutionTreeEditStateChange,
  onExecutionWorkBoardSummaryChange,
  onOpenCatalogForDelivery,
  intakeFocus,
  onOpenPackageAction,
  onRequestPackageRegisterFocus,
  onWorkDesignApplied,
  packageRegisterFocus,
}: {
  onExecutionChanged?: () => Promise<void>;
  activeSurfaceId: DeliveryWorkspaceSurfaceId;
  catalogDeliveryLinkTarget: CatalogDeliveryLinkTarget | null;
  catalogRepositoryFocusId: string | null;
  executionFocusPackageId: string | null;
  model: DeliveryReadModel;
  onActiveSurfaceChange: (surfaceId: DeliveryWorkspaceSurfaceId) => void;
  onClearIntakeFocus: () => void;
  onCloseFocusedIntakeSource: () => void;
  onConsumeSource: (source: DeliveryIntakeSource) => void;
  onExecutionTreeEditStateChange: (state: ExecutionTreeEditState) => void;
  onExecutionWorkBoardSummaryChange: (summary: ExecutionWorkBoardSummary | null) => void;
  onOpenCatalogForDelivery: (target: CatalogDeliveryLinkTarget | null) => void;
  intakeFocus: {
    returnSurfaceId: DeliveryWorkspaceSurfaceId;
    sourceId: string;
    token: number;
  } | null;
  onOpenPackageAction: (target: DeliveryHomeTarget) => void;
  onRequestPackageRegisterFocus: (
    surfaceId: Extract<
      DeliveryWorkspaceSurfaceId,
      "refinement" | "work-design"
    >,
    packageId: string,
  ) => void;
  onWorkDesignApplied: (
    deliveryPackage: DeliveryPackageSummary,
    record: WorkDesignApplyReceipt,
  ) => void;
  packageRegisterFocus: DeliveryPackageRegisterFocus | null;
}) {
  if (activeSurfaceId === "home") {
    return (
      <DeliveryHomeSurface
        model={model}
        onActiveSurfaceChange={onActiveSurfaceChange}
        onOpenPackageAction={onOpenPackageAction}
      />
    );
  }

  if (activeSurfaceId === "catalog") {
    return (
      <DeliveryCatalogSurface
        deliveryLinkTarget={catalogDeliveryLinkTarget}
        model={model}
        repositoryFocusId={catalogRepositoryFocusId}
      />
    );
  }

  const activeSurface = deliverySurfaces.find(
    (surface) => surface.id === activeSurfaceId,
  );

  if (!activeSurface) {
    return <DeliveryCatalogSurface model={model} />;
  }

  if (activeSurface.id === "execution-board") {
    return (
      <DeliveryExecutionBoard
        onCanonicalChanged={onExecutionChanged}
        focusPackageId={executionFocusPackageId}
        model={model}
        onOpenCatalog={onOpenCatalogForDelivery}
        onTreeEditStateChange={onExecutionTreeEditStateChange}
        onWorkBoardSummaryChange={onExecutionWorkBoardSummaryChange}
        showIntro={false}
      />
    );
  }

  if (activeSurface.id === "intake") {
    return (
      <DeliveryIntakeSurface
        focusSourceId={intakeFocus?.sourceId ?? null}
        focusToken={intakeFocus?.token ?? null}
        model={model}
        onCloseFocusedSource={onCloseFocusedIntakeSource}
        onConsumeSource={(source) => {
          onClearIntakeFocus();
          onConsumeSource(source);
          onActiveSurfaceChange("work-design");
        }}
        surface={activeSurface}
      />
    );
  }

  const focusedPackageId =
    packageRegisterFocus?.surfaceId === activeSurface.id
      ? packageRegisterFocus.packageId
      : null;
  const focusedToken =
    packageRegisterFocus?.surfaceId === activeSurface.id
      ? packageRegisterFocus.token
      : null;

  if (activeSurface.id === "work-design") {
    return (
      <DeliveryWorkDesignSurface
        focusPackageId={focusedPackageId}
        focusToken={focusedToken}
        model={model}
        onRequestPackageRegisterFocus={onRequestPackageRegisterFocus}
        onWorkDesignApplied={onWorkDesignApplied}
        surface={activeSurface}
      />
    );
  }

  return (
    <DeliveryRefinementSurface
      focusPackageId={focusedPackageId}
      focusToken={focusedToken}
      model={model}
      onCanonicalChanged={onExecutionChanged}
      onRequestPackageRegisterFocus={onRequestPackageRegisterFocus}
      onWorkDesignApplied={onWorkDesignApplied}
      surface={activeSurface}
    />
  );
}

function workspaceNavTitle(surfaceId: DeliveryWorkspaceSurfaceId) {
  switch (surfaceId) {
    case "execution-board":
      return "Execution";
    case "catalog":
      return "Catalog";
    default:
      return (
        deliveryWorkspaceSurfaces.find((surface) => surface.id === surfaceId)
          ?.title ?? surfaceId
      );
  }
}
