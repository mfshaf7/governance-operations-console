"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  TerasActionButton,
  TerasDraftCloseGuardDialog,
  TerasEmptyState,
  TerasContentTray,
  TerasLoadingState,
  TerasFieldGrid,
  TerasMetadataList,
  TerasModalShell,
  TerasSelectField,
  TerasTextField,
  TerasTrayStack,
  TerasTechnicalDetails,
  type TerasSelectOption,
} from "@/teras";
import type { OperationOwnerRepoCatalogOption } from "@/domain-workspaces/operation-contracts/owner-repository";
import { iterationWindows, nextPlanningIncrementName, overlappingPlanningIncrement, recordedIterationLabels } from "../../../work-model/catalog/planning-calendar.ts";
import { iterationCatalogId } from "../../../work-model/catalog/catalog-selectors.ts";
import { DeliveryPlanningCalendar } from "../../shared/delivery-planning-calendar.tsx";
import type {
  DeliveryCatalogItem,
  DeliveryCatalogValue,
} from "../../../read-model/index.ts";

import {
  catalogDraftStandardHelp,
  catalogDraftLabelFieldLabel,
  catalogDraftLabelForStorage,
  catalogDraftStandardError,
  catalogDraftValueKey,
  catalogDraftPreviewMetadata,
  catalogMutationActionLabel,
  catalogMutationDescription,
  catalogMutationTitle,
  catalogRetirementMetadata,
  isOwnerRepoCatalog,
  isTargetPiCatalog,
  parentTargetPiValueKey,
  planningWindowForTargetPi,
  type CatalogMutationSubmit,
  type DeliveryCatalogMutationMode,
} from "./catalog-view-model.ts";

export function CatalogMutationDialog({
  calendarTarget,
  catalog,
  catalogValues,
  generateIterationsByDefault = false,
  mode,
  mutationError,
  recoveryRequired = false,
  onClose,
  onSubmit,
  open,
  ownerRepoOptions,
  repositorySearch,
  preferredOwnerRepoId,
  planningFacetSummary,
  supportsIterationGeneration = false,
  targetPiValues,
  value,
}: {
  calendarTarget?: {
    value: string;
    options: readonly TerasSelectOption<string>[];
    onChange: (value: string) => void;
  };
  catalog: DeliveryCatalogItem | null;
  catalogValues: DeliveryCatalogValue[];
  generateIterationsByDefault?: boolean;
  mode: DeliveryCatalogMutationMode | null;
  mutationError: string | null;
  recoveryRequired?: boolean;
  onClose: () => void;
  onSubmit: (draft: CatalogMutationSubmit) => void | Promise<void>;
  open: boolean;
  ownerRepoOptions: OperationOwnerRepoCatalogOption[];
  repositorySearch?: { query: string; loading: boolean; error: string | null; result: { more: boolean } | null; onQueryChange: (value: string) => void; refresh: () => void };
  preferredOwnerRepoId?: string | null;
  planningFacetSummary: string;
  supportsIterationGeneration?: boolean;
  targetPiValues: DeliveryCatalogValue[];
  value: DeliveryCatalogValue | null;
}) {
  const initialLabel = value?.label ?? "";
  const [label, setLabel] = useState(initialLabel);
  const [description, setDescription] = useState(value?.description ?? "");
  const [selectedOwnerRepoId, setSelectedOwnerRepoId] = useState("");
  const [planningWindowStartDate, setPlanningWindowStartDate] = useState("");
  const [planningWindowEndDate, setPlanningWindowEndDate] = useState("");
  const [iterationLength, setIterationLength] = useState("");
  const [iterationCount, setIterationCount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [closeGuard, setCloseGuard] = useState<"close" | "reload" | { target: string } | null>(null);
  const [sourceChanged, setSourceChanged] = useState(false);
  const [reload, setReload] = useState(0);
  const initializedSource = useRef<string | null>(null);
  const baseline = useRef<string | null>(null);
  const draftKey = JSON.stringify([label, description, selectedOwnerRepoId, planningWindowStartDate, planningWindowEndDate, iterationLength, iterationCount]);
  const draftRef = useRef(draftKey); draftRef.current = draftKey;
  const dirty = open && baseline.current !== null && draftKey !== baseline.current;
  const pendingTarget = typeof closeGuard === "object" ? closeGuard?.target : undefined;
  const awaitingCalendarTarget = Boolean(calendarTarget) && mode === null;
  const canChangeCalendarTarget = Boolean(calendarTarget) && !awaitingCalendarTarget && !recoveryRequired;

  function changeCalendarTarget(target: string) {
    initializedSource.current = null;
    baseline.current = null;
    setCloseGuard(null);
    calendarTarget?.onChange(target);
  }

  function requestCalendarTarget(target: string) {
    if (target === calendarTarget?.value || submitting || recoveryRequired) return;
    if (dirty) setCloseGuard({ target });
    else changeCalendarTarget(target);
  }

  function requestClose() {
    if (submitting) return;
    if (dirty) setCloseGuard("close");
    else onClose();
  }
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (open && (dirty || submitting)) event.preventDefault(); };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [open, dirty, submitting]);
  const resolvedMode = mode ?? "add";
  const isRetireMode = resolvedMode === "retire";
  const linksOwnerRepo = isOwnerRepoCatalog(catalog) && !isRetireMode;
  const editsTargetPiPlanningWindow =
    isTargetPiCatalog(catalog) && !isRetireMode;
  const calendarSetup = editsTargetPiPlanningWindow && (generateIterationsByDefault || resolvedMode === "add");
  const hasDatedIterations = value !== null && catalogValues.some(entry =>
    entry.catalog_item_id === iterationCatalogId && entry.parent_catalog_value_key === value.value_key &&
    entry.lifecycle_state !== "retired" && entry.iteration_window);
  const generatesIterations = calendarSetup && supportsIterationGeneration && !hasDatedIterations;
  const upcomingWindows = generatesIterations
    ? iterationWindows(planningWindowStartDate, Number(iterationLength), Number(iterationCount)) : [];
  const effectivePlanningEnd = generatesIterations ? upcomingWindows.at(-1)?.end_date ?? "" : planningWindowEndDate;
  const recordedLabels = recordedIterationLabels(catalogValues, value?.value_key ?? "");
  const upcomingKeys = new Set(upcomingWindows.map(window => `${value?.value_key} / Iteration ${window.sequence}`));
  const otherLabels = recordedLabels.filter(entry => !upcomingKeys.has(entry.value_key));
  const effectiveLabel = label || (editsTargetPiPlanningWindow && resolvedMode === "add"
    ? nextPlanningIncrementName(planningWindowStartDate, targetPiValues) : "");
  const existingOwnerRepoValueKeys = useMemo(
    () =>
      new Set(
        catalogValues
          .filter(
            (catalogValue) =>
              catalogValue.catalog_item_id === catalog?.catalog_item_id,
          )
          .map((catalogValue) => catalogValue.value_key),
      ),
    [catalog, catalogValues],
  );
  const ownerRepoSelectCandidates = useMemo(() => {
    if (!linksOwnerRepo) {
      return [];
    }

    if (resolvedMode === "edit") {
      return ownerRepoOptions;
    }

    return ownerRepoOptions.filter(
      (option) => !existingOwnerRepoValueKeys.has(option.valueKey),
    );
  }, [
    existingOwnerRepoValueKeys,
    linksOwnerRepo,
    ownerRepoOptions,
    resolvedMode,
  ]);
  const ownerRepoSelectOptions = useMemo(
    () =>
      ownerRepoSelectCandidates.length > 0
        ? [...(repositorySearch ? [{ label: "Select a registered repository", value: "" }] : []), ...ownerRepoSelectCandidates.map((option) => ({
            label: option.label,
            value: option.id,
          }))]
        : [
            {
              label: "No unlinked repository matches this search",
              value: "",
            },
          ],
    [ownerRepoSelectCandidates, repositorySearch],
  );
  const selectedOwnerRepo =
    ownerRepoOptions.find((option) => option.id === selectedOwnerRepoId) ??
    null;
  const derivedValueKey = catalogDraftValueKey({
    catalog,
    label: selectedOwnerRepo?.valueKey ?? effectiveLabel,
  });
  const storedLabel = selectedOwnerRepo
    ? selectedOwnerRepo.label
    : catalogDraftLabelForStorage({ label: effectiveLabel });
  const ownerRepoError =
    linksOwnerRepo && (repositorySearch?.loading || repositorySearch?.error || !selectedOwnerRepo)
      ? "Select an admitted repository before preparing the Implementation repository request."
      : null;
  const overlappingPI = generatesIterations ? overlappingPlanningIncrement(
    planningWindowStartDate, effectivePlanningEnd, value?.value_key ?? derivedValueKey, catalogValues,
  ) : null;
  const standardError =
    ownerRepoError ?? (overlappingPI ? `These dates overlap the calendar for ${overlappingPI}.` : null) ??
    catalogDraftStandardError({
      catalog,
      label: selectedOwnerRepo?.valueKey ?? effectiveLabel,
    });
  const submitDisabled = isRetireMode
    ? value === null
    : awaitingCalendarTarget || standardError !== null ||
      (calendarSetup && (!generatesIterations || !upcomingWindows.length));

  useEffect(() => {
    if (!open) { initializedSource.current = null; baseline.current = null; return; }
    if (linksOwnerRepo && repositorySearch && (repositorySearch.loading || repositorySearch.error)) return;
    const initialLength = generatesIterations ? "14" : "";
    const initialCount = generatesIterations ? "5" : "";
    const planningWindow = planningWindowForTargetPi(catalogValues, value?.value_key ?? null);
    const start = planningWindow.value?.lifecycle_state === "missing" ? "" : planningWindow.startDate;
    const end = planningWindow.value?.lifecycle_state === "missing" ? "" : planningWindow.endDate;
    const sourceKey = JSON.stringify([catalog, value, mode, repositorySearch ? null : ownerRepoSelectCandidates, preferredOwnerRepoId, planningWindow, initialLength, initialCount]);
    if (initializedSource.current === sourceKey) return;
    if (initializedSource.current !== null && baseline.current !== draftRef.current) {
      setSourceChanged(true); return;
    }
    initializedSource.current = sourceKey;
    setSourceChanged(false); setCloseGuard(null);
    const initialOwner = isOwnerRepoCatalog(catalog)
      ? (value ? ownerRepoOptions.find(option => option.valueKey === value.value_key) : null) ??
        ownerRepoSelectCandidates.find(option => option.id === preferredOwnerRepoId) ?? (repositorySearch ? null : ownerRepoSelectCandidates[0] ?? ownerRepoOptions[0])
      : null;
    const initialWindow = planningWindowForTargetPi(catalogValues, value?.value_key ?? null);
    baseline.current = JSON.stringify([initialLabel, value?.description ?? "", initialOwner?.id ?? "", start, end, initialLength, initialCount]);
    setLabel(initialLabel);
    setDescription(value?.description ?? "");
    if (isOwnerRepoCatalog(catalog)) {
      const matchingOwnerRepo = value
        ? ownerRepoOptions.find((option) => option.valueKey === value.value_key)
        : null;
      const firstAvailableOwnerRepo =
        ownerRepoSelectCandidates.find(
          (option) => option.id === preferredOwnerRepoId,
        ) ?? (repositorySearch ? null : ownerRepoSelectCandidates[0] ?? ownerRepoOptions[0]) ?? null;

      setSelectedOwnerRepoId(
        matchingOwnerRepo?.id ?? firstAvailableOwnerRepo?.id ?? "",
      );
    } else {
      setSelectedOwnerRepoId("");
    }
    setPlanningWindowStartDate(start);
    setPlanningWindowEndDate(end);
    setIterationLength(initialLength);
    setIterationCount(initialCount);
  }, [
    catalog,
    catalogValues,
    generatesIterations,
    initialLabel,
    ownerRepoOptions,
    ownerRepoSelectCandidates,
    preferredOwnerRepoId,
    value,
    open,
    mode,
    reload,
  ]);

  async function submitMutationDraft() {
    if (submitting || (!recoveryRequired && (submitDisabled || sourceChanged))) return;
    setSubmitting(true);
    try {
    if (isRetireMode) {
      if (!value) {
        return;
      }

      await onSubmit({
        description: value.description,
        label: value.label,
        parentCatalogValueKey: parentTargetPiValueKey(value),
        planningWindowEndDate,
        planningWindowStartDate,
        valueKey: value.value_key,
      });
      return;
    }

    await onSubmit({
      description:
        selectedOwnerRepo?.description ?? description.trim(),
      iterationLengthDays: generatesIterations ? Number(iterationLength) : undefined,
      iterationCount: generatesIterations ? Number(iterationCount) : undefined,
      label: storedLabel,
      linkedRepository: linksOwnerRepo ? selectedOwnerRepo : null,
      parentCatalogValueKey: null,
      planningWindowEndDate: editsTargetPiPlanningWindow ? effectivePlanningEnd || undefined : undefined,
      planningWindowStartDate: editsTargetPiPlanningWindow ? planningWindowStartDate || undefined : undefined,
      valueKey: derivedValueKey,
    });
    } finally { setSubmitting(false); }
  }

  if (!open) {
    return null;
  }

  return (
    <>
    <TerasModalShell busy={submitting} busyLabel="Applying catalog change…"
      bodyLayout="scroll"
      height="content"
      width={calendarSetup ? "medium" : "standard"}
      modalAttributes={awaitingCalendarTarget ? { style: { maxWidth: "33rem" } } : undefined}
      description={awaitingCalendarTarget ? "Choose a new or existing PI, then set its dates." : calendarSetup ? value
        ? "Enter the verified start date and cadence. Existing work stays assigned to its recorded iteration."
        : "Choose a start date and cadence, then review the calculated schedule."
        : catalogMutationDescription(resolvedMode, value, catalog)}
      footer={
        <>
          <TerasActionButton disabled={submitting} emphasis="secondary"
            onClick={canChangeCalendarTarget ? () => requestCalendarTarget("") : requestClose}>
            {canChangeCalendarTarget ? "Change PI" : "Cancel"}
          </TerasActionButton>
          {(!awaitingCalendarTarget || recoveryRequired) && <TerasActionButton
            disabled={submitting || (!recoveryRequired && (submitDisabled || sourceChanged))}
            emphasis="primary"
            onClick={submitMutationDraft}
            tone={resolvedMode === "retire" ? "danger" : "accent"}
          >
            {recoveryRequired ? "Retry same change" : calendarSetup && resolvedMode === "add" ? "Create PI"
              : calendarTarget ? "Save calendar"
              : catalogMutationActionLabel(resolvedMode, value, catalog)}
          </TerasActionButton>}
        </>
      }
      kicker={calendarTarget ? "PI Planning" : "Delivery Catalog"}
      onClose={requestClose}
      surfaceId="delivery-catalog-mutation"
      title={calendarTarget ? "Set up calendar" : calendarSetup ? resolvedMode === "add" ? "Create PI" : "Set up PI calendar" : catalogMutationTitle(resolvedMode, catalog, value)}
    >
      <TerasTrayStack>
        {calendarTarget && awaitingCalendarTarget &&
          <TerasSelectField label="Planning increment" value={calendarTarget.value}
            options={calendarTarget.options} onValueChange={requestCalendarTarget} disabled={submitting || recoveryRequired} />}
        {sourceChanged ? <TerasEmptyState>Catalog values changed while this draft was open. Your edits are retained. Reload the current values before submitting.
          <TerasActionButton disabled={submitting || recoveryRequired} emphasis="secondary" onClick={() => setCloseGuard("reload")}>Reload current values</TerasActionButton>
        </TerasEmptyState> : null}
        {recoveryRequired ? <TerasContentTray kicker="Outcome not confirmed" description="Your original change is retained. Retry sends that same accepted request, so the backend can recover its receipt. Closing this form does not cancel a change that may already have been applied." /> : null}
        {calendarSetup && !supportsIterationGeneration && !recoveryRequired &&
          <TerasContentTray title="Calendar setup unavailable" description="The connected Catalog cannot save a planning calendar yet." />}
        {mutationError ? (
          <TerasMetadataList
            columns={1}
            items={[
              {
                label: "Submission",
                tone: "danger",
                value: mutationError,
              },
            ]}
          />
        ) : null}
        {awaitingCalendarTarget ? null : isRetireMode ? (
          <>
            <TerasContentTray kicker="Before retiring" description="This value must have no active Delivery references. Retirement keeps its history and removes it from new choices.">
              <TerasMetadataList items={catalogRetirementMetadata({catalog, planningFacetSummary, value}).filter(item => ["Current State", "Used By", "Target PI Link"].includes(String(item.label)))} />
            </TerasContentTray>
            <TerasTechnicalDetails items={catalogRetirementMetadata({catalog, planningFacetSummary, value}).filter(item => !["Current State", "Used By", "Target PI Link"].includes(String(item.label)))} />
          </>
        ) : (
          <>
            {linksOwnerRepo ? (
              <>
              {repositorySearch ? <TerasTextField label="Search registered repositories" value={repositorySearch.query} disabled={submitting || recoveryRequired}
                onValueChange={query => { setSelectedOwnerRepoId(""); repositorySearch.onQueryChange(query); }} /> : null}
              {repositorySearch?.loading ? <TerasLoadingState label="Reading registered repositories…" /> : repositorySearch?.error ?
                <TerasContentTray kicker="Repository list unavailable" description={repositorySearch.error}
                  actions={<TerasActionButton emphasis="secondary" onClick={repositorySearch.refresh}>Retry</TerasActionButton>} /> : <>
              <TerasSelectField
                disabled={submitting || recoveryRequired || ownerRepoSelectCandidates.length === 0}
                helper={repositorySearch?.result?.more ? "More repositories match. Refine the search to find another repository." : "Select an active registration from Repository Control for use in Delivery."}
                label="Admitted Repository"
                onValueChange={setSelectedOwnerRepoId}
                options={ownerRepoSelectOptions}
                tone="warn"
                treatment="highlighted"
                value={selectedOwnerRepoId}
              />
              </>}
              </>
            ) : !calendarSetup ? (
              <TerasTextField
                disabled={submitting || recoveryRequired}
                readOnly={editsTargetPiPlanningWindow && hasDatedIterations}
                label={catalogDraftLabelFieldLabel(catalog)}
                helper={catalogDraftStandardHelp(catalog)}
                onValueChange={setLabel}
                placeholder={editsTargetPiPlanningWindow ? effectiveLabel || "PI-YYYY-NN" : undefined}
                value={label}
              />
            ) : null}
            {calendarSetup && <TerasMetadataList aria-label="Planning increment" aria-live="polite" columns={1} items={[
              { label: "PI name", value: value?.value_key ?? (derivedValueKey || "Choose a start date to generate the name.") },
            ]} />}
            {generatesIterations ? (
              <TerasFieldGrid>
                <TerasTextField
                  autoFocus={Boolean(calendarTarget) && !recoveryRequired && !hasDatedIterations}
                  disabled={submitting || recoveryRequired}
                  label="Planning Start"
                  onValueChange={setPlanningWindowStartDate}
                  type="date"
                  value={planningWindowStartDate}
                />
                <TerasTextField
                  disabled={submitting || recoveryRequired}
                  readOnly
                  label="Planning End"
                  onValueChange={() => undefined}
                  type="date"
                  value={effectivePlanningEnd}
                />
                  <TerasTextField label="Number of iterations" type="number" min={1} max={100} step={1}
                    disabled={submitting || recoveryRequired} value={iterationCount} onValueChange={setIterationCount} />
                  <TerasTextField label="Iteration length (days)" type="number" min={1} step={1}
                    disabled={submitting || recoveryRequired} value={iterationLength} onValueChange={setIterationLength} />
              </TerasFieldGrid>
            ) : null}
            {generatesIterations && <DeliveryPlanningCalendar catalogValues={catalogValues}
              pi={value?.value_key ?? derivedValueKey} startDate={planningWindowStartDate}
              iterations={upcomingWindows} onSelectStart={setPlanningWindowStartDate} disabled={submitting || recoveryRequired} />}
            {generatesIterations && planningWindowStartDate && !upcomingWindows.length &&
              <TerasContentTray description="Enter a valid start date, 1 to 100 iterations, and a length in whole days." />}
            {generatesIterations && otherLabels.length > 0 && <TerasContentTray title={upcomingWindows.length ? "Labels outside this calendar" : "Recorded iteration labels"}
              description={upcomingWindows.length ? "These assignments keep their existing labels. Review any open work that needs a scheduled iteration." : undefined}>
              <TerasMetadataList columns={2} items={otherLabels.map(entry => ({
                label: entry.value_key.slice((value?.value_key.length ?? 0) + 3),
                value: `${entry.usage_count} recorded assignment${entry.usage_count === 1 ? "" : "s"}`,
              }))} />
            </TerasContentTray>}
            {!linksOwnerRepo && !calendarSetup ? (
              <TerasTextField
                disabled={submitting || recoveryRequired}
                label="Description (optional)"
                onValueChange={setDescription}
                value={description}
              />
            ) : null}
            {standardError && (!calendarSetup || planningWindowStartDate) ? <TerasContentTray kicker="Before saving" description={standardError} /> : null}
            {!calendarSetup && <TerasTechnicalDetails items={catalogDraftPreviewMetadata({
                catalog,
                derivedValueKey,
                linkedRepository: selectedOwnerRepo,
                planningFacetSummary,
                standardError,
              })}
            />}
          </>
        )}
      </TerasTrayStack>
    </TerasModalShell>
    <TerasDraftCloseGuardDialog open={closeGuard !== null} title={pendingTarget !== undefined ? "Change the selected PI?"
      : closeGuard === "reload" ? "Reload Catalog draft?" : calendarTarget ? "Discard calendar draft?" : "Discard Catalog edits?"}
      kicker={calendarTarget ? "PI Planning" : "Catalog change"}
      description={recoveryRequired ? "The outcome is unconfirmed. Closing does not undo any applied change. Keep this form open and retry the same change to recover its receipt." : "These edits have not been submitted. Discarding removes only this draft."}
      leaveLabel={pendingTarget !== undefined ? "Discard and change PI" : closeGuard === "reload" ? "Discard and Reload" : "Discard Draft"}
      onKeepEditing={() => setCloseGuard(null)} onLeave={() => {
        if (pendingTarget !== undefined) changeCalendarTarget(pendingTarget);
        else if (closeGuard === "reload") { initializedSource.current = null; setReload(value => value + 1); setCloseGuard(null); }
        else onClose();
      }} />
    </>
  );
}
