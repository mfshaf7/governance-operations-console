"use client";

import { useRef, useState } from "react";
import { TerasActionButton, TerasContentTray, TerasLoadingState, TerasModalShell, TerasTrayStack } from "@/teras";

import type { DeliveryReadModel } from "../../../read-model/index.ts";
import { submitCatalogMutationCommand } from "../../../local-runtime/commands/catalog-mutation-runtime.ts";
import { useCatalogLiveRuntime } from "../../../live-runtime/use-catalog-live-runtime.ts";
import { iterationCatalogId, targetPiCatalogId } from "../../../work-model/catalog/catalog-selectors.ts";
import type { CatalogMutationSubmit } from "../../../work-model/catalog/catalog-mutation-types.ts";
import { CatalogMutationDialog } from "../catalog/catalog-mutation-dialog.tsx";

const newPiChoice = "new";

export function PIPlanningCalendarDialog({ model, onClose, onSaved }: {
  model: DeliveryReadModel;
  onClose: () => void;
  onSaved: (pi: string) => void;
}) {
  const local = model.source_truth === "mock";
  const runtime = useCatalogLiveRuntime({ enabled: !local });
  const catalog = local ? model.catalog : runtime.readModel;
  const item = catalog?.items.find(item => item.catalog_item_id === targetPiCatalogId) ?? null;
  const values = catalog?.values ?? [];
  const targetPiValues = values.filter(value => value.catalog_item_id === targetPiCatalogId);
  const scheduledPIs = new Set(values.filter(value =>
    value.catalog_item_id === iterationCatalogId && value.lifecycle_state !== "retired" && value.iteration_window
  ).map(value => value.parent_catalog_value_key));
  const unscheduledPIs = targetPiValues.filter(value =>
    ["active", "admitted"].includes(value.lifecycle_state) && /^PI-\d{4}-\d{2}$/.test(value.value_key)
    && !scheduledPIs.has(value.value_key));
  const [target, setTarget] = useState("");
  const value = unscheduledPIs.find(candidate => candidate.value_key === target) ?? null;
  const mode = target === newPiChoice ? "add" : value ? "edit" : null;
  const targetUnavailable = target && !mode;
  const supportsGeneration = local || Boolean(item?.supports_iteration_generation);
  const acceptance = useRef<{ acceptanceId: string; acceptedAt: string; key: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const canPrepare = Boolean(item && supportsGeneration);

  async function submit(draft: CatalogMutationSubmit) {
    setError(null);
    if (!item || !canPrepare || (!mode && !runtime.recoveryRequired)) {
      setError("The connected Catalog cannot save a planning calendar yet.");
      return;
    }
    try {
      if (runtime.recoveryRequired) {
        const result = await runtime.recover();
        const savedPI = result?.catalogValues.find(value => value.catalog_value_id === result.selectedValueId);
        if (!savedPI) throw new Error("The Catalog did not confirm the calendar.");
        onSaved(savedPI.value_key);
        return;
      }
      if (!mode) return;
      const mutationDraft = { mode, valueId: value?.catalog_value_id ?? null } as const;
      const key = JSON.stringify({ draft, mutationDraft, revision: catalog?.source_revision });
      if (acceptance.current?.key !== key) {
        acceptance.current = { key, acceptanceId: `catalog-acceptance:${crypto.randomUUID()}`, acceptedAt: new Date().toISOString() };
      }
      const result = local
        ? await submitCatalogMutationCommand({ activeCatalog: item, catalogValues: values, draft, mutationDraft })
        : acceptance.current && await runtime.mutate(targetPiCatalogId, {
            expectedSourceRevision: catalog?.source_revision ?? "", draft, mode,
            targetValueId: mutationDraft.valueId, acceptanceId: acceptance.current.acceptanceId,
            acceptedAt: acceptance.current.acceptedAt,
          });
      if (!result) {
        setError("The Catalog did not confirm the calendar.");
        return;
      }
      onSaved(result.catalogValues.find(value => value.catalog_value_id === result.selectedValueId)?.value_key ?? draft.valueKey);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The calendar could not be saved.");
    }
  }

  if (!canPrepare) {
    const loading = !local && (runtime.loading || retrying);
    return <TerasModalShell kicker="PI Planning" title="Set up calendar"
      surfaceId="delivery-pi-planning-calendar-source" bodyLayout="scroll" height="content" width="medium"
      onClose={onClose} footer={<TerasActionButton emphasis="secondary" onClick={onClose}>Close</TerasActionButton>}>
      <TerasTrayStack>
        {loading ? <TerasLoadingState label="Loading PI details…" /> :
          <TerasContentTray title="Calendar setup unavailable"
            description={runtime.projectionError ?? "The connected Catalog cannot save a planning calendar yet."}
            actions={!local && <TerasActionButton emphasis="secondary" onClick={() => {
              setRetrying(true);
              void runtime.refresh().catch(() => undefined).finally(() => setRetrying(false));
            }}>Retry loading</TerasActionButton>} />}
      </TerasTrayStack>
    </TerasModalShell>;
  }

  return <CatalogMutationDialog open mode={mode} catalog={item} catalogValues={values} value={value}
    targetPiValues={targetPiValues} ownerRepoOptions={[]} planningFacetSummary=""
    generateIterationsByDefault supportsIterationGeneration={supportsGeneration}
    calendarTarget={{
      value: target,
      options: [
        { value: "", label: "Choose a PI" },
        ...(targetUnavailable ? [{ value: target, label: target }] : []),
        { value: newPiChoice, label: "Create a new PI" },
        ...unscheduledPIs.map(pi => ({ value: pi.value_key, label: pi.label })),
      ],
      onChange: value => {
        setTarget(value);
        setError(null);
      },
    }}
    mutationError={error ?? runtime.projectionError ?? (targetUnavailable ? "This PI is no longer available for calendar setup. Choose another PI." : null)}
    recoveryRequired={runtime.recoveryRequired}
    onClose={onClose} onSubmit={submit} />;
}
