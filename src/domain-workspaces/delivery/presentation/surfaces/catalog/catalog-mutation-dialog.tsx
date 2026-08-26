"use client";

import { useEffect, useMemo, useState } from "react";

import {
  TerasActionButton,
  TerasFieldGrid,
  TerasMetadataList,
  TerasModalShell,
  TerasSelectField,
  TerasTextField,
  TerasTrayStack,
} from "@/teras";
import type { OperationOwnerRepoCatalogOption } from "@/domain-workspaces/operation-contracts/owner-repository";
import type {
  DeliveryCatalogItem,
  DeliveryCatalogValue,
} from "../../../read-model/index.ts";

import {
  catalogDraftLabel,
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
  onClose,
  onSubmit,
  open,
  ownerRepoOptions,
  planningFacetSummary,
  targetPiValues,
  value,
}: {
  catalog: DeliveryCatalogItem | null;
  catalogValues: DeliveryCatalogValue[];
  mode: DeliveryCatalogMutationMode | null;
  mutationError: string | null;
  onClose: () => void;
  onSubmit: (draft: CatalogMutationSubmit) => void;
  open: boolean;
  ownerRepoOptions: OperationOwnerRepoCatalogOption[];
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
        ? ownerRepoSelectCandidates.map((option) => ({
            label: option.label,
            value: option.id,
          }))
        : [
            {
              label: "No unlinked admitted repository available",
              value: "",
            },
          ],
    [ownerRepoSelectCandidates],
  );
  const selectedOwnerRepo =
    ownerRepoOptions.find((option) => option.id === selectedOwnerRepoId) ??
    null;
  const targetPiOptions = useMemo(
    () => catalogTargetPiSelectOptions(targetPiValues),
    [targetPiValues],
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
    linksOwnerRepo && !selectedOwnerRepo
      ? "Select an admitted repository before preparing the Owner Repo request."
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
          planningWindowEndDate.length === 0));

  useEffect(() => {
    if (!open) {
      return;
    }

    setLabel(catalogDraftLabel(catalog, value));
    setDescription(value?.description ?? "");
    if (isOwnerRepoCatalog(catalog)) {
      const matchingOwnerRepo = value
        ? ownerRepoOptions.find((option) => option.valueKey === value.value_key)
        : null;
      const firstAvailableOwnerRepo =
        ownerRepoSelectCandidates[0] ?? ownerRepoOptions[0] ?? null;

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
    targetPiOptions,
    value,
    open,
    mode,
  ]);

  function submitMutationDraft() {
    if (isRetireMode) {
      if (!value) {
        return;
      }

      onSubmit({
        description: value.description,
        label: value.label,
        parentCatalogValueKey: parentTargetPiValueKey(value),
        planningWindowEndDate,
        planningWindowStartDate,
        valueKey: value.value_key,
      });
      return;
    }

    onSubmit({
      description:
        selectedOwnerRepo?.description ??
        (description.trim() ||
          "Prototype-local catalog value staged for backend submission."),
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
  }

  if (!open) {
    return null;
  }

  return (
    <TerasModalShell
      bodyLayout="scroll"
      height="content"
      width="standard"
      description={catalogMutationDescription(resolvedMode, value, catalog)}
      footer={
        <>
          <TerasActionButton onClick={onClose} emphasis="secondary">
            Cancel
          </TerasActionButton>
          <TerasActionButton
            disabled={submitDisabled}
            emphasis="primary"
            onClick={submitMutationDraft}
            tone={resolvedMode === "retire" ? "danger" : "accent"}
          >
            {catalogMutationActionLabel(resolvedMode, value, catalog)}
          </TerasActionButton>
        </>
      }
      kicker="Catalog Mutation"
      onClose={onClose}
      surfaceId="delivery-catalog-mutation"
      title={catalogMutationTitle(resolvedMode, catalog, value)}
    >
      <TerasTrayStack>
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
          <TerasMetadataList
            items={catalogRetirementMetadata({
              catalog,
              planningFacetSummary,
              value,
            })}
          />
        ) : (
          <>
            {linksOwnerRepo ? (
              <TerasSelectField
                disabled={ownerRepoSelectCandidates.length === 0}
                helper="Select the repository admitted in Repository Control; Catalog links and syncs it as an owner_repo value."
                label="Admitted Repository"
                onValueChange={setSelectedOwnerRepoId}
                options={ownerRepoSelectOptions}
                tone="warn"
                treatment="highlighted"
                value={selectedOwnerRepoId}
              />
            ) : (
              <TerasTextField
                label={catalogDraftLabelFieldLabel(catalog)}
                onValueChange={setLabel}
                value={label}
              />
            )}
            {editsTargetPiPlanningWindow ? (
              <TerasFieldGrid>
                <TerasTextField
                  label="Planning Start"
                  onValueChange={setPlanningWindowStartDate}
                  type="date"
                  value={planningWindowStartDate}
                />
                <TerasTextField
                  label="Planning End"
                  onValueChange={setPlanningWindowEndDate}
                  type="date"
                  value={planningWindowEndDate}
                />
              </TerasFieldGrid>
            ) : null}
            {requiresTargetPiLink ? (
              <TerasSelectField
                disabled={targetPiValues.length === 0}
                helper="Iteration values must stay scoped to a Target PI."
                label="Target PI"
                onValueChange={setParentCatalogValueKey}
                options={targetPiOptions}
                value={parentCatalogValueKey}
              />
            ) : null}
            {!linksOwnerRepo ? (
              <TerasTextField
                label="Description"
                onValueChange={setDescription}
                value={description}
              />
            ) : null}
            <TerasMetadataList
              items={catalogDraftPreviewMetadata({
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
  );
}
