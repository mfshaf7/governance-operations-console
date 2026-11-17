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
} from "@/teras";
import type { OperationOwnerRepoCatalogOption } from "@/domain-workspaces/operation-contracts/owner-repository";
import type {
  DeliveryCatalogItem,
  DeliveryCatalogValue,
} from "../../../read-model/index.ts";

import {
  catalogDraftLabel,
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
  catalogTargetPiSelectOptions,
  isIterationCatalog,
  isOwnerRepoCatalog,
  isTargetPiCatalog,
  parentTargetPiValueKey,
  planningWindowForTargetPi,
  type CatalogMutationSubmit,
  type DeliveryCatalogMutationMode,
} from "./catalog-view-model.ts";

export function CatalogMutationDialog({
  catalog,
  catalogValues,
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
  targetPiValues,
  value,
}: {
  catalog: DeliveryCatalogItem | null;
  catalogValues: DeliveryCatalogValue[];
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
  targetPiValues: DeliveryCatalogValue[];
  value: DeliveryCatalogValue | null;
}) {
  const [label, setLabel] = useState(catalogDraftLabel(catalog, value));
  const [description, setDescription] = useState(value?.description ?? "");
  const [parentCatalogValueKey, setParentCatalogValueKey] = useState(
    parentTargetPiValueKey(value) ?? "",
  );
  const [selectedOwnerRepoId, setSelectedOwnerRepoId] = useState("");
  const [planningWindowStartDate, setPlanningWindowStartDate] = useState("");
  const [planningWindowEndDate, setPlanningWindowEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [closeGuard, setCloseGuard] = useState<"close" | "reload" | null>(null);
  const [sourceChanged, setSourceChanged] = useState(false);
  const [reload, setReload] = useState(0);
  const initializedSource = useRef<string | null>(null);
  const baseline = useRef<string | null>(null);
  const draftKey = JSON.stringify([label, description, parentCatalogValueKey, selectedOwnerRepoId, planningWindowStartDate, planningWindowEndDate]);
  const draftRef = useRef(draftKey); draftRef.current = draftKey;
  const dirty = open && baseline.current !== null && draftKey !== baseline.current;
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
  const requiresTargetPiLink = isIterationCatalog(catalog) && !isRetireMode;
  const editsTargetPiPlanningWindow =
    isTargetPiCatalog(catalog) && !isRetireMode;
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
  const targetPiOptions = useMemo(
    () => catalogTargetPiSelectOptions(targetPiValues, value ? parentTargetPiValueKey(value) : null),
    [targetPiValues, value],
  );
  const derivedValueKey = catalogDraftValueKey({
    catalog,
    label: selectedOwnerRepo?.valueKey ?? label,
    parentCatalogValueKey: requiresTargetPiLink ? parentCatalogValueKey : null,
  });
  const storedLabel = selectedOwnerRepo
    ? selectedOwnerRepo.label
    : catalogDraftLabelForStorage({ label });
  const ownerRepoError =
    linksOwnerRepo && (repositorySearch?.loading || repositorySearch?.error || !selectedOwnerRepo)
      ? "Select an admitted repository before preparing the Implementation repository request."
      : null;
  const standardError =
    ownerRepoError ??
    catalogDraftStandardError({
      catalog,
      label: selectedOwnerRepo?.valueKey ?? label,
      parentCatalogValueKey: requiresTargetPiLink
        ? parentCatalogValueKey
        : null,
    });
  const submitDisabled = isRetireMode
    ? value === null
    : standardError !== null ||
      (editsTargetPiPlanningWindow &&
        (planningWindowStartDate.length === 0 ||
          planningWindowEndDate.length === 0 || planningWindowEndDate < planningWindowStartDate));

  useEffect(() => {
    if (!open) { initializedSource.current = null; baseline.current = null; return; }
    if (linksOwnerRepo && repositorySearch && (repositorySearch.loading || repositorySearch.error)) return;
    const sourceKey = JSON.stringify([catalog, value, mode, repositorySearch ? null : ownerRepoSelectCandidates, preferredOwnerRepoId, targetPiOptions, planningWindowForTargetPi(catalogValues, value?.value_key ?? null)]);
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
    baseline.current = JSON.stringify([catalogDraftLabel(catalog, value), value?.description ?? "", parentTargetPiValueKey(value) ?? targetPiOptions[0]?.value ?? "", initialOwner?.id ?? "", initialWindow.startDate, initialWindow.endDate]);
    setLabel(catalogDraftLabel(catalog, value));
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
    setParentCatalogValueKey(
      parentTargetPiValueKey(value) ?? targetPiOptions[0]?.value ?? "",
    );
    const planningWindow = planningWindowForTargetPi(
      catalogValues,
      value?.value_key ?? null,
    );
    setPlanningWindowStartDate(planningWindow.startDate);
    setPlanningWindowEndDate(planningWindow.endDate);
  }, [
    catalog,
    catalogValues,
    ownerRepoOptions,
    ownerRepoSelectCandidates,
    preferredOwnerRepoId,
    targetPiOptions,
    value,
    open,
    mode,
    reload,
  ]);

  async function submitMutationDraft() {
    if (submitting || (sourceChanged && !recoveryRequired)) return;
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
      label: storedLabel,
      linkedRepository: linksOwnerRepo ? selectedOwnerRepo : null,
      parentCatalogValueKey: requiresTargetPiLink
        ? parentCatalogValueKey.trim()
        : null,
      planningWindowEndDate: editsTargetPiPlanningWindow
        ? planningWindowEndDate
        : undefined,
      planningWindowStartDate: editsTargetPiPlanningWindow
        ? planningWindowStartDate
        : undefined,
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
      width="standard"
      description={catalogMutationDescription(resolvedMode, value, catalog)}
      footer={
        <>
          <TerasActionButton disabled={submitting} onClick={requestClose} emphasis="secondary">
            Cancel
          </TerasActionButton>
          <TerasActionButton
            disabled={submitting || (!recoveryRequired && (submitDisabled || sourceChanged))}
            emphasis="primary"
            onClick={submitMutationDraft}
            tone={resolvedMode === "retire" ? "danger" : "accent"}
          >
            {recoveryRequired ? "Retry same change" : catalogMutationActionLabel(resolvedMode, value, catalog)}
          </TerasActionButton>
        </>
      }
      kicker="Delivery Catalog"
      onClose={requestClose}
      surfaceId="delivery-catalog-mutation"
      title={catalogMutationTitle(resolvedMode, catalog, value)}
    >
      <TerasTrayStack>
        {sourceChanged ? <TerasEmptyState>Catalog values changed while this draft was open. Your edits are retained. Reload the current values before submitting.
          <TerasActionButton disabled={submitting || recoveryRequired} emphasis="secondary" onClick={() => setCloseGuard("reload")}>Reload current values</TerasActionButton>
        </TerasEmptyState> : null}
        {recoveryRequired ? <TerasContentTray kicker="Outcome not confirmed" description="Your original change is retained. Retry sends that same accepted request, so the backend can recover its receipt. Closing this form does not cancel a change that may already have been applied." /> : null}
        {editsTargetPiPlanningWindow && planningWindowStartDate && planningWindowEndDate && planningWindowEndDate < planningWindowStartDate ? <TerasContentTray kicker="Check planning dates" description="Planning end must be on or after planning start." /> : null}
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
        {isRetireMode ? (
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
            ) : (
              <TerasTextField
                disabled={submitting || recoveryRequired}
                label={catalogDraftLabelFieldLabel(catalog)}
                helper={catalogDraftStandardHelp(catalog)}
                onValueChange={setLabel}
                value={label}
              />
            )}
            {editsTargetPiPlanningWindow ? (
              <TerasFieldGrid>
                <TerasTextField
                disabled={submitting || recoveryRequired}
                  label="Planning Start"
                  onValueChange={setPlanningWindowStartDate}
                  type="date"
                  value={planningWindowStartDate}
                />
                <TerasTextField
                disabled={submitting || recoveryRequired}
                  label="Planning End"
                  onValueChange={setPlanningWindowEndDate}
                  type="date"
                  value={planningWindowEndDate}
                />
              </TerasFieldGrid>
            ) : null}
            {requiresTargetPiLink ? (
              <TerasSelectField
                disabled={submitting || recoveryRequired || targetPiOptions[0]?.value === ""}
                helper="Iteration values must stay scoped to a Target PI."
                label="Target PI"
                onValueChange={setParentCatalogValueKey}
                options={targetPiOptions}
                value={parentCatalogValueKey}
              />
            ) : null}
            {!linksOwnerRepo ? (
              <TerasTextField
                disabled={submitting || recoveryRequired}
                label="Description (optional)"
                onValueChange={setDescription}
                value={description}
              />
            ) : null}
            {standardError ? <TerasContentTray kicker="Before saving" description={standardError} /> : null}
            <TerasTechnicalDetails items={catalogDraftPreviewMetadata({
                catalog,
                derivedValueKey,
                linkedRepository: selectedOwnerRepo,
                planningFacetSummary,
                standardError,
              })}
            />
          </>
        )}
      </TerasTrayStack>
    </TerasModalShell>
    <TerasDraftCloseGuardDialog open={closeGuard !== null} title={closeGuard === "reload" ? "Reload Catalog draft?" : "Discard Catalog edits?"}
      kicker="Catalog change" description={recoveryRequired ? "The outcome is unconfirmed. Closing does not undo any applied change. Keep this form open and retry the same change to recover its receipt." : "These edits have not been submitted. Discarding removes only this draft."}
      leaveLabel={closeGuard === "reload" ? "Discard and Reload" : "Discard Draft"}
      onKeepEditing={() => setCloseGuard(null)} onLeave={() => {
        if (closeGuard === "reload") { initializedSource.current = null; setReload(value => value + 1); setCloseGuard(null); }
        else onClose();
      }} />
    </>
  );
}
