"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TerasActionButton, TerasActionRow, TerasContentTray, TerasEmptyState, TerasFieldGrid, TerasFieldStack, TerasMetadataList,
  TerasInspectionSection, TerasList, TerasLoadingState, TerasModalShell, TerasNoteField, TerasPanel, TerasPanelHeader, TerasRecordCellText, TerasRecordMetaText,
  TerasRecordTable, TerasSegmentedControl, TerasSelectField, TerasSignalItem, TerasStatusPill, TerasTextField,
} from "@/teras";
import { assertDeliveryChangeResult } from "../../../live-runtime/delivery-change-live-contract.ts";
import { useDeliveryCommandRecovery } from "../../../live-runtime/delivery-command-outcome.ts";
import { applyPIPlanningEpic, PIPlanningApplyError, piPlanningCommandScope, readPIPlanningEpic } from "../../../live-runtime/pi-planning-change.ts";
import type { DeliveryChangeNode, DeliveryChangeOperation, DeliveryChangeProjection } from "../../../live-runtime/delivery-change-live-types.ts";
import {
  assessFeatureDeliveryTarget, findPIPlanningDependencyConflict, findPIPlanningStructureConflict, getPlanningNodes,
  iterationWorkTypes, refinementPreparationComplete,
  type PreviewPIObjective, type PreviewPIPlan,
} from "../../../local-runtime/projections/pi-planning-preview.ts";
import { recordLocalPIPlan } from "../../../local-runtime/projections/workspace-projection.ts";
import type { DeliveryReadModel } from "../../../read-model/index.ts";
import { activeIterationsForPi, planningWindowForTargetPi, targetPiCatalogId } from "../../../work-model/catalog/catalog-selectors.ts";
import { calendarDateNumber, calendarDateRange, currentPlanningIncrement, datedIterationIndex,
  recordedPlanningIteration } from "../../../work-model/catalog/planning-calendar.ts";
import { PIPlanningFeatureDialog } from "./pi-planning-feature-dialog.tsx";
import { PIPlanningCalendarDialog } from "./pi-planning-calendar-dialog.tsx";
import { DeliveryPlanningCalendar } from "../../shared/delivery-planning-calendar.tsx";
import { ControlBoardWorkspaceFrame, ControlBoardWorkspaceHeader } from "@/product-apps/control-board";
import { ControlBoardCanvasNavigation, ControlBoardHeaderSelect } from "@/product-apps/control-board/control-board-inspection-layout";
import { PIPlanningBoard, planningItemLabel, type PlanningBoardItem, type PlanningColumn } from "@/product-apps/control-board/control-board-planning";
import { ControlBoardPlanningOverview, type EpicPlanningStatus } from "@/product-apps/control-board/control-board-planning-overview";

type PlanningNode = PlanningBoardItem & ReturnType<typeof getPlanningNodes>[number];
type PlanningAttention = { reason: string; item?: PlanningNode; conflict?: boolean };

const choices = (values: string[]) => values.map(value => ({ label: value, value }));
const inactive = new Set(["done", "parked", "retired"]);
const iterationBoardTypes = new Set([...iterationWorkTypes, "Risk", "Milestone"]);
const completedLane = "completed-without-iteration";
type PlanningView = "overview" | "features" | "work";
const planningViews: { value: PlanningView; label: string }[] = [
  { value: "overview", label: "PI overview" },
  { value: "features", label: "Features" },
  { value: "work", label: "Work items" },
];

type PIPlanningSurfaceProps = {
  model: DeliveryReadModel;
  source: DeliveryReadModel | null;
  previousPI: string;
  focusPackageId: string | null;
  onReturn?: () => void;
  returnLabel?: string;
  onDirtyChange: (dirty: boolean) => void;
  onPlanningIncrementChange: (pi: string) => void;
  onCanonicalChanged?: () => Promise<void>;
  onModelRead: (model: DeliveryReadModel | null) => void;
};

export function DeliveryPIPlanningSurface(props: PIPlanningSurfaceProps) {
  const local = props.model.source_truth === "mock";
  const { source, onModelRead } = props;
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(!local);
  const activeRead = useRef<AbortController | null>(null);
  const requestedPI = useRef<string | null | undefined>(props.focusPackageId ? null : props.previousPI || undefined);
  const focusNumber = props.focusPackageId?.match(/(?:^|[-:])([1-9][0-9]*)$/)?.[1];
  const refresh = useCallback(async (fresh = false) => {
    activeRead.current?.abort();
    const controller = new AbortController();
    activeRead.current = controller;
    setRefreshing(true);
    try {
      const query = new URLSearchParams({view:"planning"});
      if (requestedPI.current === null && focusNumber) query.set("focus", `delivery-${focusNumber}`);
      else if (requestedPI.current) query.set("pi", requestedPI.current);
      if (fresh) query.set("fresh", "1");
      const response = await fetch(`/api/delivery/workspace?${query}`, {
        cache: "no-store",
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(80_000)]),
      });
      if (controller.signal.aborted) return;
      if (response.status === 401 || response.status === 403) {
        onModelRead(null);
        throw new Error("Your current session could not access PI Planning.");
      }
      const body = await response.json();
      if (!response.ok || body.mode !== "live" || !Array.isArray(body.projection?.art_tree?.roots) ||
          body.projection?.catalog?.projection_status !== "fresh") {
        throw new Error("The planning source is temporarily unavailable.");
      }
      if (controller.signal.aborted) return;
      onModelRead(body.projection);
      setError("");
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(failure instanceof Error ? failure.message : "The planning source could not be loaded.");
      throw failure;
    } finally {
      if (!controller.signal.aborted) {
        activeRead.current = null;
        setRefreshing(false);
      }
    }
  }, [onModelRead, focusNumber]);

  const refreshCurrent = useCallback(() => refresh(true), [refresh]);
  const readPI = useCallback((pi: string, fresh: boolean) => {
    requestedPI.current = pi;
    void refresh(fresh).catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    if (!local) void refresh().catch(() => undefined);
    return () => activeRead.current?.abort();
  }, [local, refresh]);

  if (!local && !source) {
    return refreshing || !error ? <TerasLoadingState fill label="Loading PI Planning…" /> :
      <TerasContentTray fit="fill" role="alert" title="PI Planning couldn’t load"
        description="Try reading the plan and its calendar again."
        actions={<TerasActionButton emphasis="secondary" onClick={() => void refreshCurrent().catch(() => undefined)}>Retry loading</TerasActionButton>} />;
  }
  return <PIPlanningBoardSurface {...props} model={local ? props.model : source!}
    refresh={local ? undefined : refreshCurrent} readPI={local ? undefined : readPI}
    refreshing={!local && refreshing} sourceError={error} />;
}

type ReviewedPIEpic = { epicId: number; source: DeliveryChangeProjection };
type LivePlanProgress = { commands: { epicId: number; body: string }[]; completed: number; stopped: boolean };

function canonicalNodes(root: DeliveryChangeNode) {
  const list = [root];
  for (const node of list) list.push(...node.children);
  return new Map(list.map(node => [node.id, node]));
}

function PIPlanningBoardSurface({ model, focusPackageId, previousPI, onReturn, returnLabel, onDirtyChange, onPlanningIncrementChange,
  onCanonicalChanged, refresh, readPI, refreshing, sourceError }: PIPlanningSurfaceProps & {
  refresh?: () => Promise<void>;
  readPI?: (pi: string, fresh: boolean) => void;
  refreshing: boolean;
  sourceError: string;
}) {
  const local = model.source_truth === "mock";
  const focusedNumber = Number(focusPackageId?.match(/(?:^|[-:])(\d+)$/)?.[1]);
  const focused = model.packages.find(item => item.delivery_package_id === focusPackageId || item.legacy_epic_id === focusedNumber);
  const datedIterations = useMemo(() => datedIterationIndex(model.catalog.values), [model.catalog.values]);
  const [selectedPI, setSelectedPI] = useState(() => {
    if (!focused) return previousPI;
    const scheduledPIs = [...new Set(getPlanningNodes(focused, model).flatMap(node =>
      node.currentPI && datedIterations.get(node.currentIteration ?? "")?.pi === node.currentPI ? [node.currentPI] : []))];
    const current = currentPlanningIncrement(model.catalog.values);
    if (current && scheduledPIs.includes(current)) return current;
    if (focused.target_pi && scheduledPIs.includes(focused.target_pi)) return focused.target_pi;
    return scheduledPIs[0] ?? focused.target_pi ?? "";
  });
  const [epicFilter, setEpicFilter] = useState("all");
  const [focusedEpicId, setFocusedEpicId] = useState(focused ? String(focused.legacy_epic_id) : null);
  const [search, setSearch] = useState("");
  const [epicStatus, setEpicStatus] = useState<EpicPlanningStatus>("all");
  const [view, setView] = useState<PlanningView>(focused ? "features" : "overview");
  const [focusFeatureId, setFocusFeatureId] = useState<string | null>(null);
  const [lastViewedFeatureId, setLastViewedFeatureId] = useState<string>();
  const [overviewWorkId, setOverviewWorkId] = useState<string>();
  const [draft, setDraft] = useState<PreviewPIPlan | null>(null);
  const [review, setReview] = useState(false);
  const [addingFeature, setAddingFeature] = useState(false);
  const [calendarDialog, setCalendarDialog] = useState<"setup" | "view" | null>(null);
  const [liveReview, setLiveReview] = useState<ReviewedPIEpic[] | null>(null);
  const [reviewError, setReviewError] = useState("");
  const [readingReview, setReadingReview] = useState(false);
  const [recording, setRecording] = useState(false);
  const [checking, setChecking] = useState(false);
  const [reviewDescriptions, setReviewDescriptions] = useState<Record<number, string>>({});
  const liveProgress = useRef<LivePlanProgress | null>(null);
  const [message, setMessage] = useState("");

  const byEpic = new Map<number, DeliveryReadModel["packages"][number]>();
  for (const item of model.packages) {
    if (inactive.has(item.backend_status) || !["refinement", "execution"].includes(item.workflow_phase)) continue;
    if (!byEpic.has(item.legacy_epic_id) || item.workflow_phase === "refinement") byEpic.set(item.legacy_epic_id, item);
  }
  const candidates = [...byEpic.values()];
  const nodes: PlanningNode[] = candidates.flatMap(epic => {
    const navigation = epic.execution_navigation;
    const preparedIds = new Set(navigation?.planning_prepared_work_item_ids ?? navigation?.prepared_work_item_ids ?? []);
    const localPreparationComplete = local && refinementPreparationComplete(epic);
    return getPlanningNodes(epic, model).map(node => {
      const movable = node.available && ["new", "ready"].includes(node.status);
      const prepared = local ? localPreparationComplete : preparedIds.has(node.number ?? 0);
      return {
        ...node,
        id: `${epic.legacy_epic_id}/${node.id}`,
        parentId: node.parentId ? `${epic.legacy_epic_id}/${node.parentId}` : null,
        epicId: epic.legacy_epic_id,
        epicTitle: epic.display_name,
        available: movable && prepared,
        moveUnavailableReason: node.status === "done" ? "Completed work. The recorded schedule is available for inspection."
          : node.status === "in-progress" ? "This work has started. Its schedule can be inspected here."
          : node.status === "blocked" ? "Review the blocker in Execution before moving this work."
          : !movable ? "This work item is available for inspection only."
          : !prepared ? "Finish Refinement before scheduling this work."
          : undefined,
      };
    });
  });
  const increments = [...new Set([
    ...model.catalog.values.filter(item => item.catalog_item_id === targetPiCatalogId &&
      ["active", "admitted"].includes(item.lifecycle_state) && /^PI-\d{4}-\d{2}$/.test(item.value_key)).map(item => item.value_key),
    ...Object.keys(model.preview_pi_plans ?? {}),
  ])];
  const currentPI = currentPlanningIncrement(model.catalog.values);
  const pi = model.planning_scope?.target_pi ??
    (increments.includes(selectedPI) ? selectedPI : (currentPI && increments.includes(currentPI) ? currentPI : increments[0]) ?? "");
  const recovery = useDeliveryCommandRecovery(!local && !addingFeature ? piPlanningCommandScope(pi) : null, recording, value => {
    const result = assertDeliveryChangeResult(value);
    liveProgress.current = null;
    setDraft(null);
    setReview(false);
    setMessage(result.status === "applied"
      ? "Your submitted plan change was recorded. Review any remaining assignments on the current board."
      : "Check the saved plan before submitting further assignments.");
    void refresh?.().then(() => onCanonicalChanged?.()).catch(() => undefined);
    return result.status === "applied";
  });
  const checkingResult = checking || recovery === "checking";

  const piWindow = planningWindowForTargetPi(model.catalog.values, pi);
  const datedPI = Boolean(piWindow.value && piWindow.value.lifecycle_state !== "missing" &&
    Number.isFinite(calendarDateNumber(piWindow.startDate)) && Number.isFinite(calendarDateNumber(piWindow.endDate)));
  useEffect(() => onPlanningIncrementChange(pi), [onPlanningIncrementChange, pi]);
  const iterations = activeIterationsForPi(model.catalog.values, pi).filter(item => local || datedIterations.has(item.value_key));
  const hasCalendar = datedPI && iterations.some(item => datedIterations.has(item.value_key));
  const targetPiCatalog = model.catalog.items.find(item => item.catalog_item_id === targetPiCatalogId);
  const canSaveCalendar = local || Boolean(targetPiCatalog?.supports_iteration_generation);
  const iterationKeys = iterations.map(item => item.value_key);
  const recordedIterations = [...new Set(nodes.filter(item => item.currentPI === pi && item.currentIteration
    && !iterationKeys.includes(item.currentIteration)).flatMap(item => item.currentIteration ? [item.currentIteration] : []))];
  const emptyPlan: PreviewPIPlan = { pi, assignments: {}, objectives: {} };
  const recorded = model.preview_pi_plans?.[pi] ?? emptyPlan;
  const plan = draft ?? recorded;
  const byParent = new Map<string, PlanningNode[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const siblings = byParent.get(node.parentId) ?? [];
    siblings.push(node);
    byParent.set(node.parentId, siblings);
  }

  const features = nodes.filter(item => item.type === "Feature" && !item.terminal);
  const featureAssessments = features.map(feature => {
    const descendants = [...(byParent.get(feature.id) ?? [])];
    for (const child of descendants) {
      if (child.status !== "parked" && child.status !== "retired") descendants.push(...(byParent.get(child.id) ?? []));
    }
    return { feature, descendants, ...assessFeatureDeliveryTarget(feature, descendants, iterationKeys, plan) };
  });
  const featureById = new Map(featureAssessments.map(item => [item.feature.id, item]));
  const focusedFeature = focusFeatureId ? featureById.get(focusFeatureId) : undefined;
  const focusedChildren = focusedFeature ? new Set(focusedFeature.descendants.map(item => item.id)) : undefined;
  const showFeatures = view === "features";
  const visibleEpic = view === "overview" ? epicFilter : focusedEpicId ?? epicFilter;
  const focusedEpic = focusedEpicId ? byEpic.get(Number(focusedEpicId)) : undefined;
  const iterationName = (iteration: string) => iterations.find(item => item.value_key === iteration)?.label ??
    (iteration.startsWith(`${pi} / `) ? iteration.slice(pi.length + 3) : iteration);
  const iterationDates = new Map(iterations.flatMap(({ value_key }) => {
    const dates = datedIterations.get(value_key)?.window;
    return dates ? [[value_key, calendarDateRange(dates.start_date, dates.end_date)] as const] : [];
  }));
  const assignmentOf = (item: Pick<PlanningNode, "id" | "currentIteration">) => plan.assignments[item.id]?.iteration ?? item.currentIteration;

  const assignedPI = new Map(Object.entries(model.preview_pi_plans ?? {}).flatMap(([planPI, item]) =>
    Object.keys(item.assignments).map(id => [id, planPI] as const)));
  const inBoardScope = (item: PlanningNode) => (!item.currentPI || item.currentPI === pi)
    && (!assignedPI.has(item.id) || assignedPI.get(item.id) === pi);
  const boardItems = nodes.filter(item => (showFeatures ? !item.terminal && item.type === "Feature"
    : iterationBoardTypes.has(item.type) && item.status !== "retired" && (!focusedChildren || focusedChildren.has(item.id)))
    && inBoardScope(item)
    && (visibleEpic === "all" || String(item.epicId) === visibleEpic));
  const columns: PlanningColumn[] = [
    { id: "", title: showFeatures ? "No target" : "Unscheduled",
      description: showFeatures ? "Features waiting for a delivery target." : "Work waiting for an iteration.",
      empty: showFeatures ? "No untargeted Features in this view." : "No unscheduled work in this view.", tone: "muted" },
    ...iterations.map(item => ({
      id: item.value_key, title: item.label,
      description: iterationDates.get(item.value_key) ?? (showFeatures ? "Features planned for delivery." : "Work scheduled for this iteration."),
      empty: showFeatures ? "No Feature delivery targets." : "No scheduled work.", tone: "info" as const,
    })),
    ...recordedIterations.map(value => ({
      id: value, title: iterationName(value), description: "Recorded assignments outside the dated schedule.", empty: "No existing assignments.",
      tone: "muted" as const, readOnly: true,
    })),
  ];
  if (boardItems.some(item => item.status === "done" && !assignmentOf(item))) {
    columns.push({ id: completedLane, title: "Completed work", description: "No recorded iteration.",
      empty: "No completed work without an iteration.", tone: "ok", readOnly: true });
  }
  const placements = Object.fromEntries(boardItems.flatMap(item => {
    const iteration = assignmentOf(item);
    if (iteration && columns.some(column => column.id === iteration)) return [[item.id, iteration]];
    return item.status === "done" ? [[item.id, completedLane]] : [];
  }));
  const changed = new Set(Object.keys(plan.assignments).filter(id =>
    plan.assignments[id].iteration !== recorded.assignments[id]?.iteration));
  const draftDirty = changed.size > 0;
  useEffect(() => {
    onDirtyChange(draftDirty);
    return () => onDirtyChange(false);
  }, [draftDirty, onDirtyChange]);
  const planItems = nodes.filter(item => changed.has(item.id));
  const touchedEpics = [...new Set(planItems.map(item => item.epicId))];
  const externalDependencies = (model.planning_external_dependencies ?? []).map(fact => ({
    id: `external-work-item-${fact.id}`, number: fact.id, title: fact.title, epicId: fact.epic_id,
    status: fact.status, currentPI: fact.target_pi, currentIteration: recordedPlanningIteration(fact.iteration),
    dependencies: fact.requires, terminal: ["done","retired"].includes(fact.status),
  }));
  const externalByNumber = new Map(externalDependencies.map(fact => [fact.number,fact]));
  const dependencyConflict = findPIPlanningDependencyConflict([...nodes,...externalDependencies], iterationKeys, pi, plan.assignments, changed);
  const structureConflict = findPIPlanningStructureConflict(nodes, plan.assignments, changed);
  const affectedFeatures = featureAssessments.filter(item =>
    changed.has(item.feature.id) || item.descendants.some(child => changed.has(child.id)));
  const earlyTarget = affectedFeatures.find(item => item.earlier);
  const laterTargets = affectedFeatures.filter(item => item.later);
  const targetNote = (featureId: string, target: string | null) => {
    const note = plan.deliveryTargetNotes?.[featureId];
    return note?.iteration === target ? note?.reason ?? "" : "";
  };
  const explainedTargets = laterTargets.every(item => targetNote(item.feature.id, item.target).trim());
  const canReview = draftDirty && !dependencyConflict && !structureConflict && !earlyTarget && !sourceError && !refreshing;

  function showFeatureWork(featureId: string) {
    setFocusFeatureId(featureId);
    setLastViewedFeatureId(featureId);
    setOverviewWorkId(undefined);
    setView("work");
    setSearch("");
  }

  function changeView(nextView: PlanningView) {
    if (nextView === view) return;
    setFocusFeatureId(null);
    setOverviewWorkId(undefined);
    if (nextView === "overview") {
      setFocusedEpicId(null);
      setLastViewedFeatureId(undefined);
      if (model.planning_focus && pi) readPI?.(pi, false);
    }
    setView(nextView);
    setSearch("");
  }

  function changeEpicFilter(value: string) {
    setEpicFilter(value);
    setFocusedEpicId(null);
    setFocusFeatureId(null);
    setLastViewedFeatureId(undefined);
    setOverviewWorkId(undefined);
  }

  function openEpic(id: number, item?: PlanningNode) {
    setFocusedEpicId(String(id));
    setLastViewedFeatureId(undefined);
    const showItem = item && inBoardScope(item) ? item : undefined;
    if (showItem && iterationBoardTypes.has(showItem.type)) {
      changeView("work");
      setOverviewWorkId(showItem.id);
    } else {
      changeView("features");
      setLastViewedFeatureId(showItem?.id);
    }
  }

  function objectiveFromNode(node?: PlanningNode): PreviewPIObjective {
    return {
      id: node ? node.id.split("/")[1] : null,
      title: node?.title ?? "",
      type: node?.objectiveType === "Committed" || node?.objectiveType === "Stretch" ? node.objectiveType : "",
      plannedBusinessValue: node?.plannedBusinessValue ?? "",
    };
  }

  function objectiveFor(epicId: number): PreviewPIObjective {
    const saved = plan.objectives[epicId];
    if (saved) return saved;
    const existing = nodes.find(item => item.epicId === epicId && item.type === "PI Objective" && item.currentPI === pi && !item.terminal);
    return objectiveFromNode(existing);
  }

  function moveWork(id: string, iteration: string) {
    const item = boardItems.find(node => node.id === id);
    if (refreshing || sourceError || !item?.available || (iteration && !iterationKeys.includes(iteration))
      || (!iteration && (recorded.assignments[id] || item.currentPI || item.currentIteration))) return;
    setMessage("");
    setDraft(current => {
      const previous = current ?? recorded;
      const assignments = { ...previous.assignments };
      if (iteration) assignments[id] = { epicId: item.epicId, itemId: id.split("/")[1], iteration };
      else delete assignments[id];
      return { ...previous, assignments };
    });
  }

  function updateObjective(epicId: number, fields: Partial<PreviewPIObjective>) {
    const objective = { ...objectiveFor(epicId), ...fields };
    setDraft(current => current && ({
      ...current,
      objectives: { ...current.objectives, [epicId]: objective },
    }));
  }

  const validObjectives = touchedEpics.every(epicId => {
    const objective = objectiveFor(epicId);
    return Boolean(objective.title.trim() && objective.type && /^\d+$/.test(objective.plannedBusinessValue)
      && Number.isSafeInteger(Number(objective.plannedBusinessValue))
      && (local || objective.id || reviewDescriptions[epicId]?.trim()));
  });

  async function openPlanReview() {
    setReview(true);
    setReviewError("");
    setLiveReview(null);
    liveProgress.current = null;
    if (local) return;
    setReadingReview(true);
    try {
      const reviewed: ReviewedPIEpic[] = [];
      for (const epicId of touchedEpics) {
        const source = await readPIPlanningEpic(epicId);
        const current = canonicalNodes(source.package.execution_tree);
        const backlog = byEpic.get(epicId)?.refinement_packet?.planning_rules?.backlog_iteration_label;
        const mismatched = nodes.filter(node => node.epicId === epicId && node.number !== null).some(node => {
          const latest = current.get(node.number!);
          return !latest || latest.subject !== node.title || latest.status.toLowerCase().replaceAll(" ", "-") !== node.status ||
            (latest.target_pi || null) !== node.currentPI ||
            recordedPlanningIteration(latest.iteration, backlog) !== node.currentIteration;
        });
        if (mismatched) throw new Error(`Epic #${epicId} changed. Refresh the plan before applying assignments.`);
        reviewed.push({ epicId, source });
      }
      setLiveReview(reviewed);
    } catch (failure) {
      setReviewError(failure instanceof Error ? failure.message : "The current Epic plans could not be reviewed.");
    } finally {
      setReadingReview(false);
    }
  }

  function liveCommands() {
    const windows = new Map(iterations.map(item => [item.value_key, item.iteration_window]));
    const byNumber = new Map(planItems.map(item => [item.number, item]));
    const after = new Map(touchedEpics.map(id => [id, new Set<number>()]));
    for (const item of planItems) {
      for (const dependency of item.dependencies) {
        const prerequisite = byNumber.get(dependency);
        if (!prerequisite || prerequisite.epicId === item.epicId) continue;
        const nextPrerequisite = windows.get(plan.assignments[prerequisite.id].iteration)?.sequence;
        const currentItem = item.currentIteration ? windows.get(item.currentIteration)?.sequence : undefined;
        if (currentItem !== undefined && nextPrerequisite !== undefined && nextPrerequisite > currentItem) {
          after.get(prerequisite.epicId)!.add(item.epicId);
        } else {
          after.get(item.epicId)!.add(prerequisite.epicId);
        }
      }
    }
    const order: number[] = [];
    while (order.length < touchedEpics.length) {
      const next = touchedEpics.find(id => !order.includes(id) && [...after.get(id)!].every(dependency => order.includes(dependency)));
      if (next === undefined) throw new Error("These Epics need conflicting apply orders. Review and apply a smaller set of moves.");
      order.push(next);
    }
    const acceptedAt = new Date().toISOString();
    return order.map(epicId => {
      const reviewed = liveReview?.find(entry => entry.epicId === epicId);
      if (!reviewed) throw new Error(`Review Epic #${epicId} again before applying its plan.`);
      const objective = objectiveFor(epicId);
      if (!objective.type) throw new Error(`Choose an objective type for Epic #${epicId}.`);
      const operation: DeliveryChangeOperation = {
        type: "apply_pi_plan",
        payload: {
          pi,
          assignments: planItems.filter(item => item.epicId === epicId).map(item => {
            const placed = plan.assignments[item.id];
            const window = windows.get(placed.iteration);
            if (!window || !item.number) throw new Error(`Refresh the dates and work identity for “${item.title}”.`);
            const reason = targetNote(item.id, placed.iteration).trim();
            return {
              work_item_id: `work-item-${item.number}`, iteration: placed.iteration,
              start_date: window.start_date, end_date: window.end_date,
              ...(reason ? { delivery_target_reason: reason } : {}),
            };
          }),
          objective: {
            work_item_id: objective.id,
            title: objective.title.trim(),
            type: objective.type,
            planned_business_value: Number(objective.plannedBusinessValue),
            ...(!objective.id ? { description: `## Outcome\n\n${reviewDescriptions[epicId].trim()}` } : {}),
          },
        },
      };
      return { epicId, body: JSON.stringify({ acceptedAt, acceptanceNote: `Confirm the reviewed assignments for ${pi}.`,
        commandId: `delivery-change-command:console-apply_pi_plan-${crypto.randomUUID()}`,
        expectedSourceRevision: reviewed.source.source_revision, operation }) };
    });
  }

  async function recordLivePlan() {
    if (recording || checkingResult || liveProgress.current?.stopped) return;
    setRecording(true);
    setReviewError("");
    try {
      const progress = liveProgress.current ?? { commands: liveCommands(), completed: 0, stopped: false };
      liveProgress.current = progress;
      while (progress.completed < progress.commands.length) {
        const { epicId, body } = progress.commands[progress.completed];
        const result = await applyPIPlanningEpic(epicId, body, pi, () => setChecking(true));
        setChecking(false);
        if (result.status !== "applied") {
          progress.stopped = true;
          const error = result.event.effect.error;
          const detail = error && typeof error === "object" && "message" in error ? String(error.message) : "The backend could not confirm all assignments.";
          throw new Error(`Epic #${epicId}: ${detail}`);
        }
        progress.completed += 1;
      }
      liveProgress.current = null;
      setDraft(null);
      setReview(false);
      setMessage(`Saved ${changed.size} ${changed.size === 1 ? "assignment" : "assignments"} in ${pi}.`);
      await refresh?.().catch(() => undefined);
      await onCanonicalChanged?.().catch(() => undefined);
    } catch (failure) {
      if (liveProgress.current && failure instanceof PIPlanningApplyError && failure.status < 500) {
        liveProgress.current.stopped = true;
      }
      const completed = liveProgress.current?.completed ?? 0;
      setReviewError(`${completed ? `${completed} Epic plans saved. ` : ""}${failure instanceof Error
        ? failure.message : "The remaining plan could not be confirmed."}`);
    } finally {
      setChecking(false);
      setRecording(false);
    }
  }

  function closeReview() {
    if (recording) return;
    if (liveProgress.current) {
      if (!liveProgress.current.stopped) return;
      liveProgress.current = null;
      setDraft(null);
      void refresh?.().catch(() => undefined);
      void onCanonicalChanged?.().catch(() => undefined);
    }
    setReview(false);
  }

  function record() {
    if (!canReview || !validObjectives || !explainedTargets) return;
    if (!local) {
      void recordLivePlan();
      return;
    }
    const objectives = { ...recorded.objectives };
    for (const epicId of touchedEpics) objectives[epicId] = objectiveFor(epicId);
    const deliveryTargetNotes = { ...plan.deliveryTargetNotes };
    for (const item of affectedFeatures) {
      if (!item.later || deliveryTargetNotes[item.feature.id]?.iteration !== item.target) delete deliveryTargetNotes[item.feature.id];
    }
    recordLocalPIPlan({ ...plan, objectives, deliveryTargetNotes });
    setDraft(null);
    setReview(false);
    setMessage(`Recorded ${changed.size} ${changed.size === 1 ? "assignment" : "assignments"} in ${pi} for this preview.`);
  }

  const hint = sourceError ? [message, sourceError, "Showing the last loaded plan."].filter(Boolean).join(" ") : (dependencyConflict
    ? `Schedule “${dependencyConflict.prerequisite.title}” in this or an earlier iteration before “${dependencyConflict.item.title}”.`
    : structureConflict ?? (earlyTarget && earlyTarget.latest
      ? `Move “${earlyTarget.feature.title}” to ${iterationName(earlyTarget.latest)} or later. Its child work is planned through that iteration.`
      : iterationKeys.length ? message : "Set up dated iterations for this PI before scheduling work."));

  function changePlanningIncrement(value: string, fresh = false) {
    setSelectedPI(value);
    setEpicFilter("all");
    setFocusedEpicId(null);
    setFocusFeatureId(null);
    setLastViewedFeatureId(undefined);
    setOverviewWorkId(undefined);
    setSearch("");
    setEpicStatus("all");
    setDraft(null);
    setMessage("");
    readPI?.(value, fresh);
  }

  const reviewLocked = recording || checkingResult || Boolean(liveProgress.current);

  const backView = focusedFeature ? "features" : view !== "overview" && focusedEpic ? "overview" : undefined;
  const canvasControls = backView ? <ControlBoardCanvasNavigation label="PI Planning navigation"
    priorLevel={planningViews.find(item => item.value === backView)?.label}
    onBack={() => changeView(backView)} /> : undefined;

  const headerFilters = <>
    <ControlBoardHeaderSelect label="PI" menuMinWidth={176} value={pi} options={choices(increments)}
      disabled={draftDirty} onValueChange={changePlanningIncrement} />
    <ControlBoardHeaderSelect label="Epic" menuMinWidth={320} value={visibleEpic} options={[
      { value: "all", label: "All Epics" },
      ...candidates.map(item => ({
        value: String(item.legacy_epic_id), label: `#${item.legacy_epic_id} · ${item.display_name}`,
      })),
    ]} onValueChange={changeEpicFilter} />
  </>;

  const canAddFeature = !local && view === "features" && focusedEpic && nodes.some(node =>
    node.epicId === focusedEpic.legacy_epic_id && node.type === "PI Objective" &&
    node.currentPI === pi && !["done", "parked", "retired"].includes(node.status)) && hasCalendar;

  const heading = focusedFeature?.feature.title ?? focusedEpic?.display_name ??
    (view === "overview" ? "PI overview" : showFeatures ? "Feature delivery" : "Work by iteration");
  const description = view === "overview" ? datedPI
    ? `${pi === currentPI ? "Current PI · " : ""}${calendarDateRange(piWindow.startDate, piWindow.endDate)}`
    : "See targets and planning issues."
    : showFeatures ? "Set Feature delivery targets and review child work."
    : focusedFeature?.target ? `Schedule child work. Delivery target ${iterationName(focusedFeature.target)}.`
    : "Schedule stories, defects, tasks, risks and milestones by iteration.";
  const header = <TerasFieldStack spacing="compact">
    <ControlBoardWorkspaceHeader
      kicker={focusedFeature ? planningItemLabel(focusedFeature.feature) : focusedEpic ? `Epic ${focusedEpic.legacy_epic_id}` : "PI Planning"}
      title={heading}
      description={description}
      filters={headerFilters}
      split
      actions={<TerasActionRow spacing="tight">
        {onReturn && <TerasActionButton emphasis="secondary" size="table-compact" onClick={onReturn} disabled={draftDirty}>
          {returnLabel}
        </TerasActionButton>}
        {canAddFeature && <TerasActionButton size="table-compact" emphasis="primary"
          disabled={draftDirty || checkingResult || Boolean(sourceError) || refreshing} onClick={() => setAddingFeature(true)}>Add Feature</TerasActionButton>}
        {view !== "overview" && <TerasActionButton size="table-compact" emphasis="secondary"
          onClick={() => setCalendarDialog("view")}>View calendar</TerasActionButton>}
        <TerasSegmentedControl ariaLabel="Planning view" value={view}
          options={planningViews} onValueChange={changeView} />
      </TerasActionRow>}
    />
    {checkingResult && !review && <TerasContentTray title="Checking the original result"
      description="The Console will check the submitted PI plan change until Delivery confirms its result." />}
    {recovery === "failed" && !review && <TerasContentTray title="Review the saved plan"
      description="Delivery recorded a problem while applying your plan change. Review the current assignments before submitting another change." />}
    {refreshing && !sourceError && <TerasLoadingState inline label="Checking for plan updates…" />}
    {(draftDirty || hint) && <TerasActionRow layout="split" spacing="tight"
      end={sourceError && refresh ? <TerasActionButton busy={refreshing} emphasis="secondary" size="table-compact"
        onClick={() => void refresh().catch(() => undefined)}>Retry loading plan</TerasActionButton>
        : draftDirty ? <TerasActionRow spacing="tight">
          <TerasActionButton emphasis="secondary" size="table-compact" onClick={() => { setDraft(null); setMessage(""); }}>
            Discard changes
          </TerasActionButton>
          <TerasActionButton size="table-compact" disabled={!canReview || checkingResult} onClick={() => void openPlanReview()}>Review plan</TerasActionButton>
      </TerasActionRow> : view !== "overview" && !hasCalendar && canSaveCalendar && !refreshing &&
        <TerasActionButton emphasis="primary" size="table-compact" onClick={() => setCalendarDialog("setup")}>
          Set up calendar
        </TerasActionButton>}>
      {hint && <div role="status"><TerasRecordMetaText>{hint}</TerasRecordMetaText></div>}
    </TerasActionRow>}
  </TerasFieldStack>;

  const nodesByNumber = new Map<number, PlanningNode[]>();
  const nodesByEpic = new Map<number, PlanningNode[]>();
  for (const node of nodes) {
    const epicNodes = nodesByEpic.get(node.epicId) ?? [];
    epicNodes.push(node);
    nodesByEpic.set(node.epicId, epicNodes);
    if (!node.number) continue;
    const matches = nodesByNumber.get(node.number) ?? [];
    matches.push(node);
    nodesByNumber.set(node.number, matches);
  }
  const featuresByEpic = new Map<number, typeof featureAssessments>();
  for (const assessment of featureAssessments) {
    const epicId = assessment.feature.epicId;
    const assessments = featuresByEpic.get(epicId) ?? [];
    assessments.push(assessment);
    featuresByEpic.set(epicId, assessments);
  }
  const completedPrerequisites = new Set(model.completed_planning_prerequisite_ids);
  const iterationOrder = new Map(iterationKeys.map((key, index) => [key, index]));
  const epicRows = view === "overview" && pi ? candidates.flatMap(epic => {
    const id = epic.legacy_epic_id;
    if (epicFilter !== "all" && String(id) !== epicFilter) return [];
    const inSelectedPI = (item: PlanningNode) => item.currentPI === pi || Boolean(plan.assignments[item.id]);
    const inPI = (nodesByEpic.get(id) ?? []).filter(inSelectedPI);
    const objective = plan.objectives[id];
    if (epic.target_pi !== pi && !inPI.length && !objective) return [];
    const objectives = inPI.filter(item => item.type === "PI Objective" && item.status !== "retired" && item.id !== `${id}/${objective?.id}`)
      .map(item => ({ id: item.id, title: item.title, type: item.objectiveType }));
    if (objective?.title.trim()) objectives.push({ id: "preview-objective", title: objective.title, type: objective.type });
    const scopedFeatures = (featuresByEpic.get(id) ?? []).filter(item =>
      (inSelectedPI(item.feature) || item.descendants.some(child => !child.terminal && inSelectedPI(child))));
    const openWork = inPI.filter(item => !inactive.has(item.status) && iterationBoardTypes.has(item.type));
    const attention: PlanningAttention[] = [];
    if ((scopedFeatures.length || openWork.length) && !objectives.length) attention.push({ reason: "Missing PI objective" });
    for (const assessment of scopedFeatures) {
      const item = assessment.feature;
      if (assessment.earlier) attention.push({ reason: "Feature target conflicts with child work", item, conflict: true });
      if (!assessment.target) attention.push({ reason: "Feature target missing", item });
      else if (!iterationOrder.has(assessment.target)) attention.push({ reason: "Feature target outside the dated calendar", item });
      if (assessment.unplanned > 0) attention.push({ reason: "Child work needs an iteration in this PI", item });
    }
    for (const item of [...openWork, ...scopedFeatures.map(item => item.feature)]) {
      const assignment = assignmentOf(item);
      const scheduled = iterationOrder.get(assignment ?? "");
      if (assignment && scheduled === undefined && iterationBoardTypes.has(item.type)) {
        attention.push({ reason: "Recorded iteration outside the dated calendar", item });
      }
      const dependencyReasons = new Set<string>();
      for (const number of item.dependencies) {
        const matches = nodesByNumber.get(number);
        if (!matches && completedPrerequisites.has(number)) continue;
        const prerequisite = matches?.length === 1 ? matches[0] : !matches ? externalByNumber.get(number) : undefined;
        if (!prerequisite || prerequisite.status === "retired") {
          dependencyReasons.add("Dependency details incomplete");
          continue;
        }
        if (prerequisite.status === "done") continue;
        const prerequisiteIteration = (prerequisite.currentPI === pi || Boolean(plan.assignments[prerequisite.id]))
          ? iterationOrder.get(assignmentOf(prerequisite) ?? "") : undefined;
        const late = scheduled !== undefined && (prerequisiteIteration === undefined || prerequisiteIteration > scheduled);
        if (late || (prerequisite.epicId !== id && prerequisiteIteration === undefined)) {
          dependencyReasons.add(prerequisite.epicId === id
            ? `Schedule dependency #${number} first` : prerequisite.epicId === null ? `Waiting on work item #${number}` : `Waiting on Epic #${prerequisite.epicId}`);
        }
      }
      for (const reason of dependencyReasons) attention.push({ reason, item, conflict: true });
    }
    return { epic, objectives, scopedFeatures, attention,
      hasDraft: touchedEpics.includes(id) };
  }) : [];
  const overviewIssues = epicRows.flatMap(row => row.attention.map(issue => ({ ...issue, epic: row.epic })))
    .sort((left, right) => Number(Boolean(right.conflict)) - Number(Boolean(left.conflict)));
  const targets = new Map(iterations.map(item => [item.value_key, 0]));
  let missingTargets = 0;
  for (const row of epicRows) {
    for (const { target } of row.scopedFeatures) {
      if (target) targets.set(target, (targets.get(target) ?? 0) + 1);
      else missingTargets += 1;
    }
  }
  const featureTargets = [...targets].map(([id, count]) => ({
    id, label: iterationName(id), count,
    dateRange: hasCalendar ? iterationDates.get(id) ?? "Outside the dated calendar" : undefined,
  }));
  if (pi && (featureTargets.length || missingTargets)) featureTargets.push({ id: "", label: "No target", count: missingTargets, dateRange: undefined });
  const query = search.trim().toLowerCase();
  const visibleEpicRows = epicRows.filter(({ epic, attention }) => {
    const rowStatus = attention.length ? "needs-attention" : "no-issues";
    return (epicStatus === "all" || epicStatus === rowStatus)
      && `${epic.display_name} Epic ${epic.legacy_epic_id} #${epic.legacy_epic_id}`.toLowerCase().includes(query);
  });

  return <>
    {view === "overview" ? <ControlBoardWorkspaceFrame header={header} boardVariant="dark" board={<ControlBoardPlanningOverview
      attentionCount={overviewIssues.length} featureTargets={featureTargets}
      calendarDates={hasCalendar ? "iterations" : datedPI ? "pi-only" : "none"}
      calendarAction={<TerasActionRow spacing="tight">
        <TerasActionButton size="table-compact" emphasis="secondary" onClick={() => setCalendarDialog("view")}>
          View calendar
        </TerasActionButton>
        {canSaveCalendar &&
          <TerasActionButton size="table-compact" emphasis="primary" disabled={draftDirty}
            onClick={() => setCalendarDialog("setup")}>Set up calendar</TerasActionButton>}
      </TerasActionRow>}
      attention={overviewIssues.length ? <TerasList ariaLabel="Planning issues" scrollHeight="short">
        {overviewIssues.map(({ epic, reason, item, conflict }) => {
          const epicId = epic.legacy_epic_id;
          const canOpenItem = item && inBoardScope(item);
          const actionLabel = canOpenItem ? item.type === "Feature" ? "Review Feature" : "Review work item" : "View Features";
          const title = item?.title ?? epic.display_name;
          const epicLabel = `Epic #${epicId}`;
          const meta = item ? `${epicLabel} · ${planningItemLabel(item)}` : epicLabel;
          return <TerasSignalItem key={`${epicId}/${item?.id ?? "epic"}/${reason}`}
            label={reason} title={title} meta={meta} textOverflow="wrap" tone={conflict ? "warn" : "info"}
            actionLabel={actionLabel} ariaLabel={`${actionLabel}: ${title}. ${reason}`}
            onSelect={() => openEpic(epicId, item)} />;
        })}
      </TerasList> : <TerasEmptyState>{epicRows.length ? "No planning issues flagged in this view."
        : "No Epics in this view of the PI."}</TerasEmptyState>}
      epicSearch={search} epicStatus={epicStatus} onEpicSearchChange={setSearch} onEpicStatusChange={setEpicStatus}
      epics={visibleEpicRows.length ? <TerasRecordTable ariaLabel="Epics in this PI" rows={visibleEpicRows} density="compact" fill
        getRowId={row => row.epic.delivery_package_id} onSelect={row => openEpic(row.epic.legacy_epic_id)} columns={[
          { key: "epic", header: "Epic", intent: "primary", render: row =>
            <TerasRecordCellText title={row.epic.display_name} description={`Epic ${row.epic.legacy_epic_id}`} /> },
          { key: "objectives", header: "PI objectives", render: row => row.objectives.length
            ? <TerasFieldStack spacing="compact">{row.objectives.map(item => <TerasActionRow key={item.id} spacing="tight">
              <TerasRecordMetaText>{item.title}</TerasRecordMetaText>
              {["Committed", "Stretch"].includes(item.type) &&
                <TerasStatusPill size="compact" tone={item.type === "Committed" ? "info" : "muted"}>{item.type}</TerasStatusPill>}
            </TerasActionRow>)}</TerasFieldStack>
            : <TerasRecordMetaText>None recorded</TerasRecordMetaText> },
          { key: "targets", header: "Feature plan", render: row => row.scopedFeatures.length
            ? `${row.scopedFeatures.filter(item => item.target).length} of ${row.scopedFeatures.length} targeted`
            : <TerasRecordMetaText>No Feature scope recorded</TerasRecordMetaText> },
          { key: "attention", header: "Planning attention", render: row => <TerasFieldStack spacing="compact">
            {row.hasDraft && <TerasStatusPill size="compact" tone="info">Draft changes</TerasStatusPill>}
            {row.attention.length ? [...new Set(row.attention.map(issue => issue.reason))]
              .map(reason => <TerasRecordMetaText key={reason}>{reason}</TerasRecordMetaText>)
              : <TerasRecordMetaText>None flagged</TerasRecordMetaText>}
          </TerasFieldStack> },
          { key: "open", header: "Action", intent: "action", render: row =>
            <TerasActionButton size="table-compact" emphasis="secondary" onClick={event => {
              event.stopPropagation();
              openEpic(row.epic.legacy_epic_id);
            }}>View Features</TerasActionButton> },
        ]} /> : <TerasEmptyState fill>{epicRows.length ? "No Epics match the search and filter."
          : "No Epics in this view of the PI."}</TerasEmptyState>} />} />
    : <PIPlanningBoard key={`${pi}/${view}/${visibleEpic}/${focusFeatureId ?? ""}`}
      initialSelectedId={showFeatures ? lastViewedFeatureId : overviewWorkId}
      items={boardItems.map(item => ({
      ...item,
      completed: item.status === "done",
      scheduleSummary: featureById.get(item.id)?.earlier ? "Child work runs later"
        : featureById.get(item.id)?.unplanned ? "Child work unscheduled"
        : featureById.get(item.id)?.later ? "Later delivery target" : undefined,
      available: !sourceError && !refreshing && item.available && iterationKeys.length > 0 && (!item.currentIteration || iterationKeys.includes(item.currentIteration)),
      moveUnavailableReason: item.moveUnavailableReason ?? (!iterationKeys.length ? "Choose a PI with active iterations."
        : item.currentIteration && !iterationKeys.includes(item.currentIteration) ? "The recorded iteration is read-only here." : undefined),
      canReturnToBacklog: !recorded.assignments[item.id] && !item.currentPI && !item.currentIteration,
    }))} knownNodes={nodes} columns={columns} placements={placements} onMove={moveWork}
      assignmentLabel={showFeatures ? "Delivery target" : "Assignment"}
      emptyInspector={showFeatures ? "Select a Feature to inspect its delivery target and open its child work."
        : "Drag a card with a grip to an iteration, or select it and use Move to."}
      canvasControls={canvasControls}
      renderInspectorActions={item => featureById.has(item.id)
        ? <TerasActionButton onClick={() => showFeatureWork(item.id)}>Plan child work</TerasActionButton> : null}
      renderInspection={item => {
        const forecast = featureById.get(item.id);
        if (!forecast) return null;
        const suggestion = forecast.unplanned === 0 ? forecast.latest : null;
        const reason = targetNote(item.id, forecast.target);
        return <TerasInspectionSection title="Child work">
          <TerasMetadataList columns={1} items={[
              { label: "Completed", value: `${forecast.complete} of ${forecast.inScope}` },
              ...(forecast.unplanned ? [{ label: "Forecast", value: `${forecast.unplanned} unscheduled`,
                detail: forecast.latest ? `Scheduled work runs through ${iterationName(forecast.latest)}.` : undefined }]
                : suggestion ? [{ label: "Suggested delivery target", value: iterationName(suggestion),
                  actions: item.available && suggestion !== forecast.target
                    ? <TerasActionButton emphasis="secondary" size="table-compact"
                        onClick={() => moveWork(item.id, suggestion)}>Use suggested target</TerasActionButton> : undefined }] : []),
              ...(reason ? [{ label: "Reason for later target", value: reason }] : []),
          ]} />
        </TerasInspectionSection>;
      }}
      header={header} />}
    {calendarDialog === "view" && <TerasModalShell surfaceId="delivery-pi-planning-calendar" kicker="PI Planning"
      title="Planning calendar" bodyLayout="scroll" height="content" width="medium"
      onClose={() => setCalendarDialog(null)}
      footer={<TerasActionButton emphasis="secondary" onClick={() => setCalendarDialog(null)}>Done</TerasActionButton>}>
      <DeliveryPlanningCalendar catalogValues={model.catalog.values} pi={pi} startDate={piWindow.startDate}
        iterations={iterations.flatMap(value => {
          const matched = datedIterations.get(value.value_key);
          return matched ? [matched.window] : [];
        })} />
    </TerasModalShell>}
    {calendarDialog === "setup" && <PIPlanningCalendarDialog model={model}
      onClose={() => setCalendarDialog(null)} onSaved={savedPi => {
        changePlanningIncrement(savedPi, true);
        setCalendarDialog(null);
        setMessage(`Planning calendar saved for ${savedPi}.`);
      }} />}
    {addingFeature && focusedEpic && <PIPlanningFeatureDialog
      epic={{ id: focusedEpic.legacy_epic_id, title: focusedEpic.display_name }} pi={pi}
      placements={iterations.flatMap(({ value_key }) => {
        const window = datedIterations.get(value_key)?.window;
        return window ? [{ ...window, iteration: value_key,
          label: `Iteration ${window.sequence} · ${calendarDateRange(window.start_date, window.end_date)}` }] : [];
      })}
      onClose={readCurrent => {
        setAddingFeature(false);
        if (readCurrent) void refresh?.().catch(() => undefined);
      }}
      onSaved={() => {
        setAddingFeature(false);
        setMessage("Feature and first work item saved.");
        void refresh?.().then(() => onCanonicalChanged?.()).catch(() => undefined);
      }} />}
    {review && <TerasModalShell surfaceId="delivery-pi-planning-review" kicker="PI Planning" title="Review PI Plan" description={pi}
      bodyLayout="scroll" height="content" width="medium" busy={recording} busyLabel={checkingResult ? "Checking the original result…" : "Saving to OpenProject…"} onClose={closeReview}
      footer={<TerasActionRow>
        <TerasActionButton emphasis="secondary" onClick={closeReview}
          disabled={recording || Boolean(liveProgress.current && !liveProgress.current.stopped)}>
          {liveProgress.current?.stopped ? "Return to saved plan" : "Back to board"}
        </TerasActionButton>
        {!local && reviewError && !liveProgress.current && <TerasActionButton emphasis="secondary"
          onClick={() => { setDraft(null); closeReview(); void refresh?.().catch(() => undefined); }}>Refresh board</TerasActionButton>}
        <TerasActionButton disabled={recording || checkingResult || readingReview || !validObjectives || !canReview || !explainedTargets ||
            (!local && !liveReview) || Boolean(liveProgress.current?.stopped)} onClick={record}>
          {local ? "Record in preview" : checkingResult ? "Checking Result" : "Apply plan"}
        </TerasActionButton>
      </TerasActionRow>}>
      <TerasFieldStack spacing="compact">
        {readingReview && <TerasLoadingState inline label="Checking current Epic plans…" />}
        {reviewError && <div role="alert"><TerasContentTray description={reviewError} /></div>}
        {touchedEpics.map(epicId => {
          const epic = byEpic.get(epicId);
          const objective = objectiveFor(epicId);
          const choicesForEpic = nodes.filter(item => item.epicId === epicId && item.type === "PI Objective" && item.currentPI === pi && !item.terminal);
          return <TerasPanel key={epicId} frame="padded" treatment="neutral">
            <TerasFieldStack spacing="compact">
            <TerasPanelHeader kicker={`Epic ${epicId}`} title={epic?.display_name ?? `Epic ${epicId}`} />
            <TerasContentTray title="PI objective">
              <TerasFieldGrid columns={3} spacing="compact">
                {choicesForEpic.length > 0 && <TerasSelectField label="Objective" value={objective.id ?? "new"} disabled={reviewLocked}
                  options={[...choicesForEpic.map(item => ({ value: item.id.split("/")[1], label: item.title })), { value: "new", label: "New objective" }]}
                  onValueChange={id => updateObjective(epicId, objectiveFromNode(choicesForEpic.find(item => item.id.split("/")[1] === id)))} />}
                {!objective.id && <TerasTextField label="Objective title" value={objective.title} disabled={reviewLocked}
                  onValueChange={title => updateObjective(epicId, { title })} />}
                <TerasSelectField label="Objective type" value={objective.type || "choose"} disabled={reviewLocked}
                  options={[{ value: "choose", label: "Choose type" }, ...choices(["Committed", "Stretch"])]}
                  onValueChange={value => updateObjective(epicId, { type: value === "Committed" || value === "Stretch" ? value : "" })} />
                <TerasTextField label="Planned business value" type="number" inputMode="numeric" min={0} step={1}
                  helper="Score the objective’s expected business benefit. Enter a whole number of 0 or more."
                  value={objective.plannedBusinessValue} disabled={reviewLocked}
                  onValueChange={plannedBusinessValue => updateObjective(epicId, { plannedBusinessValue })} />
              </TerasFieldGrid>
              {!local && !objective.id && <TerasNoteField label="Expected outcome" disabled={reviewLocked}
                helper="New objectives are recorded in the first iteration of this PI."
                value={reviewDescriptions[epicId] ?? ""} onValueChange={value => setReviewDescriptions(previous => ({ ...previous, [epicId]: value }))} />}
            </TerasContentTray>
            {laterTargets.filter(item => item.feature.epicId === epicId).map(({ feature, latest, target }) =>
              latest && target && <TerasContentTray key={feature.id} title={feature.title}
                description={`Child work is planned through ${iterationName(latest)}. Delivery is targeted for ${iterationName(target)}.`}>
                <TerasTextField label="Reason for later target" value={targetNote(feature.id, target)} disabled={reviewLocked}
                  onValueChange={reason => setDraft(current => current && ({
                    ...current, deliveryTargetNotes: { ...current.deliveryTargetNotes, [feature.id]: { iteration: target, reason } },
                  }))} />
              </TerasContentTray>)}
            <TerasContentTray title="Schedule changes">
              <TerasRecordTable ariaLabel={`Schedule changes for Epic ${epicId}`} density="compact"
                rows={planItems.filter(item => item.epicId === epicId)} getRowId={item => item.id} columns={[
                  { key: "item", header: "Work item", intent: "primary", render: item =>
                    <TerasRecordCellText title={item.title} meta={planningItemLabel(item)} /> },
                  { key: "before", header: "Before", render: item => {
                    const before = recorded.assignments[item.id]?.iteration ?? item.currentIteration;
                    return before ? iterationName(before) : "Unscheduled";
                  } },
                  { key: "proposed", header: "Proposed", render: item => iterationName(plan.assignments[item.id].iteration) },
                ]} />
            </TerasContentTray>
            </TerasFieldStack>
          </TerasPanel>;
        })}
        {touchedEpics.length === 0 && <TerasEmptyState>No assignment changes to review.</TerasEmptyState>}
      </TerasFieldStack>
    </TerasModalShell>}
  </>;
}
