"use client";

import { previewPIPlansForEpic } from "../../../local-runtime/projections/pi-planning-preview.ts";
import { useWorkspaceViewState } from "../../../../../console-integration/registers/workspace-view-state.ts";
import { withExecutionTreeDependencies } from "../../../work-model/execution/execution-tree-dependencies.ts";
import { useProjectContextChoices } from "@/agent-console";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DeliveryArtNode, DeliveryAvailableAction, DeliveryReadModel } from "../../../read-model/index.ts";
import {
  getAvailableActions,
  getChildCounts,
  getDeliveryEffectivePackageProjection,
  getExecutionBoardPackages,
  getExecutionBoardSelectedPackage,
  getPackageAuditEvents,
  getPackageDetailsById,
  getPackageTree,
} from "../../../read-model/index.ts";

import { TerasLoadingState,
  TerasActionButton,
  TerasActionRow,
  TerasDraftCloseGuardDialog,
  TerasDialog,
  TerasEmptyState,
  TerasFieldStack,
  TerasRecordMetaText,
  TerasSegmentedControl,
  TerasTextField,
} from "@/teras";
import { TerasSelectControl, type TerasSelectOption } from "@/teras/teras-select-control";
import {
  ControlBoardFamilyMapView,
  ControlBoardThinHeader,
  ControlBoardView,
  ControlBoardWorkspaceFrame,
  ControlBoardWorkspaceHeader,
} from "@/product-apps/control-board";
import { ControlBoardCanvasField, ControlBoardCanvasNavigation } from "@/product-apps/control-board/control-board-inspection-layout";
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
  ExecutionPackageWorkBoard,
  ExecutionPackageWorkItemPanel,
  ExecutionWorkBoardContextPanel,
  executionPackageWorkItems,
  executionPackageWorkMetrics,
  type ExecutionPackageWorkItem,
  type ExecutionWorkDependency,
  type ExecutionWorkBoardSummary,
} from "./execution-package-work-board.tsx";
import {
  executionTreeDraftFromArtNode,
  executionTreeDraftFromChangeNode,
  executionTreeFromBoardNode,
  executionTreeInitialExpandedNodeIds,
  findExecutionTreeNode,
  updateExecutionTreeNode,
  type ExecutionTreeDraftNode,
} from "./execution-board-view-model.ts";
import { ExecutionTreeChangeReviewDialog } from "./execution-tree-change-review-dialog.tsx";
import { ExecutionWorkTree } from "./execution-tree-edit-view.tsx";
import { ExecutionTreeEditSupportPanel } from "./execution-tree-edit-support-panel.tsx";
import { useDeliveryWorkSessionLiveRuntime } from "../../../live-runtime/use-delivery-work-session-live-runtime.ts";
import type { ExecutionPlanStarterTransfer } from "./work-session/execution-technical-plan-guidance.tsx";
import { technicalPlanGuidanceScope } from "../../../work-model/execution/technical-plan-guidance.ts";
import { ExecutionWorkSessionModal } from "./work-session/execution-work-session-modal.tsx";
import { ExecutionItemCompletionModal } from "./work-session/execution-item-completion-modal.tsx";
import {
  directExecutionWorkSessionTarget,
  executionInspectionPackage,
  parseExecutionWorkItemReference,
  type ExecutionWorkSessionTarget,
} from "./work-session/execution-work-session-target.ts";
import { DeliveryCommandUnconfirmed } from "../../../live-runtime/delivery-command-outcome.ts";
import { useDeliveryChangeLiveRuntime } from "../../../live-runtime/use-delivery-change-live-runtime.ts";
import { useDeliveryCloseoutLiveRuntime } from "../../../live-runtime/use-delivery-closeout-live-runtime.ts";
import { DeliveryHistoryDialog,useDeliveryOwnerHistory } from "../../workflows/shared/history/delivery-history-dialog.tsx";
import { deliveryPackageInspectionTree } from "../../../live-runtime/delivery-history-tree.ts";
import {
  buildExecutionTreeChangePlan,
  createdWorkItemId,
  executionTreePlanningInputIssues,
  executionCreationPlanningChoices,
} from "../../../work-model/execution/execution-tree-change-plan.ts";
import {
  deliveryChangeAcceptanceNote,
  deliveryChangeOperationForExecutionAction,
  executionActionReceiptFromDeliveryChange,
} from "../../../work-model/execution/execution-change-operation.ts";
import { ExecutionCloseoutModal } from "./action-session/closeout/execution-closeout-modal.tsx";
import type { CatalogDeliveryLinkTarget } from "../../../live-runtime/catalog-live-types.ts";
import { technicalPlanRequirement } from "../../../work-model/execution/technical-plan-requirement.ts";
import { ArchitecturePacketAuthoringModal } from "./architecture-packet/architecture-packet-authoring-modal.tsx";
import { executionChangeCommandRoute, executionReviewActions } from "../../../work-model/execution/execution-review-actions.ts";
import { executionWorkChoices } from "../../../work-model/execution/execution-package-content.ts";
import type { DeliveryChangeNode } from "../../../live-runtime/delivery-change-live-types.ts";
import { useCatalogLiveRuntime } from "../../../live-runtime/use-catalog-live-runtime.ts";
import { calendarDateRange, datedIterationIndex, recordedPlanningIteration } from "../../../work-model/catalog/planning-calendar.ts";

export type ExecutionTreeEditState = {
  active: boolean;
  dirty: boolean;
  packageLabel: string | null;
};

type BoardLevel = "execution" | "package" | "feature" | "all-work";

const boardLevelLabels: Record<BoardLevel, string> = {
  execution: "Package Board",
  package: "Epic Board",
  feature: "Feature Board",
  "all-work": "All Work",
};

type BoardLocation = {
  packageId: string;
  view: "execution" | "work-board" | "art-tree";
  scope: string;
  workItemId: string | null;
  featureId: string | null;
};

function boardLocationLabel(location: BoardLocation) {
  if (location.view === "execution") return boardLevelLabels.execution;
  if (location.view === "art-tree") return "Work Tree";
  if (location.scope === "all-work") return boardLevelLabels["all-work"];
  return location.scope && location.scope !== "choose-feature" ? boardLevelLabels.feature : boardLevelLabels.package;
}

function hasBlockedReviewTarget(tree: DeliveryChangeNode, workItemId: number): boolean {
  return tree.id === workItemId ? tree.status === "blocked"
    : tree.children.some(child => hasBlockedReviewTarget(child, workItemId));
}

export function DeliveryExecutionBoard({
  focusPackageId = null,
  model,
  onOpenCatalog,
  onTreeEditStateChange,
  onWorkBoardSummaryChange,
  showIntro = true,
  onCanonicalChanged,
}: {
  focusPackageId?: string | null;
  model: DeliveryReadModel;
  onOpenCatalog?: (target: CatalogDeliveryLinkTarget | null) => void;
  onTreeEditStateChange?: (state: ExecutionTreeEditState) => void;
  onWorkBoardSummaryChange?: (summary: ExecutionWorkBoardSummary | null) => void;
  showIntro?: boolean;
  onCanonicalChanged?: () => Promise<void>;
}) {
  const readOnly = model.history_scope === "history";
  const [historyOpen, setHistoryOpen] = useState(false);
  const [findStructureOpen, setFindStructureOpen] = useState(false);
  const [artReference, setArtReference] = useState("");
  const [findStructureError, setFindStructureError] = useState<string | null>(null);
  const [overviewView, setOverviewView] = useWorkspaceViewState<"control-board" | "family-map">("delivery-execution:overview", "control-board");
  const [activeView, setActiveView] = useWorkspaceViewState<"work-board" | "art-tree">(`delivery-execution:${model.history_scope}:work-view`, "work-board");
  const [selectedPackageId, setSelectedPackageId] = useWorkspaceViewState(`delivery-execution:${model.history_scope}:package`, "");
  const [packageWorkspaceOpen, setPackageWorkspaceOpen] = useWorkspaceViewState(`delivery-execution:${model.history_scope}:package-open`, false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [boardScope, setBoardScope] = useState("");
  const [lastFeatureId, setLastFeatureId] = useState<string | null>(null);
  const [boardHistory, setBoardHistory] = useState<BoardLocation[]>([]);
  const openedFocus = useRef<string | null>(null);
  const boardHeading = useRef<HTMLDivElement>(null);
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
  const [treeEditEntering,setTreeEditEntering]=useState(false);
  const [treeReadRetrying, setTreeReadRetrying] = useState(false);
  const [treeChangeSuccess,setTreeChangeSuccess]=useState<number|null>(null);
  const [treeChangeError, setTreeChangeError] = useState<string | null>(null);
  const [treeChangeAcceptanceNote, setTreeChangeAcceptanceNote] = useState("");
  const [treeAppliedChangeIds, setTreeAppliedChangeIds] = useState<string[]>([]);
  const [treeActiveChangeId, setTreeActiveChangeId] = useState<string|null>(null);
  const treeReviewRevision = useRef<string|undefined>(undefined);
  const treeResolvedNodeIds = useRef(new Map<string, string>());
  const treeAwaitingChangeId = useRef<string | null>(null);
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
  const [workSessionTarget, setWorkSessionTarget] =
    useState<ExecutionWorkSessionTarget | null>(null);
  const [completionTarget, setCompletionTarget] = useState<number | null>(null);
  const [closeoutOpen, setCloseoutOpen] = useState(false);
  const [architecturePacketOpen, setArchitecturePacketOpen] = useState(false);
  const [planStarter, setPlanStarter] = useState<ExecutionPlanStarterTransfer | null>(null);
  const [inspectApprovedPlan, setInspectApprovedPlan] = useState(false);
  const [technicalPlanWorkItemId, setTechnicalPlanWorkItemId] = useState<number | null>(null);
  const [actionReview, setActionReview] = useState<{ revision?: string; target?: DeliveryArtNode } | null>(null);

  useEffect(() => {
    if (!focusPackageId) {
      openedFocus.current = null;
      return;
    }
    if (openedFocus.current === focusPackageId) return;
    if (model.packages.some(item => item.delivery_package_id === focusPackageId)) {
      openedFocus.current = focusPackageId;
      setSelectedPackageId(focusPackageId);
      setActiveView("work-board");
      setSelectedChildId(null);
      setBoardScope("");
      setLastFeatureId(null);
      setBoardHistory([]);
    }
  }, [focusPackageId, model.packages, setActiveView, setSelectedPackageId]);

  const packages = useMemo(() => getExecutionBoardPackages(model), [model]);
  const boardPackages = useMemo(
    () => deliveryPackagesToControlBoardPackages({ model, packages }),
    [model, packages],
  );
  const boardPackageTreeById = useMemo(
    () => deliveryControlBoardTreeByPackageId({ model, packages: model.packages }),
    [model],
  );
  const selectedPackage = getExecutionBoardSelectedPackage(selectedPackageId, model);
  useProjectContextChoices(model.source_truth === "OpenProject-backed OOS" && selectedPackage
    ? [{ kind: "delivery", id: selectedPackage.delivery_package_id, title: selectedPackage.display_name }] : []);
  const selectedDetails = selectedPackage
    ? getPackageDetailsById(selectedPackage.delivery_package_id, model)
    : null;
  const selectedTree = selectedPackage
    ? getPackageTree(selectedPackage.delivery_package_id, model)
    : null;
  const plannedScope = selectedPackage ? previewPIPlansForEpic(model.preview_pi_plans, selectedPackage.legacy_epic_id) : [];
  const packageWorkItems = useMemo(() => executionPackageWorkItems(selectedTree, selectedPackage), [selectedTree, selectedPackage]);
  const localPlanning = model.source_truth === "mock";
  const schedulingCatalog = useCatalogLiveRuntime({ enabled: !localPlanning });
  const schedulingValues = localPlanning ? model.catalog.values
    : schedulingCatalog.projectionStatus === "current" ? schedulingCatalog.readModel?.values : undefined;
  const calendar = useMemo(() => datedIterationIndex(schedulingValues ?? []), [schedulingValues]);
  const planningChoices = useMemo(() => schedulingValues &&
    (localPlanning || schedulingCatalog.projection?.projection_status === "ready")
    ? executionCreationPlanningChoices(schedulingValues) : undefined,
    [schedulingValues, localPlanning, schedulingCatalog.projection?.projection_status]);
  const previewPlacements = new Map(plannedScope.flatMap(plan => plan.assignments.map(item => [item.itemId, {
    pi: plan.pi, iteration: item.iteration,
  }] as const)));

  function planningPlacement(node: DeliveryArtNode | undefined) {
    if (!node) return undefined;
    const preview = previewPlacements.get(node.id);
    const pi = preview?.pi ?? node.planning?.targetPI;
    const iteration = recordedPlanningIteration(preview?.iteration ?? node.planning?.iteration);
    if (!pi || !iteration) return undefined;
    const match = calendar.get(iteration);
    return { pi, iteration, dates: match?.pi === pi
      ? calendarDateRange(match.window.start_date, match.window.end_date) : undefined };
  }

  const placedWork = packageWorkItems.flatMap(({ node }) => {
    const placement = planningPlacement(node);
    return placement && !["parked", "retired"].includes(node.backend_status) ? [placement] : [];
  });
  const scheduledPlacements = placedWork.filter(placement => placement.dates);
  const scheduledWork = schedulingValues ? scheduledPlacements.length : null;
  const scheduledPIs = [...new Set(scheduledPlacements.map(placement => placement.pi))];
  const featureChoices = useMemo(() => packageWorkItems.filter(item => item.featureProgress).map(({ node }) => ({
    label: node.title,
    value: node.id,
  })), [packageWorkItems]);
  const choosingFeature = boardScope === "choose-feature" && featureChoices.length > 0;
  const activeScope = boardScope === "all-work" || choosingFeature || featureChoices.some(feature => feature.value === boardScope) ? boardScope : "";
  const scopedFeature = packageWorkItems.find(item => item.featureProgress && item.node.id === activeScope);
  const shownFeature = activeView === "work-board" ? scopedFeature : undefined;
  const packageBoardLevel: BoardLevel = activeView === "art-tree" ? "package"
    : activeScope === "all-work" ? "all-work" : shownFeature || choosingFeature ? "feature" : "package";
  useEffect(() => {
    if (packageWorkspaceOpen) boardHeading.current?.focus({ preventScroll: true });
  }, [packageWorkspaceOpen, activeScope]);
  const visibleWorkItems = useMemo(() => {
    if (activeScope === "all-work") return packageWorkItems.filter(item => !item.featureProgress);
    return packageWorkItems.filter(item => (item.feature?.id ?? "") === activeScope);
  }, [activeScope, packageWorkItems]);

  const workBoardSummary = useMemo<ExecutionWorkBoardSummary | null>(() => {
    if (!packageWorkspaceOpen || !selectedPackage) return null;
    const showingWorkBoard = activeView === "work-board";
    const title = showingWorkBoard && activeScope === "all-work" ? "All Work"
      : showingWorkBoard && (scopedFeature || choosingFeature) ? "Feature Work" : "Epic Work";
    const items = showingWorkBoard ? visibleWorkItems : packageWorkItems.filter(item => !item.feature);
    return { title, metrics: selectedTree && (!showingWorkBoard || !choosingFeature) ? executionPackageWorkMetrics(items) : [] };
  }, [packageWorkspaceOpen, selectedPackage, selectedTree, activeView, activeScope, scopedFeature, choosingFeature, visibleWorkItems, packageWorkItems]);
  useEffect(() => {
    onWorkBoardSummaryChange?.(workBoardSummary);
    return () => onWorkBoardSummaryChange?.(null);
  }, [onWorkBoardSummaryChange, workBoardSummary]);
  const selectedChild = visibleWorkItems.find(item => item.node.id === selectedChildId) ?? null;
  const boardLocation: BoardLocation = {
    packageId: selectedPackage?.delivery_package_id ?? "",
    view: packageWorkspaceOpen ? activeView : "execution",
    scope: activeScope,
    workItemId: selectedChild?.node.id ?? null,
    featureId: lastFeatureId,
  };
  const previousBoardIndex = boardHistory.reduce((last, location, index) =>
    location.view === "execution" || model.packages.some(item => item.delivery_package_id === location.packageId) ? index : last,
  -1);
  const previousBoard = previousBoardIndex >= 0 ? boardHistory[previousBoardIndex] : undefined;
  const backLabel = previousBoard ? boardLocationLabel(previousBoard) : boardLevelLabels.execution;

  const deliveryChangeRuntime = useDeliveryChangeLiveRuntime(
    selectedPackage?.legacy_epic_id ?? null,
  );
  const disconnectedPreview = model.source_truth === "mock" || deliveryChangeRuntime.mode === "disconnected-preview";
  const deliveryCloseoutRuntime = useDeliveryCloseoutLiveRuntime(
    !readOnly && closeoutOpen ? (selectedPackage?.legacy_epic_id ?? null) : null,
    onCanonicalChanged,
  );
  const submitLiveExecutionAction = useCallback(
    async (submission: ExecutionActionSubmission) => {
      if (readOnly) throw new Error("Delivery History is read-only.");
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
        submission.applyIntent.source_revision,
      );
      if (!result) throw new Error("Delivery could not confirm the action result. Check the work item before trying again.");
      if (result.status !== "applied" && result.status !== "routed") {
        throw new Error(
          `${result.next_action.label}: the Delivery change was ${result.status.replaceAll("_", " ")}.`,
        );
      }
      await onCanonicalChanged?.();
      return executionActionReceiptFromDeliveryChange({
        ...submission,
        packageId: submission.packageSummary.delivery_package_id,
        result,
      });
    },
    [deliveryChangeRuntime.apply, deliveryChangeRuntime.mode, readOnly, onCanonicalChanged],
  );
  const actionSession = useExecutionActionSession({
    submitLive: submitLiveExecutionAction,
  });
  const useOwnerTree = readOnly || model.source_truth === "OpenProject-backed OOS";
  const treePackageId = selectedPackage?.delivery_package_id;
  const ownerTree = useMemo(() => {
    if (!useOwnerTree || !treePackageId || deliveryChangeRuntime.projectionStatus !== "current") return null;
    try {
      return deliveryPackageInspectionTree(deliveryChangeRuntime.projection, treePackageId);
    } catch {
      return null;
    }
  }, [useOwnerTree, treePackageId, deliveryChangeRuntime.projection, deliveryChangeRuntime.projectionStatus]);
  const selectedBoardTree = useOwnerTree
    ? ownerTree
    : treePackageId ? boardPackageTreeById[treePackageId] ?? null : null;
  const selectedTreeDraftActive =
    selectedPackage &&
    treeDraftPackageId === selectedPackage.delivery_package_id
      ? treeDraft
      : null;
  const readTree = useMemo(
    () => selectedBoardTree ? executionTreeFromBoardNode(selectedBoardTree) : null,
    [selectedBoardTree],
  );
  const workTree = readOnly ? readTree : selectedTreeDraftActive ?? readTree;
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
    const changeId = treeAwaitingChangeId.current;
    if (!changeId || (deliveryChangeRuntime.operationStatus !== "completed" &&
        deliveryChangeRuntime.operationStatus !== "failed")) return;
    treeAwaitingChangeId.current = null;
    const result = deliveryChangeRuntime.lastResult;
    if (deliveryChangeRuntime.operationStatus === "failed" || result?.status !== "applied") {
      setTreeChangeError("Review the saved work structure before continuing with the remaining changes.");
      return;
    }
    const item = treeChangePlan.find(entry => entry.id === changeId);
    if (item?.localNodeId) {
      const created = createdWorkItemId(result.event.effect);
      if (!created) {
        setTreeChangeError("The change was saved. Reopen the work structure to confirm the new item before continuing.");
        setTreeAppliedChangeIds(current => current.includes(changeId) ? current : [...current, changeId]);
        return;
      }
      treeResolvedNodeIds.current.set(item.localNodeId, created);
    }
    treeReviewRevision.current = result.after.source_revision;
    setTreeAppliedChangeIds(current => current.includes(changeId) ? current : [...current, changeId]);
    setTreeChangeError(null);
  }, [deliveryChangeRuntime.lastResult, deliveryChangeRuntime.operationStatus, treeChangePlan]);

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
    ? model.source_truth === "OpenProject-backed OOS"
      ? executionReviewActions(deliveryChangeRuntime.projection, selectedPackage)
      : getAvailableActions(selectedPackage.delivery_package_id, model)
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
    useDeliveryWorkSessionLiveRuntime(readOnly ? null : workSessionTarget?.workItemId ?? null, onCanonicalChanged);

  const planRequirement = technicalPlanRequirement({deliveryId:selectedPackage?.legacy_epic_id ? `delivery-${selectedPackage.legacy_epic_id}` : "",projection:workSessionRuntime.projection,
    workItemId:workSessionTarget?.workItemId,available:model.source_truth === "OpenProject-backed OOS" && !workSessionRuntime.projectionError && workSessionRuntime.projectionStatus !== "offline"});
  const guidanceDeliveryId = workSessionRuntime.projection?.delivery_id;
  const guidanceWorkItemId = workSessionTarget?.workItemId;
  const packageProjection = deliveryChangeRuntime.projection;
  const sourceContext = useMemo(() => packageProjection && deliveryChangeRuntime.projectionStatus === "current" &&
    !deliveryChangeRuntime.projectionError && packageProjection.delivery_id === selectedPackage?.delivery_package_id &&
    packageProjection.package.execution_tree.id === selectedPackage.legacy_epic_id
    ? { tree: packageProjection.package.execution_tree, revision: packageProjection.source_revision }
    : undefined, [packageProjection, deliveryChangeRuntime.projectionStatus, deliveryChangeRuntime.projectionError,
    selectedPackage?.delivery_package_id, selectedPackage?.legacy_epic_id]);
  const planGuidance = useMemo(() => workSessionOpen && guidanceDeliveryId && guidanceWorkItemId && !deliveryChangeRuntime.loading
    ? technicalPlanGuidanceScope(model, guidanceDeliveryId, guidanceWorkItemId, sourceContext)
    : null, [workSessionOpen, guidanceDeliveryId, guidanceWorkItemId, model, sourceContext, deliveryChangeRuntime.loading]);

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
  const ownerHistory=useDeliveryOwnerHistory(model.source_truth === "OpenProject-backed OOS" ? selectedPackage?.delivery_package_id??null : null);
  const selectedAuditEvents = selectedPackage && ownerHistory.projection
    ? [...ownerHistory.projection.events,...(ownerHistory.projection.activity?.items??[])].map(event=>({actor:event.actor,category:event.receipt_ref?"receipt" as const:"action" as const,delivery_package_id:selectedPackage.delivery_package_id,
      detail:"detail" in event&&typeof event.detail==="string"?event.detail:event.evidence_refs.join(" · "),event_id:event.event_id,occurred_at:event.occurred_at,receipt_id:event.receipt_ref,title:event.title,tone:event.tone})).sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at))
    : selectedPackage
    ? getPackageAuditEvents(selectedPackage.delivery_package_id, model)
    : [];
  const overviewHeaderActions = (
    <TerasActionRow spacing="tight">
      {model.source_truth === "OpenProject-backed OOS" && !readOnly ? (
        <TerasActionButton emphasis="secondary" onClick={() => {
          setArtReference("");
          setFindStructureError(null);
          setFindStructureOpen(true);
        }}>Find Work Tree</TerasActionButton>
      ) : null}
      <TerasSegmentedControl
        ariaLabel="Execution Board views"
        onValueChange={setOverviewView}
        options={[
          { label: "Control Board", value: "control-board" },
          { label: "Family Map", value: "family-map" },
        ]}
        value={overviewView}
      />
    </TerasActionRow>
  );
  const overviewHeader = showIntro ? (
    <ControlBoardWorkspaceHeader
      actions={overviewHeaderActions}
      kicker={boardLevelLabels.execution}
      title="Delivery Package Control"
      description="Select a package to inspect its status and open its workspace."
    />
  ) : (
    <ControlBoardThinHeader
      actions={overviewHeaderActions}
      kicker="Board View"
      description="Switch between package posture and family map."
    />
  );
  const packageHeader = selectedPackage ? (
    <div ref={boardHeading} tabIndex={-1}>
      <ControlBoardWorkspaceHeader
        kicker={shownFeature ? `Feature #${shownFeature.node.legacy_work_package_id ?? "—"}`
          : selectedPackage.legacy_epic_id ? `Epic #${selectedPackage.legacy_epic_id}` : "Delivery Package"}
        title={shownFeature?.node.title ?? selectedPackage.display_name}
        description={treeEditActive ? "Finish or discard the tree draft to switch views."
          : shownFeature ? selectedPackage.display_name : undefined}
        actions={<TerasSegmentedControl
          ariaLabel="Package workspace views"
          disabled={Boolean(treeEditActive)}
          onValueChange={setActiveView}
          options={[
            { label: "Work Board", value: "work-board" },
            { label: "Work Tree", value: "art-tree" },
          ]}
          value={activeView}
        />}
      />
    </div>
  ) : null;

  const boardLevels: TerasSelectOption<BoardLevel>[] = [{ value: "execution", label: boardLevelLabels.execution }];
  if (selectedPackage) boardLevels.push({ value: "package", label: boardLevelLabels.package });
  if (featureChoices.length > 0) boardLevels.push({ value: "feature", label: boardLevelLabels.feature });
  if (selectedPackage && (featureChoices.length > 0 || activeScope === "all-work")) boardLevels.push({ value: "all-work", label: boardLevelLabels["all-work"] });

  const boardLevelControl = (level: BoardLevel) => (
    <ControlBoardCanvasField>
      <TerasSelectControl
        ariaLabel="Board level"
        disabled={Boolean(treeEditActive) || boardLevels.length === 1}
        menuPlacement="portal"
        onValueChange={changeBoardLevel}
        options={boardLevels}
        placeholder="Choose board"
        value={level}
      />
    </ControlBoardCanvasField>
  );

  const packageCanvasControls = (
    <ControlBoardCanvasNavigation label="Work Board navigation" priorLevel={backLabel}
      disabled={Boolean(treeEditActive)} onBack={goBackOneBoard}>
      {boardLevelControl(packageBoardLevel)}
      {packageBoardLevel === "feature" && (featureChoices.length > 1 || choosingFeature) ? (
        <ControlBoardCanvasField filter>
          <TerasSelectControl
            ariaLabel="Feature filter"
            menuPlacement="portal"
            onValueChange={changeBoardScope}
            options={choosingFeature ? [{ value: "choose-feature", label: "Choose Feature" }, ...featureChoices] : featureChoices}
            placeholder="Choose Feature"
            value={activeScope}
          />
        </ControlBoardCanvasField>
      ) : null}
    </ControlBoardCanvasNavigation>
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
    setTreeActiveChangeId(null);
    treeReviewRevision.current=undefined;
    treeAwaitingChangeId.current = null;
    treeResolvedNodeIds.current = new Map();
    setTreeExpandedNodeIds([]);
    setTreeOpenDetailNodeId(null);
    setTreeSelectedNodeId(null);
    setTreeAddMenuNodeId(null);
  }

  async function enterTreeEdit() {
    if (
      !selectedPackage ||
      !selectedTree
    ) {
      return false;
    }

    setTreeEditEntering(true);
    try {
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
      activeDraft = withExecutionTreeDependencies(executionTreeDraftFromChangeNode(
        canonicalSnapshot.projection.package.execution_tree,
      ),canonicalSnapshot.projection.package.dependency_relations);
      treeReviewRevision.current=canonicalSnapshot.projection.source_revision;
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
    setPackageWorkspaceOpen(true);
    setActiveView("art-tree");

    return true;
    } finally {setTreeEditEntering(false);}
  }

  async function handleActionSelect(action: DeliveryAvailableAction, target?: DeliveryArtNode) {
    if (readOnly || !action.enabled) return;
    if (action.action_type === "sync-owner-repo") {
      const repositoryIntent = selectedPackage ? model.apply_intents.find(intent =>
        intent.delivery_package_id === selectedPackage.delivery_package_id && intent.action_type === action.action_type) : null;
      const repositoryTargetId = repositoryIntent?.target_work_item_id ?? selectedPackage?.legacy_epic_id;
      if (onOpenCatalog) {
        onOpenCatalog(
          selectedPackage?.legacy_epic_id && repositoryTargetId
            ? {
                deliveryId: String(selectedPackage.legacy_epic_id),
                packageLabel: selectedPackage.display_name,
                workItemId: `work-item-${repositoryTargetId}`,
              }
            : null,
        );
      } else {
        setTreeEditEntryError(
          "Delivery Catalog is unavailable from this Execution Board.",
        );
      }
      return;
    }

    setActionReview({ revision: deliveryChangeRuntime.projection?.source_revision, target });
    actionSession.openAction(action);
  }

  function handleSelectedPackageChange(nextPackageId: string) {
    if (nextPackageId !== selectedPackageId) {
      resetTreeEditDraft();
      setWorkSessionOpen(false);
      setWorkSessionTarget(null);
      setCloseoutOpen(false);
      setSelectedChildId(null);
      setBoardScope("");
      setLastFeatureId(null);
      setActiveView("work-board");
    }
    setSelectedPackageId(nextPackageId);
  }

  function applyBoardLocation(location: BoardLocation) {
    if (location.packageId !== boardLocation.packageId) handleSelectedPackageChange(location.packageId);
    setPackageWorkspaceOpen(location.view !== "execution");
    if (location.view !== "execution") setActiveView(location.view);
    setBoardScope(location.scope);
    setSelectedChildId(location.workItemId);
    setLastFeatureId(location.featureId);
  }

  function navigateBoard(destination: BoardLocation) {
    const moved = destination.view !== boardLocation.view ||
      destination.packageId !== boardLocation.packageId || destination.scope !== boardLocation.scope;
    const choosingFeature = boardLocation.view === "work-board" && boardLocation.scope === "choose-feature";
    if (moved && !choosingFeature) {
      setBoardHistory(history => [...history, boardLocation]);
    }
    applyBoardLocation(destination);
  }

  function goBackOneBoard() {
    if (!previousBoard) {
      changeBoardLevel("execution");
      return;
    }
    setBoardHistory(history => history.slice(0, previousBoardIndex));
    applyBoardLocation(previousBoard);
  }

  function openWorkBoard() {
    navigateBoard({ ...boardLocation, view: "work-board" });
  }

  function changeBoardScope(scope: string) {
    const featureId = featureChoices.some(feature => feature.value === scope) ? scope : lastFeatureId;
    navigateBoard({ ...boardLocation, view: "work-board", scope, workItemId: null, featureId });
  }

  function changeBoardLevel(level: BoardLevel) {
    if (level === "execution") {
      setBoardHistory([]);
      applyBoardLocation({ ...boardLocation, view: "execution" });
      return;
    }
    if (level === "feature") {
      const previous = featureChoices.find(feature => feature.value === lastFeatureId);
      changeBoardScope(previous?.value ?? (featureChoices.length === 1 ? featureChoices[0].value : "choose-feature"));
    } else {
      changeBoardScope(level === "all-work" ? "all-work" : "");
    }
  }

  function showWorkItemOnBoard(item: ExecutionPackageWorkItem, packageId = boardLocation.packageId) {
    const scope = item.featureProgress ? item.node.id : item.feature?.id ?? "";
    navigateBoard({
      packageId,
      view: "work-board",
      scope,
      workItemId: item.featureProgress ? null : item.node.id,
      featureId: scope || (packageId === boardLocation.packageId ? lastFeatureId : null),
    });
  }

  function openTechnicalPlan(workItemId: number | null, starter: ExecutionPlanStarterTransfer | null = null, inspectApproved = false) {
    setPlanStarter(starter);
    setInspectApprovedPlan(inspectApproved);
    setTechnicalPlanWorkItemId(workItemId);
    setArchitecturePacketOpen(true);
  }

  async function editWorkStructure() {
    try {
      if (!await enterTreeEdit()) setTreeEditEntryError("The current work structure is unavailable.");
    } catch (error) {
      setTreeEditEntryError(error instanceof Error ? error.message : "The current work structure is unavailable.");
    }
  }

  function openChildAction(item: ExecutionPackageWorkItem) {
    const workItemId = item.node.legacy_work_package_id;
    if (!workItemId) return;
    if (disconnectedPreview) {
      const action = selectedActions.find(item => item.action_type === "start-work" && item.enabled);
      if (action && workItemId === selectedWorkItemId) void handleActionSelect(action);
      return;
    }
    setWorkSessionTarget(directExecutionWorkSessionTarget(workItemId, model, selectedPackage));
    setWorkSessionOpen(true);
  }

  function featureReviewAction(item: ExecutionPackageWorkItem) {
    const id = item.node.legacy_work_package_id;
    if (readOnly || id === null || ["retired", "parked"].includes(item.lane.status)) return null;
    if (!disconnectedPreview && item.sessionRecorded) {
      return <TerasActionButton onClick={() => openChildAction(item)}>Open Work Session</TerasActionButton>;
    }
    if (item.lane.status === "done") return disconnectedPreview ? null :
      <TerasActionButton emphasis="secondary" onClick={() => setCompletionTarget(id)}>View Feature Outcome</TerasActionButton>;
    if (item.lane.status === "blocked") {
      return !item.node.blocker && !item.node.dependency_blocked && visibleWorkItems.some(child => child.lane.status === "blocked")
        ? <TerasRecordMetaText>Select a blocked child item to see what needs attention.</TerasRecordMetaText>
        : null;
    }
    if (getChildCounts(item.node).open_child_count > 0) {
      return <TerasRecordMetaText>Select a child item to continue. Feature completion can be reviewed when its child work is closed.</TerasRecordMetaText>;
    }
    return disconnectedPreview ? null : <TerasActionButton onClick={() => setCompletionTarget(id)}>Review Feature Completion</TerasActionButton>;
  }

  function renderChildAction(item: ExecutionPackageWorkItem) {
    const { node, lane, sessionRecorded } = item;
    if (readOnly || ["retired", "parked"].includes(lane.status)) return null;
    if (!disconnectedPreview && sessionRecorded && node.legacy_work_package_id) {
      return <TerasActionButton onClick={() => openChildAction(item)}>Open Work Session</TerasActionButton>;
    }
    if (lane.status === "done") return null;
    const scheduled = previewPlacements.has(node.id);
    if (selectedPackage?.execution_handoff && plannedScope.length && !scheduled) {
      return <TerasEmptyState>Schedule this work item in PI Planning before starting it.</TerasEmptyState>;
    }
    if (!node.legacy_work_package_id) return <TerasEmptyState>This work item has no recorded ART reference.</TerasEmptyState>;
    if (disconnectedPreview) {
      const canStartInPreview = node.legacy_work_package_id === selectedWorkItemId && lane.status !== "blocked"
        && selectedActions.some(action => action.action_type === "start-work" && action.enabled);
      return canStartInPreview
        ? <TerasActionButton onClick={() => openChildAction(item)}>Review Start</TerasActionButton>
        : lane.status === "blocked" ? null : <TerasEmptyState>Live work sessions are unavailable in this preview.</TerasEmptyState>;
    }
    if (lane.status === "blocked") {
      return <TerasActionButton emphasis="secondary" onClick={() => openChildAction(item)}>Check Work Requirements</TerasActionButton>;
    }
    return <TerasFieldStack spacing="compact">
      <TerasActionRow layout="split">
        <TerasActionButton onClick={() => openChildAction(item)}>Check Work Requirements</TerasActionButton>
        <TerasActionButton emphasis="secondary" onClick={() => setCompletionTarget(node.legacy_work_package_id)}>
          Review Completion
        </TerasActionButton>
      </TerasActionRow>
      <TerasRecordMetaText>Use Review Completion for finished work that required no file changes.</TerasRecordMetaText>
    </TerasFieldStack>;
  }

  function reviewItemBlocker(item: ExecutionPackageWorkItem) {
    const { node, lane } = item;
    const id = node.legacy_work_package_id;
    const projection = deliveryChangeRuntime.projection;
    if (readOnly || disconnectedPreview || lane.status !== "blocked" || !node.blocker || node.dependency_blocked || id === null ||
      deliveryChangeRuntime.projectionStatus !== "current" || !projection || projection.delivery_id !== selectedPackage?.delivery_package_id ||
      !hasBlockedReviewTarget(projection.package.execution_tree, id)) return null;

    return <TerasActionButton size="table-compact" onClick={() => void handleActionSelect({
      action_type: "clear-blocker",
      label: "Review Blocker",
      enabled: true,
      expected_backend_route: executionChangeCommandRoute(projection.delivery_id),
      scope: "execution_target",
      reason: "Review the recorded blocker and confirm the return status after resolving it.",
      tone: "warn",
    }, node)}>Review Blocker</TerasActionButton>;
  }

  function workDependencies(item: ExecutionPackageWorkItem): ExecutionWorkDependency[] {
    const dependencies = new Set(item.node.depends_on_work_package_ids);
    if (dependencies.size === 0) return [];

    const records = new Map(executionWorkChoices(model.art_tree.roots, "all")
      .filter(node => node.legacy_work_package_id !== null && dependencies.has(node.legacy_work_package_id))
      .map(node => [node.legacy_work_package_id, node] as const));
    return [...dependencies].map(id => {
      const node = records.get(id);
      const local = packageWorkItems.find(work => work.node.legacy_work_package_id === id);
      if (local) return { id, node: local.node, onOpen: () => {
        if (boardLocation.scope === "all-work" && !local.featureProgress) {
          navigateBoard({ ...boardLocation, workItemId: local.node.id });
        } else {
          showWorkItemOnBoard(local);
        }
      } };
      if (!node || disconnectedPreview || readOnly) return { id, node };
      try {
        const dependencyPackage = executionInspectionPackage(id, model);
        const target = executionPackageWorkItems(getPackageTree(dependencyPackage.delivery_package_id, model), dependencyPackage)
          .find(work => work.node.legacy_work_package_id === id);
        return { id, node, onOpen: target ? () => showWorkItemOnBoard(target, dependencyPackage.delivery_package_id) : undefined };
      } catch {
        return { id, node };
      }
    });
  }

  function handleTreeDraftChange(nextTree: ExecutionTreeDraftNode) {
    setTreeDraft(nextTree);
    setTreeDraftDirty(true);
  }

  function finishTreeEditing() {
    if (treeDraft) {
      const issues = executionTreePlanningInputIssues(treeDraft, planningChoices);
      if (issues.length) {
        setTreeEditEntryError(issues.join(" "));
        return;
      }
    }
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
      deliveryChangeRuntime.operationStatus === "checking" ||
      !treeDraft ||
      (pendingTreeChangePlan.length === 0 && treeAppliedChangeIds.length === 0) ||
      !treeChangeAcceptanceNote.trim()
    ) {
      return;
    }
    setTreeChangeSubmitting(true);
    setTreeChangeError(null);
    const resolvedNodeIds = new Map(treeResolvedNodeIds.current);
    try {
      for (const item of pendingTreeChangePlan) {
        setTreeActiveChangeId(item.id);
        treeAwaitingChangeId.current = item.id;
        const result = await deliveryChangeRuntime.apply(
          item.buildOperation(resolvedNodeIds),
          treeChangeAcceptanceNote.trim(),
          treeReviewRevision.current,
        );
        treeAwaitingChangeId.current = null;
        if (!result) {
          throw new Error("Live Delivery change authority is unavailable.");
        }
        if (result.status === "partial_failure") {
          throw new Error("The saved work structure changed, and this update could not be confirmed. Reopen the work structure and inspect the result before retrying.");
        }
        if (result.status !== "applied") {
          const nativeError = result.event.effect.error;
          const reason = nativeError && typeof nativeError === "object" && "message" in nativeError && typeof nativeError.message === "string"
            ? nativeError.message
            : `${result.next_action.label}: the Delivery change was ${result.status.replaceAll("_", " ")}.`;
          throw new Error(
            reason,
          );
        }
        if (item.localNodeId) {
          const workItemId = createdWorkItemId(result.event.effect);
          if (!workItemId) {
            throw new Error(
              "Delivery reported that the item was added. Reload the work tree to find its number.",
            );
          }
          resolvedNodeIds.set(item.localNodeId, workItemId);
          treeResolvedNodeIds.current = new Map(resolvedNodeIds);
        }
        setTreeAppliedChangeIds((current) =>
          current.includes(item.id) ? current : [...current, item.id],
        );
        const revision=result.after.source_revision;
        if(typeof revision!=="string"||!revision)throw new Error("The change was acknowledged without its resulting revision. Inspect current owner state before continuing.");
        treeReviewRevision.current=revision;
      }
      const refreshed = await deliveryChangeRuntime.refresh();
      if (!refreshed.projection) {
        throw new Error(
          "Delivery reported that the changes were saved. Reload the board to confirm the current state.",
        );
      }
      if(treeReviewRevision.current&&refreshed.projection.source_revision!==treeReviewRevision.current)throw new Error("Work changed again after the accepted changes. Reopen Work Structure to review the current owner state.");
      const canonicalTree = withExecutionTreeDependencies(executionTreeDraftFromChangeNode(
        refreshed.projection.package.execution_tree,
      ),refreshed.projection.package.dependency_relations);
      setTreeDraft(canonicalTree);
      setTreeDraftBaseline(canonicalTree);
      setTreeDraftDirty(false);
      setTreeEditPackageId(null);
      setTreeChangeReviewOpen(false);
      setTreeChangeAcceptanceNote("");
      setTreeAppliedChangeIds([]);
      treeResolvedNodeIds.current = new Map();
      setTreeChangeSuccess(treeChangePlan.length);
      await onCanonicalChanged?.();
    } catch (error) {
      if (!(error instanceof DeliveryCommandUnconfirmed)) treeAwaitingChangeId.current = null;
      setTreeChangeError(
        error instanceof Error ? error.message : "Delivery change apply failed.",
      );
    } finally {
      setTreeChangeSubmitting(false);
      setTreeActiveChangeId(null);
    }
  }

  const overviewContent = overviewView === "control-board" ? (
    <ControlBoardView packages={boardPackages} postureTerms={deliveryControlBoardPostureTerms}
      hiddenEmptyPostures={["New"]} selectedPackageId={selectedPackage?.delivery_package_id ?? null} onSelectPackage={handleSelectedPackageChange} />
  ) : (
    <ControlBoardFamilyMapView familyGroups={deliveryControlBoardFamilyGroups(model, packages)}
      packages={boardPackages} postureTerms={deliveryControlBoardPostureTerms}
      selectedPackageId={selectedPackage?.delivery_package_id ?? null} onSelectPackage={handleSelectedPackageChange} />
  );

  const workBoardContent = activeView === "work-board" ? (
    selectedTree ? choosingFeature ? (
      <TerasEmptyState fill>Choose a Feature in the board controls.</TerasEmptyState>
    ) : (
      <ExecutionPackageWorkBoard key={`${selectedPackageId}:${activeScope}`} items={visibleWorkItems} selectedId={selectedChildId}
        showFeatureName={activeScope === "all-work"}
        onSelect={item => item.featureProgress ? changeBoardScope(item.node.id) : setSelectedChildId(item.node.id)} />
    ) : deliveryChangeRuntime.loading ? <TerasLoadingState label="Loading package work…" skeleton="details" />
      : <TerasEmptyState fill>No work tree is available for this package.</TerasEmptyState>
  ) : undefined;

  async function retryWorkTree() {
    setTreeReadRetrying(true);
    try {
      await deliveryChangeRuntime.refresh();
    } catch {
      // Keep the retry affordance when the owner read still fails.
    } finally {
      setTreeReadRetrying(false);
    }
  }

  const treeContent = activeView === "art-tree" && selectedPackage ? (
    workTree ? (
      <ExecutionWorkTree
        key={selectedPackage.delivery_package_id}
        tree={workTree}
        editing={treeEditActive && !readOnly ? {
          addMenuNodeId: treeAddMenuNodeId,
          expandedNodeIds: treeExpandedNodeIds,
          onDiscardDraft: () => setDiscardDraftGuardOpen(true),
          onDoneEditing: finishTreeEditing,
          onExpandedNodeIdsChange: setTreeExpandedNodeIds,
          onOpenDetailNodeIdChange: setTreeOpenDetailNodeId,
          onSelectedNodeIdChange: setTreeSelectedNodeId,
          onTreeAddMenuNodeIdChange: setTreeAddMenuNodeId,
          onTreeChange: handleTreeDraftChange,
          openDetailNodeId: treeOpenDetailNodeId,
          planningIssues: executionTreePlanningInputIssues(treeEditActive, planningChoices),
          selectedNodeId: treeSelectedNodeId ?? treeEditActive.id,
        } : undefined}
        actions={!readOnly && (deliveryChangeRuntime.mode === "live" ||
          selectedActions.some(action => action.action_type === "edit-work-tree" && action.enabled)) ? (
          <TerasActionButton size="table-compact" disabled={deliveryChangeRuntime.loading || Boolean(deliveryChangeRuntime.projectionError) || treeEditEntering}
            onClick={() => void editWorkStructure()}>Edit Work Structure</TerasActionButton>
        ) : undefined}
        renderItemActions={(node) => {
          const action = inspectTreeAction(node);
          return action ? <TerasActionButton size="table-compact" emphasis="secondary"
            aria-label={`${action.label}: ${node.title}`} onClick={action.open}>{action.label}</TerasActionButton> : null;
        }}
      />
    ) : deliveryChangeRuntime.loading || treeReadRetrying ? (
      <TerasLoadingState label="Loading selected work tree…" skeleton="details" />
    ) : useOwnerTree ? (
      <TerasEmptyState fill>
        This package’s work tree could not be loaded.
        <TerasActionButton emphasis="primary" onClick={() => void retryWorkTree()}>Retry loading</TerasActionButton>
      </TerasEmptyState>
    ) : <TerasEmptyState fill>No verified work tree is available for this item.</TerasEmptyState>
  ) : undefined;

  const treeEditPanel = selectedPackage && treeEditActive && selectedTreeEditNode ? (
      <ExecutionTreeEditSupportPanel
        sourceTree={treeDraftBaseline}
        draftTree={treeEditActive}
        planningChoices={planningChoices}
        planningLoading={schedulingCatalog.loading}
        onRetryPlanning={() => { void schedulingCatalog.refresh().catch(() => undefined); }}
        disabled={treeChangeSubmitting || treeChangeReviewOpen}
        onUpdateText={(values) => handleTreeDraftChange(updateExecutionTreeNode(
          treeEditActive, selectedTreeEditNode.id, (node) => ({ ...node, ...values }),
        ))}
        onUpdatePlanningInputs={(values) => {
          if (selectedTreeEditNode.legacyWorkPackageId !== null) return;
          handleTreeDraftChange(updateExecutionTreeNode(
            treeEditActive, selectedTreeEditNode.id, (node) => ({ ...node, ...values }),
          ));
        }}
        packageSummary={selectedPackage}
        selectedNode={selectedTreeEditNode}
        onUpdateDependencies={(dependsOnIds)=>handleTreeDraftChange(updateExecutionTreeNode(treeEditActive,selectedTreeEditNode.id,node=>({...node,dependsOnIds})))}
      />
    ) : undefined;

  const packagePanel = selectedPackage ? (
      <ExecutionSelectedPackagePanel
        onInspectTechnicalPlan={() => openTechnicalPlan(planRequirement.status !== "unknown" && planRequirement.workItemId
          ? Number(planRequirement.workItemId.slice("work-item-".length))
          : (!selectedChild?.featureProgress ? selectedChild?.node.legacy_work_package_id : null) ?? selectedWorkItemId)}
        technicalPlanRequirement={readOnly ? undefined : planRequirement}
        actionLoading={deliveryChangeRuntime.loading||treeEditEntering}
        actionError={deliveryChangeRuntime.projectionError}
        onOpenWorkBoard={openWorkBoard}
        readOnly={readOnly}
        onInspectHistory={model.source_truth === "OpenProject-backed OOS" ? () => setHistoryOpen(true) : undefined}
        historyLoading={ownerHistory.loading}
        historyError={ownerHistory.error}
        historyDetail={ownerHistory.projection?.activity?.detail ?? (ownerHistory.projection ? "Latest loaded event. Open Original source evidence for activity and coverage." : undefined)}
        onInspectCloseout={!readOnly &&
          (model.source_truth === "OpenProject-backed OOS" || selectedActions.some(action => action.action_type === "open-closeout" && action.enabled))
          ? () => setCloseoutOpen(true) : undefined}
        auditEvents={selectedAuditEvents}
        details={selectedDetails}
        onActionSelect={handleActionSelect}
        packageSummary={selectedPackage}
        packageTree={selectedTree}
        scheduledWork={scheduledWork}
        scheduledPIs={scheduledPIs}
        recordedAssignments={localPlanning ? previewPlacements.size : placedWork.length}
        previewPlanRecorded={localPlanning && previewPlacements.size > 0}
        selectedActions={readOnly ? [] : selectedActions}
      />
    ) : <TerasEmptyState fill>Select a Delivery Package to inspect its work and available actions.</TerasEmptyState>;
  const selectedPackageProjection = selectedPackage
    ? getDeliveryEffectivePackageProjection(selectedPackage)
    : null;

  const inspectedWork = activeView === "work-board" ? selectedChild ?? shownFeature : null;
  function inspectTreeAction(node: ExecutionTreeDraftNode) {
    const id = node.legacyWorkPackageId;
    if (!id) return undefined;
    const child = packageWorkItems.find(item => item.node.legacy_work_package_id === id);
    if (child) return { label: "View on Work Board", open: () => showWorkItemOnBoard(child) };
    if (readOnly || model.source_truth !== "OpenProject-backed OOS" || node.kind === "Epic" ||
      ["done", "retired"].includes(node.backendStatus)) return undefined;
    return {
      label: node.kind === "PI Objective" ? "Review PI Outcome" : "Review Completion",
      open: () => setCompletionTarget(id),
    };
  }
  const workBoardInspector = treeEditPanel ?? (inspectedWork ? (
    <ExecutionPackageWorkItemPanel
      key={inspectedWork.node.id}
      item={inspectedWork}
      planningPlacement={planningPlacement(inspectedWork.node)}
      action={selectedChild ? renderChildAction(selectedChild) : featureReviewAction(inspectedWork)}
      blockerAction={reviewItemBlocker(inspectedWork)}
      dependencies={workDependencies(inspectedWork)}
      readOnly={readOnly}
      onClose={selectedChild ? () => setSelectedChildId(null) : undefined}
    />
  ) : selectedPackage ? (
    <ExecutionWorkBoardContextPanel
      deliveryPackage={selectedPackage}
      items={selectedTree ? activeView === "art-tree" || choosingFeature ? packageWorkItems : visibleWorkItems : null}
      view={activeView === "art-tree" ? "Work Tree" : choosingFeature ? "Feature Board" : activeScope === "all-work" ? "All Work" : "Epic Board"}
    />
  ) : undefined);

  const sessionParent = workSessionOpen && workSessionRuntime.projection?.delivery_id === selectedPackage?.delivery_package_id
    ? packageWorkItems.find(item => item.node.legacy_work_package_id === workSessionTarget?.workItemId)?.feature
    : null;
  const reviewFeature = sessionParent && !disconnectedPreview ? packageWorkItems.find(item =>
    item.node.id === sessionParent.id && !item.sessionRecorded && item.node.legacy_work_package_id !== null &&
    !["done", "retired", "parked", "blocked"].includes(item.lane.status) && getChildCounts(item.node).open_child_count === 0)
    : null;

  return (
    <>
      <DeliveryHistoryDialog deliveryId={historyOpen ? selectedPackage?.delivery_package_id ?? null : null} focus="closeout" onClose={() => setHistoryOpen(false)} />
      <ControlBoardWorkspaceFrame
        canvasControls={boardLevelControl("execution")}
        board={overviewContent}
        header={overviewHeader}
        hidden={Boolean(packageWorkspaceOpen && selectedPackage)}
        selected={packageWorkspaceOpen && selectedPackage ? undefined : packagePanel}
        selectedTone={selectedPackageProjection?.tone ?? "info"}
      />
      {packageWorkspaceOpen && selectedPackage && <ControlBoardWorkspaceFrame
        canvasControls={packageCanvasControls}
        board={treeContent ?? workBoardContent}
        boardVariant={activeView === "art-tree" ? "dark" : "light"}
        header={packageHeader}
        selected={workBoardInspector}
        selectedFrame={treeEditActive ? "bare" : "panel"}
        selectedTone={treeEditActive ? "warn" : inspectedWork?.lane.tone ?? selectedPackageProjection?.tone ?? "info"}
      />}
      <TerasDialog
        actions={<TerasActionButton type="submit" form="find-execution-art-tree" disabled={!artReference.trim()}>Open Work Tree</TerasActionButton>}
        closeLabel="Close work item lookup"
        contentOverflow="auto"
        description="Enter an epic or work item number to open its package tree."
        height="content"
        kicker="Delivery"
        onClose={() => setFindStructureOpen(false)}
        open={findStructureOpen}
        title="Find Work Tree"
        width="compact"
      >
        <form id="find-execution-art-tree" onSubmit={event => {
          event.preventDefault();
          try {
            const item = executionInspectionPackage(parseExecutionWorkItemReference(artReference), model);
            navigateBoard({ packageId: item.delivery_package_id, view: "art-tree", scope: "", workItemId: null, featureId: null });
            setFindStructureOpen(false);
          } catch (error) {
            setFindStructureError(error instanceof Error ? error.message : "Delivery could not find the work tree for that number.");
          }
        }}>
          <TerasTextField label="Work item number" value={artReference} onValueChange={value => {
            setArtReference(value);
            setFindStructureError(null);
          }} />
          {findStructureError ? <TerasEmptyState>{findStructureError}</TerasEmptyState> : null}
        </form>
      </TerasDialog>
      {!readOnly && selectedPackage && actionSession.activeAction ? (
        <ExecutionActionModal
          action={actionSession.activeAction}
          actionStep={actionSession.actionStep}
          auditEvents={selectedAuditEvents}
          canSubmit={
            actionSession.canSubmit &&
            (deliveryChangeRuntime.mode === "disconnected-preview" ||
              (deliveryChangeRuntime.mode === "live" &&
                Boolean(actionReview?.revision) &&
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
          packageTree={actionReview?.target ?? selectedTree}
          receipt={actionSession.receipt}
          sourceRevision={
            deliveryChangeRuntime.mode === "live"
              ? actionReview?.revision
              : undefined
          }
          submitting={actionSession.applying}
        />
      ) : null}
      {!readOnly && workSessionTarget && workSessionOpen ? (
        <ExecutionWorkSessionModal
          workRecords={new Map(executionWorkChoices(selectedTree ? [selectedTree] : [], "all")
            .filter(node => node.legacy_work_package_id !== null)
            .map(node => [`work-item-${node.legacy_work_package_id}`, { title: node.title, repository: node.owner_repo ?? null }]))}
          featureReview={reviewFeature?.node.legacy_work_package_id ? {
            title: reviewFeature.node.title,
            workItemId: reviewFeature.node.legacy_work_package_id,
            open: () => {
              showWorkItemOnBoard(reviewFeature);
              setWorkSessionOpen(false);
              setWorkSessionTarget(null);
              setCompletionTarget(reviewFeature.node.legacy_work_package_id);
            },
          } : undefined}
          planRequirement={planRequirement}
          planGuidance={planGuidance}
          onDraftTechnicalPlan={starter => openTechnicalPlan(starter.scope.work.id, starter)}
          onViewApprovedPlan={() => openTechnicalPlan(workSessionTarget.workItemId, null, true)}
          onNavigate={(destination, deliveryId, requiredWorkId) => {
            try {
              const item = requiredWorkId && destination === "work"
                ? executionInspectionPackage(requiredWorkId, model)
                : model.packages.find(record => record.delivery_package_id === deliveryId);
              if (!item) throw new Error("This package is unavailable in the current Delivery view.");

              const requiredChild = requiredWorkId && destination === "work"
                ? executionPackageWorkItems(getPackageTree(item.delivery_package_id, model))
                    .find(work => work.node.legacy_work_package_id === requiredWorkId)
                : null;
              if (requiredWorkId && destination === "work" && !requiredChild) {
                throw new Error("The required item is unavailable on this package’s Work Board. Check its Work Tree and package records.");
              }

              if (destination !== "architecture") setWorkSessionOpen(false);
              switch (destination) {
                case "closeout":
                  handleSelectedPackageChange(item.delivery_package_id);
                  setPackageWorkspaceOpen(false);
                  setCloseoutOpen(true);
                  break;
                case "architecture":
                  handleSelectedPackageChange(item.delivery_package_id);
                  openTechnicalPlan(workSessionTarget.workItemId, null, ["binding", "covered"].includes(planRequirement.status));
                  break;
                default:
                  if (requiredChild) showWorkItemOnBoard(requiredChild, item.delivery_package_id);
                  else navigateBoard({ packageId: item.delivery_package_id, view: "work-board", scope: "all-work", workItemId: null, featureId: null });
              }
            } catch (error) {
              setTreeEditEntryError(error instanceof Error ? error.message : "The next work item could not be located.");
            }
          }}
          onClose={() => {
            setWorkSessionOpen(false);
            setWorkSessionTarget(null);
          }}
          runtime={workSessionRuntime}
          target={workSessionTarget}
        />
      ) : null}
      {selectedPackage && architecturePacketOpen ? (
        <ArchitecturePacketAuthoringModal
          requirement={planRequirement}
          starter={planStarter}
          onOpenWorkBoard={!readOnly ? targetWorkId => {
            setArchitecturePacketOpen(false);
            const work = targetWorkId ? packageWorkItems.find(({ node }) => node.legacy_work_package_id === targetWorkId) : null;
            if (!work) {
              openWorkBoard();
              return;
            }
            showWorkItemOnBoard(work, selectedPackage.delivery_package_id);
            openChildAction(work);
            if (workSessionTarget?.workItemId === targetWorkId) void workSessionRuntime.refresh().catch(() => undefined);
          } : undefined}
          sourceContext={sourceContext}
          key={selectedPackage.delivery_package_id}
          readOnly={readOnly || inspectApprovedPlan}
          onCanonicalChanged={onCanonicalChanged}
          model={model}
          defaultDeliveryId={
            selectedPackage?.legacy_epic_id
              ? `delivery-${selectedPackage.legacy_epic_id}`
              : null
          }
          defaultWorkItemId={technicalPlanWorkItemId}
          onClose={() => { setArchitecturePacketOpen(false); if (workSessionTarget) void workSessionRuntime.refresh().catch(() => undefined); }}
        />
      ) : null}
      {!readOnly && completionTarget !== null ? <ExecutionItemCompletionModal workItemId={completionTarget} onClose={() => setCompletionTarget(null)}
        onCanonicalChanged={onCanonicalChanged}
        onOpenSourceSession={() => {
          if (completionTarget === null) return;
          setWorkSessionTarget(directExecutionWorkSessionTarget(completionTarget, model, selectedPackage));
          setCompletionTarget(null); setWorkSessionOpen(true);
        }} /> : null}
      {!readOnly && selectedPackage && closeoutOpen ? (
        <ExecutionCloseoutModal
          onClose={() => setCloseoutOpen(false)}
          packageSummary={selectedPackage}
          runtime={deliveryCloseoutRuntime}
        />
      ) : null}
      {deliveryChangeRuntime.operationStatus === "checking" && !treeChangeReviewOpen && (
        <TerasEmptyState>Checking the result of your submitted work structure change…</TerasEmptyState>
      )}
      {deliveryChangeRuntime.operationStatus === "completed" && !treeChangeReviewOpen && (
        <TerasEmptyState>Your submitted work structure change was recorded. Review the current work structure before applying further edits.</TerasEmptyState>
      )}
      {deliveryChangeRuntime.operationStatus === "failed" && !treeChangeReviewOpen && (
        <TerasEmptyState>Review the saved work structure before applying another change.</TerasEmptyState>
      )}
      <ExecutionTreeChangeReviewDialog
        acceptanceNote={treeChangeAcceptanceNote}
        error={treeChangeError}
        operationStatus={deliveryChangeRuntime.operationStatus}
        onAcceptanceNoteChange={setTreeChangeAcceptanceNote}
        onApply={() => void applyTreeChanges()}
        onClose={() => {
          if (!treeChangeSubmitting) {
            if(treeAppliedChangeIds.length)setDiscardDraftGuardOpen(true);
            else setTreeChangeReviewOpen(false);
          }
        }}
        open={treeChangeReviewOpen}
        plan={treeChangePlan}
        appliedIds={treeAppliedChangeIds}
        activeId={treeActiveChangeId}
        submitting={treeChangeSubmitting}
      />
      <TerasDialog
        closeLabel="Close work structure result" contentOverflow="auto" description="The reviewed changes were applied and verified against current owner state."
        height="content" kicker="Work Structure" onClose={()=>setTreeChangeSuccess(null)} open={treeChangeSuccess!==null} title="Work structure updated" width="compact">
        <TerasEmptyState>{treeChangeSuccess} {treeChangeSuccess===1?"change has":"changes have"} been recorded. Return to the Technical Plan and validate it against the updated work.</TerasEmptyState>
      </TerasDialog>
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
        description={treeAppliedChangeIds.length?"Changes already saved stay on the board. Discarding removes only the remaining local draft; reopen Work Structure to review fresh owner state.":"This will discard the unsaved execution tree draft and restore the last projected tree for the selected package."}
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
