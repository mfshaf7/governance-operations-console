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
  TerasModalShell,
  TerasFullscreenSurfaceFrame,
  TerasSurfaceNav,
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
import { DeliveryIntakeSurface } from "../surfaces/intake/intake-surface.tsx";
import { DeliveryCatalogSurface } from "../surfaces/catalog/catalog-surface.tsx";
import { DeliveryRefinementSurface } from "../surfaces/refinement/refinement-surface.tsx";
import { DeliveryWorkDesignSurface } from "../surfaces/work-design/work-design-surface.tsx";
import type { WorkDesignApplyReceipt } from "../../work-model/work-design/work-design-types.ts";
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

export function DeliveryWorkspaceModal({
  activeSurfaceId,
  contract,
  entryIntent,
  executionCount,
  model,
  onActiveSurfaceChange,
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
  model: DeliveryReadModel;
  onActiveSurfaceChange: (surfaceId: DeliveryWorkspaceSurfaceId) => void;
  onClose: () => void;
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
  const [workspacePackageAction, setWorkspacePackageAction] =
    useState<DeliveryPackageActionState | null>(null);
  const [workspaceIntakeFocus, setWorkspaceIntakeFocus] = useState<{
    returnSurfaceId: DeliveryWorkspaceSurfaceId;
    sourceId: string;
    token: number;
  } | null>(null);
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
    | null
  >(null);
  const workspaceSummaryStats = deliveryWorkspaceSummaryStats({
    activeSurfaceId,
    executionCount,
    model,
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
    if (dirtyExecutionTreeDraftActive()) {
      setPendingWorkspaceExit({ type: "close" });
      return;
    }

    onClose();
  }

  function requestActiveSurfaceChange(surfaceId: DeliveryWorkspaceSurfaceId) {
    if (surfaceId === activeSurfaceId) {
      return;
    }

    if (dirtyExecutionTreeDraftActive()) {
      setPendingWorkspaceExit({
        surfaceId,
        type: "surface",
      });
      return;
    }

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
    <TerasModalShell
      bodyLayout="fill"
      description="Fullscreen Delivery workspace for intake, work design, refinement, execution, and Delivery Catalog."
      kicker="Delivery Workspace"
      modalAttributes={getOperationWorkbenchSurfaceAttributes(contract)}
      onClose={requestWorkspaceClose}
      height="fill"
      surfaceId="delivery-workspace-modal"
      title="Delivery Workspace"
      width="viewport"
    >
      <TerasFullscreenSurfaceFrame
        nav={
          <TerasSurfaceNav
            ariaLabel="Delivery workspace sections"
            description="Switch between delivery control surfaces."
            kicker="Workspace Nav"
            title="Delivery Areas"
          >
            {deliveryWorkspaceSurfaces.map((surface) => {
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
                  kicker={surface.kicker}
                  meta={
                    surface.id === "home"
                      ? "Command"
                      : surface.id === "catalog"
                        ? "Gated"
                        : String(count)
                  }
                  onClick={() => requestActiveSurfaceChange(surface.id)}
                  title={workspaceNavTitle(surface.id)}
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
            metrics={workspaceSummaryStats}
            statuses={projectOperationSurfaceStatusItems(
              deliveryWorkspaceComponentStatuses(model),
            )}
            title={deliveryWorkspaceSummaryTitle(activeSurfaceId)}
          />
        }
      >
        <DeliveryWorkspaceSurfaceContent
          activeSurfaceId={activeSurfaceId}
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
          intakeFocus={workspaceIntakeFocus}
          onOpenPackageAction={openWorkspacePackageAction}
          onRequestPackageRegisterFocus={onRequestPackageRegisterFocus}
          onWorkDesignApplied={onWorkDesignApplied}
          packageRegisterFocus={packageRegisterFocus}
        />
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
          pendingWorkspaceExit?.type === "close"
            ? `An execution tree draft${executionTreeEditState.packageLabel ? ` for ${executionTreeEditState.packageLabel}` : ""} has unsaved changes. Closing Delivery Workspace will discard it.`
            : `An execution tree draft${executionTreeEditState.packageLabel ? ` for ${executionTreeEditState.packageLabel}` : ""} has unsaved changes. Switching Delivery areas will discard it.`
        }
        kicker="Execution Tree Draft"
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
            : "Leave Execution Board?"
        }
      />
    </TerasModalShell>
  );
}

function DeliveryWorkspaceSurfaceContent({
  activeSurfaceId,
  executionFocusPackageId,
  model,
  onActiveSurfaceChange,
  onClearIntakeFocus,
  onCloseFocusedIntakeSource,
  onConsumeSource,
  onExecutionTreeEditStateChange,
  intakeFocus,
  onOpenPackageAction,
  onRequestPackageRegisterFocus,
  onWorkDesignApplied,
  packageRegisterFocus,
}: {
  activeSurfaceId: DeliveryWorkspaceSurfaceId;
  executionFocusPackageId: string | null;
  model: DeliveryReadModel;
  onActiveSurfaceChange: (surfaceId: DeliveryWorkspaceSurfaceId) => void;
  onClearIntakeFocus: () => void;
  onCloseFocusedIntakeSource: () => void;
  onConsumeSource: (source: DeliveryIntakeSource) => void;
  onExecutionTreeEditStateChange: (state: ExecutionTreeEditState) => void;
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
    return <DeliveryCatalogSurface model={model} />;
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
        focusPackageId={executionFocusPackageId}
        model={model}
        onOpenCatalog={() => onActiveSurfaceChange("catalog")}
        onTreeEditStateChange={onExecutionTreeEditStateChange}
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
