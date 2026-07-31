"use client";

import { useEffect, useMemo, useState } from "react";

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
import { useExecutionActionSession } from "./action-session/use-execution-action-session.ts";
import { ExecutionSelectedPackagePanel } from "./execution-selected-package-panel.tsx";
import {
  executionTreeDraftFromArtNode,
  executionTreeDraftToControlBoardTreeNode,
  executionTreeInitialExpandedNodeIds,
  findExecutionTreeNode,
  type ExecutionTreeDraftNode,
} from "./execution-board-view-model.ts";
import { ExecutionTreeEditView } from "./execution-tree-edit-view.tsx";
import { ExecutionTreeEditSupportPanel } from "./execution-tree-edit-support-panel.tsx";

export type ExecutionTreeEditState = {
  active: boolean;
  dirty: boolean;
  packageLabel: string | null;
};

export function DeliveryExecutionBoard({
  focusPackageId = null,
  model,
  onTreeEditStateChange,
  showIntro = true,
}: {
  focusPackageId?: string | null;
  model: DeliveryReadModel;
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
  const [treeDraftDirty, setTreeDraftDirty] = useState(false);
  const [discardDraftGuardOpen, setDiscardDraftGuardOpen] = useState(false);
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
  const actionSession = useExecutionActionSession();

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
    setTreeDraftPackageId(null);
    setTreeEditPackageId(null);
    setTreeDraftDirty(false);
    setDiscardDraftGuardOpen(false);
    setTreeExpandedNodeIds([]);
    setTreeOpenDetailNodeId(null);
    setTreeSelectedNodeId(null);
    setTreeAddMenuNodeId(null);
  }

  function enterTreeEdit(action: DeliveryAvailableAction) {
    if (
      action.action_type !== "edit-work-tree" ||
      !selectedPackage ||
      !selectedTree
    ) {
      return false;
    }

    const activeDraft =
      treeDraftPackageId === selectedPackage.delivery_package_id && treeDraft
        ? treeDraft
        : executionTreeDraftFromArtNode(selectedTree);

    setTreeDraft(activeDraft);
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

  function handleActionSelect(action: DeliveryAvailableAction) {
    if (enterTreeEdit(action)) {
      return;
    }

    actionSession.openAction(action);
  }

  function handleSelectedPackageChange(nextPackageId: string) {
    if (nextPackageId !== selectedPackageId) {
      resetTreeEditDraft();
    }

    setSelectedPackageId(nextPackageId);
  }

  function handleTreeDraftChange(nextTree: ExecutionTreeDraftNode) {
    setTreeDraft(nextTree);
    setTreeDraftDirty(true);
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
            onDoneEditing={() => setTreeEditPackageId(null)}
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
          canSubmit={actionSession.canSubmit}
          details={selectedDetails}
          model={model}
          onApplyAction={actionSession.applyAction}
          onClose={actionSession.closeAction}
          onActionStepChange={actionSession.setActionStep}
          packageSummary={selectedPackage}
          packageTree={selectedTree}
          receipt={actionSession.receipt}
          submitting={actionSession.applying}
        />
      ) : null}
      <TerasDraftCloseGuardDialog
        description="This will discard the local execution tree draft and restore the projected ART tree for the selected package."
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
