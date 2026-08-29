"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DeliveryReadModel } from "../../../read-model/index.ts";
import type { DeliveryAvailableAction } from "../../../read-model/index.ts";
import {
  getAvailableActions,
  getDeliveryEffectivePackageProjection,
  getExecutionBoardPackages,
  getPackageAuditEvents,
  getPackageById,
  getPackageDetailsById,
  getPackageTree,
} from "../../../read-model/index.ts";

import {
  TerasDraftCloseGuardDialog,
  TerasDialog,
  TerasEmptyState,
  TerasSegmentedControl,
} from "@/teras";
import {
  ControlBoardArtTreeView,
  ControlBoardFamilyMapView,
  ControlBoardThinHeader,
  ControlBoardView,
  ControlBoardWorkspaceFrame,
  ControlBoardWorkspaceHeader,
  controlBoardViewOptions,
  type ControlBoardViewMode,
} from "@/product-apps/control-board";
import {
  deliveryControlBoardFamilyGroups,
  deliveryControlBoardPostureTerms,
  deliveryControlBoardTreeByPackageId,
  deliveryPackagesToControlBoardPackages,
} from "../../../product-adapters/control-board/index.ts";
import { ExecutionActionModal } from "./action-session/execution-action-modal.tsx";
import {
  useExecutionActionSession,
  type ExecutionActionSubmission,
} from "./action-session/use-execution-action-session.ts";
import { ExecutionSelectedPackagePanel } from "./execution-selected-package-panel.tsx";
import {
  executionTreeDraftFromArtNode,
  executionTreeDraftFromChangeNode,
  executionTreeDraftToControlBoardTreeNode,
  executionTreeInitialExpandedNodeIds,
  findExecutionTreeNode,
  type ExecutionTreeDraftNode,
} from "./execution-board-view-model.ts";
import { ExecutionTreeChangeReviewDialog } from "./execution-tree-change-review-dialog.tsx";
import { ExecutionTreeEditView } from "./execution-tree-edit-view.tsx";
import { ExecutionTreeEditSupportPanel } from "./execution-tree-edit-support-panel.tsx";
import { useDeliveryWorkSessionLiveRuntime } from "../../../live-runtime/use-delivery-work-session-live-runtime.ts";
import { ExecutionWorkSessionModal } from "./work-session/execution-work-session-modal.tsx";
import { useDeliveryChangeLiveRuntime } from "../../../live-runtime/use-delivery-change-live-runtime.ts";
import { useDeliveryCloseoutLiveRuntime } from "../../../live-runtime/use-delivery-closeout-live-runtime.ts";
import {
  buildExecutionTreeChangePlan,
  createdWorkItemId,
} from "../../../work-model/execution/execution-tree-change-plan.ts";
import {
  deliveryChangeAcceptanceNote,
  deliveryChangeOperationForExecutionAction,
  executionActionReceiptFromDeliveryChange,
} from "../../../work-model/execution/execution-change-operation.ts";
import { ExecutionCloseoutModal } from "./action-session/closeout/execution-closeout-modal.tsx";

export type ExecutionTreeEditState = {
  active: boolean;
  dirty: boolean;
  packageLabel: string | null;
};

export function DeliveryExecutionBoard({
  focusPackageId = null,
  model,
  onOpenCatalog,
  onTreeEditStateChange,
  showIntro = true,
}: {
  focusPackageId?: string | null;
  model: DeliveryReadModel;
  onOpenCatalog?: () => void;
  onTreeEditStateChange?: (state: ExecutionTreeEditState) => void;
  showIntro?: boolean;
}) {
  const [activeView, setActiveView] =
    useState<ControlBoardViewMode>("control-board");
  const [selectedPackageId, setSelectedPackageId] = useState(
    model.selected_delivery_package_id,
  );
  const [treeDraftPackageId, setTreeDraftPackageId] = useState<string | null>(
    null,
  );
  const [treeEditPackageId, setTreeEditPackageId] = useState<string | null>(
    null,
  );
  const [treeDraft, setTreeDraft] = useState<ExecutionTreeDraftNode | null>(
    null,
  );
  const [treeDraftBaseline, setTreeDraftBaseline] =
    useState<ExecutionTreeDraftNode | null>(null);
  const [treeDraftDirty, setTreeDraftDirty] = useState(false);
  const [discardDraftGuardOpen, setDiscardDraftGuardOpen] = useState(false);
  const [treeChangeReviewOpen, setTreeChangeReviewOpen] = useState(false);
  const [treeChangeSubmitting, setTreeChangeSubmitting] = useState(false);
  const [treeChangeError, setTreeChangeError] = useState<string | null>(null);
  const [treeChangeAcceptanceNote, setTreeChangeAcceptanceNote] = useState("");
  const [treeAppliedChangeIds, setTreeAppliedChangeIds] = useState<string[]>([]);
  const treeResolvedNodeIds = useRef(new Map<string, string>());
  const [treeEditEntryError, setTreeEditEntryError] = useState<string | null>(
    null,
  );
  const [treeExpandedNodeIds, setTreeExpandedNodeIds] = useState<string[]>([]);
  const [treeOpenDetailNodeId, setTreeOpenDetailNodeId] = useState<
    string | null
  >(null);
  const [treeSelectedNodeId, setTreeSelectedNodeId] = useState<string | null>(
    null,
  );
  const [treeAddMenuNodeId, setTreeAddMenuNodeId] = useState<string | null>(
    null,
  );
  const [workSessionOpen, setWorkSessionOpen] = useState(false);
  const [closeoutOpen, setCloseoutOpen] = useState(false);

  useEffect(() => {
    if (
      focusPackageId &&
      model.packages.some(
        (deliveryPackage) =>
          deliveryPackage.delivery_package_id === focusPackageId,
      )
    ) {
      setSelectedPackageId(focusPackageId);
    }
  }, [focusPackageId, model.packages]);

  const packages = useMemo(() => getExecutionBoardPackages(model), [model]);
  const boardPackages = useMemo(
    () => deliveryPackagesToControlBoardPackages({ model, packages }),
    [model, packages],
  );
  const boardPackageTreeById = useMemo(
    () => deliveryControlBoardTreeByPackageId({ model, packages }),
    [model, packages],
  );
  const selectedPackage =
    getPackageById(selectedPackageId, model) ?? packages[0] ?? null;
  const selectedDetails = selectedPackage
    ? getPackageDetailsById(selectedPackage.delivery_package_id, model)
    : null;
  const selectedTree = selectedPackage
    ? getPackageTree(selectedPackage.delivery_package_id, model)
    : null;
  const deliveryChangeRuntime = useDeliveryChangeLiveRuntime(
    selectedPackage?.legacy_epic_id ?? null,
  );
  const deliveryCloseoutRuntime = useDeliveryCloseoutLiveRuntime(
    closeoutOpen ? (selectedPackage?.legacy_epic_id ?? null) : null,
  );
  const submitLiveExecutionAction = useCallback(
    async (submission: ExecutionActionSubmission) => {
      if (deliveryChangeRuntime.mode === "disconnected-preview") return null;
      if (deliveryChangeRuntime.mode !== "live") {
        throw new Error("Canonical Delivery change truth is unavailable.");
      }
      const operation = deliveryChangeOperationForExecutionAction(submission);
      if (!operation) {
        throw new Error(
          "This action does not have an admitted live Delivery change route.",
        );
      }
      const result = await deliveryChangeRuntime.apply(
        operation,
        deliveryChangeAcceptanceNote(
          submission.action,
          submission.applyIntent,
        ),
      );
      if (!result) return null;
      if (result.status !== "applied" && result.status !== "routed") {
        throw new Error(
          `${result.next_action.label}: the Delivery change was ${result.status.replaceAll("_", " ")}.`,
        );
      }
      return executionActionReceiptFromDeliveryChange({
        ...submission,
        packageId: submission.packageSummary.delivery_package_id,
        result,
      });
    },
    [deliveryChangeRuntime.apply, deliveryChangeRuntime.mode],
  );
  const actionSession = useExecutionActionSession({
    submitLive: submitLiveExecutionAction,
  });
  const selectedBoardTree = selectedPackage
    ? (boardPackageTreeById[selectedPackage.delivery_package_id] ?? null)
    : null;
  const selectedTreeDraftActive =
    selectedPackage &&
    treeDraftPackageId === selectedPackage.delivery_package_id
      ? treeDraft
      : null;
  const selectedBoardTreeWithDraft = selectedTreeDraftActive
    ? executionTreeDraftToControlBoardTreeNode(selectedTreeDraftActive)
    : selectedBoardTree;
  const treeEditActive =
    selectedPackage &&
    treeEditPackageId === selectedPackage.delivery_package_id &&
    selectedTreeDraftActive
      ? selectedTreeDraftActive
      : null;
  const selectedTreeEditNode =
    treeEditActive && treeSelectedNodeId
      ? (findExecutionTreeNode(treeEditActive, treeSelectedNodeId) ??
        treeEditActive)
      : treeEditActive;
  const treeChangePlan = useMemo(
    () =>
      treeDraftBaseline && treeDraft
        ? buildExecutionTreeChangePlan({
            baseline: treeDraftBaseline,
            draft: treeDraft,
          })
        : [],
    [treeDraft, treeDraftBaseline],
  );
  const pendingTreeChangePlan = useMemo(
    () =>
      treeChangePlan.filter(
        (item) => !treeAppliedChangeIds.includes(item.id),
      ),
    [treeAppliedChangeIds, treeChangePlan],
  );

  useEffect(() => {
    onTreeEditStateChange?.({
      active: Boolean(treeEditActive),
      dirty: treeDraftDirty,
      packageLabel: selectedPackage?.display_name ?? null,
    });
  }, [
    onTreeEditStateChange,
    selectedPackage?.display_name,
    treeDraftDirty,
    treeEditActive,
  ]);

  useEffect(() => {
    return () => {
      onTreeEditStateChange?.({
        active: false,
        dirty: false,
        packageLabel: null,
      });
    };
  }, [onTreeEditStateChange]);
  const selectedActions = selectedPackage
    ? getAvailableActions(selectedPackage.delivery_package_id, model)
    : [];
  const selectedStartIntent = selectedPackage
    ? model.apply_intents.find(
        (intent) =>
          intent.action_type === "start-work" &&
          intent.delivery_package_id === selectedPackage.delivery_package_id,
      ) ?? null
    : null;
  const selectedWorkItemId = selectedStartIntent?.target_work_item_id ?? null;
  const workSessionRuntime =
    useDeliveryWorkSessionLiveRuntime(selectedWorkItemId);

  useEffect(() => {
    if (
      !workSessionOpen ||
      workSessionRuntime.mode !== "disconnected-preview"
    ) {
      return;
    }
    const startAction = selectedActions.find(
      (action) => action.action_type === "start-work",
    );
    setWorkSessionOpen(false);
    if (startAction) actionSession.openAction(startAction);
  }, [
    actionSession.openAction,
    selectedActions,
    workSessionOpen,
    workSessionRuntime.mode,
  ]);

  useEffect(() => {
    if (
      !closeoutOpen ||
      deliveryCloseoutRuntime.mode !== "disconnected-preview"
    ) {
      return;
    }
    const closeoutAction = selectedActions.find(
      (action) => action.action_type === "open-closeout",
    );
    setCloseoutOpen(false);
    if (closeoutAction) actionSession.openAction(closeoutAction);
  }, [
    actionSession.openAction,
    closeoutOpen,
    deliveryCloseoutRuntime.mode,
    selectedActions,
  ]);
  const selectedAuditEvents = selectedPackage
    ? getPackageAuditEvents(selectedPackage.delivery_package_id, model)
    : [];
  const boardViewSwitcher = (
    <TerasSegmentedControl
      ariaLabel={
        treeEditActive
          ? "Execution Board views locked during tree edit"
          : "Execution Board views"
      }
      disabled={Boolean(treeEditActive)}
      onValueChange={(nextView) => {
        if (!treeEditActive) {
          setActiveView(nextView);
        }
      }}
      options={controlBoardViewOptions.map((option) => ({
        label: option.label,
        value: option.view,
      }))}
      value={activeView}
    />
  );
  const boardHeader = showIntro ? (
    <ControlBoardWorkspaceHeader
      actions={boardViewSwitcher}
      kicker="Execution Board"
      title="Delivery Package Control"
      description={
        treeEditActive
          ? "Tree edit mode locks this board to ART Tree until the draft is done or discarded."
          : "Select a package, inspect wider ART context, then open only the action draft or review modal required for the selected move."
      }
    />
  ) : (
    <ControlBoardThinHeader
      actions={boardViewSwitcher}
      kicker="Board View"
      description={
        treeEditActive
          ? "Tree edit mode locks this board to ART Tree until the draft is done or discarded."
          : "Switch between package posture, family map, and hierarchy."
      }
    />
  );

  function resetTreeEditDraft() {
    setTreeDraft(null);
    setTreeDraftBaseline(null);
    setTreeDraftPackageId(null);
    setTreeEditPackageId(null);
    setTreeDraftDirty(false);
    setDiscardDraftGuardOpen(false);
    setTreeChangeReviewOpen(false);
    setTreeChangeSubmitting(false);
    setTreeChangeError(null);
    setTreeChangeAcceptanceNote("");
    setTreeAppliedChangeIds([]);
    treeResolvedNodeIds.current = new Map();
    setTreeExpandedNodeIds([]);
    setTreeOpenDetailNodeId(null);
    setTreeSelectedNodeId(null);
    setTreeAddMenuNodeId(null);
  }

  async function enterTreeEdit(action: DeliveryAvailableAction) {
    if (
      action.action_type !== "edit-work-tree" ||
      !selectedPackage ||
      !selectedTree
    ) {
      return false;
    }

    setTreeEditEntryError(null);
    let activeDraft =
      treeDraftPackageId === selectedPackage.delivery_package_id && treeDraft
        ? treeDraft
        : executionTreeDraftFromArtNode(selectedTree);
    let baselineDraft =
      treeDraftPackageId === selectedPackage.delivery_package_id &&
      treeDraftBaseline
        ? treeDraftBaseline
        : executionTreeDraftFromArtNode(selectedTree);

    const canonicalSnapshot = await deliveryChangeRuntime.refresh();
    if (canonicalSnapshot.mode === "live") {
      if (!canonicalSnapshot.projection) {
        throw new Error("Canonical Delivery change truth is unavailable.");
      }
      activeDraft = executionTreeDraftFromChangeNode(
        canonicalSnapshot.projection.package.execution_tree,
      );
      baselineDraft = activeDraft;
    }

    setTreeDraft(activeDraft);
    setTreeDraftBaseline(baselineDraft);
    setTreeDraftPackageId(selectedPackage.delivery_package_id);
    setTreeEditPackageId(selectedPackage.delivery_package_id);
    setTreeDraftDirty(
      treeDraftPackageId === selectedPackage.delivery_package_id &&
        treeDraftDirty,
    );
    setTreeExpandedNodeIds(executionTreeInitialExpandedNodeIds(activeDraft));
    setTreeOpenDetailNodeId(activeDraft.id);
    setTreeSelectedNodeId(activeDraft.id);
    setTreeAddMenuNodeId(null);
    setActiveView("art-tree");

    return true;
  }

  async function handleActionSelect(action: DeliveryAvailableAction) {
    if (action.action_type === "sync-owner-repo") {
      if (onOpenCatalog) {
        onOpenCatalog();
      } else {
        setTreeEditEntryError(
          "Delivery Catalog is unavailable from this Execution Board.",
        );
      }
      return;
    }

    if (action.action_type === "edit-work-tree") {
      try {
        if (await enterTreeEdit(action)) return;
      } catch (error) {
        setTreeEditEntryError(
          error instanceof Error
            ? error.message
            : "Canonical Delivery change truth is unavailable.",
        );
        return;
      }
    }

    if (
      action.action_type === "start-work" &&
      workSessionRuntime.mode !== "disconnected-preview"
    ) {
      setWorkSessionOpen(true);
      return;
    }

    if (action.action_type === "open-closeout") {
      setCloseoutOpen(true);
      return;
    }

    actionSession.openAction(action);
  }

  function handleSelectedPackageChange(nextPackageId: string) {
    if (nextPackageId !== selectedPackageId) {
      resetTreeEditDraft();
      setWorkSessionOpen(false);
      setCloseoutOpen(false);
    }

    setSelectedPackageId(nextPackageId);
  }

  function handleTreeDraftChange(nextTree: ExecutionTreeDraftNode) {
    setTreeDraft(nextTree);
    setTreeDraftDirty(true);
  }

  function finishTreeEditing() {
    if (!treeDraftDirty) {
      setTreeEditPackageId(null);
      return;
    }
    if (deliveryChangeRuntime.mode === "disconnected-preview") {
      setTreeEditPackageId(null);
      return;
    }
    if (treeChangePlan.length === 0) {
      setTreeDraftDirty(false);
      setTreeEditPackageId(null);
      return;
    }
    setTreeAppliedChangeIds([]);
    treeResolvedNodeIds.current = new Map();
    setTreeChangeError(null);
    setTreeChangeReviewOpen(true);
  }

  async function applyTreeChanges() {
    if (
      !treeDraft ||
      pendingTreeChangePlan.length === 0 ||
      !treeChangeAcceptanceNote.trim()
    ) {
      return;
    }
    setTreeChangeSubmitting(true);
    setTreeChangeError(null);
    const resolvedNodeIds = new Map(treeResolvedNodeIds.current);
    try {
      for (const item of pendingTreeChangePlan) {
        const result = await deliveryChangeRuntime.apply(
          item.buildOperation(resolvedNodeIds),
          treeChangeAcceptanceNote.trim(),
        );
        if (!result) {
          throw new Error("Live Delivery change authority is unavailable.");
        }
        if (result.status !== "applied") {
          throw new Error(
            `${result.next_action.label}: the Delivery change was ${result.status.replaceAll("_", " ")}.`,
          );
        }
        if (item.localNodeId) {
          const workItemId = createdWorkItemId(result.event.effect);
          if (!workItemId) {
            throw new Error(
              "OOS applied the new work item but did not return its canonical identity.",
            );
          }
          resolvedNodeIds.set(item.localNodeId, workItemId);
          treeResolvedNodeIds.current = new Map(resolvedNodeIds);
        }
        setTreeAppliedChangeIds((current) =>
          current.includes(item.id) ? current : [...current, item.id],
        );
      }
      const refreshed = await deliveryChangeRuntime.refresh();
      if (!refreshed.projection) {
        throw new Error(
          "Delivery changes applied but canonical readback is unavailable.",
        );
      }
      const canonicalTree = executionTreeDraftFromChangeNode(
        refreshed.projection.package.execution_tree,
      );
      setTreeDraft(canonicalTree);
      setTreeDraftBaseline(canonicalTree);
      setTreeDraftDirty(false);
      setTreeEditPackageId(null);
      setTreeChangeReviewOpen(false);
      setTreeChangeAcceptanceNote("");
      setTreeAppliedChangeIds([]);
      treeResolvedNodeIds.current = new Map();
    } catch (error) {
      setTreeChangeError(
        error instanceof Error ? error.message : "Delivery change apply failed.",
      );
    } finally {
      setTreeChangeSubmitting(false);
    }
  }

  const boardContent = (
    <>
      {activeView === "control-board" ? (
        <ControlBoardView
          packages={boardPackages}
          postureTerms={deliveryControlBoardPostureTerms}
          selectedPackageId={selectedPackage?.delivery_package_id ?? null}
          onSelectPackage={handleSelectedPackageChange}
        />
      ) : null}
      {activeView === "family-map" ? (
        <ControlBoardFamilyMapView
          familyGroups={deliveryControlBoardFamilyGroups}
          packages={boardPackages}
          postureTerms={deliveryControlBoardPostureTerms}
          selectedPackageId={selectedPackage?.delivery_package_id ?? null}
          onSelectPackage={handleSelectedPackageChange}
        />
      ) : null}
      {activeView === "art-tree" ? (
        treeEditActive ? (
          <ExecutionTreeEditView
            addMenuNodeId={treeAddMenuNodeId}
            expandedNodeIds={treeExpandedNodeIds}
            onDiscardDraft={() => setDiscardDraftGuardOpen(true)}
            onDoneEditing={finishTreeEditing}
            onExpandedNodeIdsChange={setTreeExpandedNodeIds}
            onOpenDetailNodeIdChange={setTreeOpenDetailNodeId}
            onSelectedNodeIdChange={setTreeSelectedNodeId}
            onTreeAddMenuNodeIdChange={setTreeAddMenuNodeId}
            onTreeChange={handleTreeDraftChange}
            openDetailNodeId={treeOpenDetailNodeId}
            selectedNodeId={treeSelectedNodeId ?? treeEditActive.id}
            tree={treeEditActive}
          />
        ) : (
          <ControlBoardArtTreeView tree={selectedBoardTreeWithDraft} />
        )
      ) : null}
    </>
  );
  const selectedContent =
    selectedPackage && treeEditActive && selectedTreeEditNode ? (
      <ExecutionTreeEditSupportPanel
        packageSummary={selectedPackage}
        selectedNode={selectedTreeEditNode}
      />
    ) : selectedPackage ? (
      <ExecutionSelectedPackagePanel
        auditEvents={selectedAuditEvents}
        details={selectedDetails}
        onActionSelect={handleActionSelect}
        packageSummary={selectedPackage}
        packageTree={selectedTree}
        selectedActions={selectedActions}
      />
    ) : (
      <TerasEmptyState fill>
        Select a Delivery Package to inspect available actions, current
        execution target, audit events, and tree context.
      </TerasEmptyState>
    );
  const selectedPackageProjection = selectedPackage
    ? getDeliveryEffectivePackageProjection(selectedPackage)
    : null;

  return (
    <>
      <ControlBoardWorkspaceFrame
        board={boardContent}
        boardVariant={activeView === "art-tree" ? "dark" : "light"}
        header={boardHeader}
        selected={selectedContent}
        selectedActive={Boolean(selectedPackage)}
        selectedFrame={treeEditActive ? "bare" : "panel"}
        selectedTone={
          treeEditActive ? "warn" : (selectedPackageProjection?.tone ?? "info")
        }
      />
      {selectedPackage && actionSession.activeAction ? (
        <ExecutionActionModal
          action={actionSession.activeAction}
          actionStep={actionSession.actionStep}
          auditEvents={selectedAuditEvents}
          canSubmit={
            actionSession.canSubmit &&
            (deliveryChangeRuntime.mode === "disconnected-preview" ||
              (deliveryChangeRuntime.mode === "live" &&
                deliveryChangeRuntime.projectionStatus === "current" &&
                Boolean(deliveryChangeRuntime.projection)))
          }
          details={selectedDetails}
          error={actionSession.error}
          model={model}
          onApplyAction={actionSession.applyAction}
          onClose={actionSession.closeAction}
          onActionStepChange={actionSession.setActionStep}
          packageSummary={selectedPackage}
          packageTree={selectedTree}
          receipt={actionSession.receipt}
          sourceRevision={
            deliveryChangeRuntime.mode === "live"
              ? deliveryChangeRuntime.projection?.source_revision
              : undefined
          }
          submitting={actionSession.applying}
        />
      ) : null}
      {selectedPackage && workSessionOpen ? (
        <ExecutionWorkSessionModal
          onClose={() => setWorkSessionOpen(false)}
          packageSummary={selectedPackage}
          runtime={workSessionRuntime}
          workItemId={selectedWorkItemId}
        />
      ) : null}
      {selectedPackage && closeoutOpen ? (
        <ExecutionCloseoutModal
          onClose={() => setCloseoutOpen(false)}
          packageSummary={selectedPackage}
          runtime={deliveryCloseoutRuntime}
        />
      ) : null}
      <ExecutionTreeChangeReviewDialog
        acceptanceNote={treeChangeAcceptanceNote}
        error={treeChangeError}
        onAcceptanceNoteChange={setTreeChangeAcceptanceNote}
        onApply={() => void applyTreeChanges()}
        onClose={() => {
          if (!treeChangeSubmitting) setTreeChangeReviewOpen(false);
        }}
        open={treeChangeReviewOpen}
        plan={pendingTreeChangePlan}
        submitting={treeChangeSubmitting}
      />
      <TerasDialog
        closeLabel="Close Delivery change notice"
        contentOverflow="auto"
        description="The requested governed Delivery route is not currently available."
        height="content"
        kicker="Execution Board"
        onClose={() => setTreeEditEntryError(null)}
        open={Boolean(treeEditEntryError)}
        title="Delivery Change Unavailable"
        width="compact"
      >
        <TerasEmptyState>{treeEditEntryError}</TerasEmptyState>
      </TerasDialog>
      <TerasDraftCloseGuardDialog
        description="This will discard the unsaved execution tree draft and restore the last projected tree for the selected package."
        kicker="Execution Tree Draft"
        keepEditingLabel="Keep Editing"
        leaveLabel="Discard Draft"
        onKeepEditing={() => setDiscardDraftGuardOpen(false)}
        onLeave={resetTreeEditDraft}
        open={discardDraftGuardOpen}
        title="Discard Draft?"
      />
    </>
  );
}
