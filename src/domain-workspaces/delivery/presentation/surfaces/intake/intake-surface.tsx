"use client";

import { useEffect, useRef, useState } from "react";

import type {
  DeliveryIntakeSource,
  DeliveryIntakeSourceStatus,
  DeliveryReadModel,
} from "../../../read-model/index.ts";
import { getDeliveryIntakeSources } from "../../../read-model/index.ts";

import {
  TerasEmptyState,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
} from "@/teras";
import {
  intakeOwnerFilterOptions,
  intakeStatusFilterOptions,
} from "./intake-view-model.ts";
import {
  DeliveryIntakeConsumeModal,
  DeliveryIntakeConsumedSummaryModal,
} from "./intake-modals.tsx";
import { DeliveryIntakeRegisterTable } from "./intake-register-table.tsx";
import { DeliveryIntakeSelectedSource } from "./intake-selected-source.tsx";
import type { DeliverySurfaceConfig } from "../../workspace/workspace-types.ts";

export function DeliveryIntakeSurface({
  focusSourceId,
  focusToken,
  model,
  onCloseFocusedSource,
  onConsumeSource,
  surface,
}: {
  focusSourceId?: string | null;
  focusToken?: number | null;
  model: DeliveryReadModel;
  onCloseFocusedSource?: () => void;
  onConsumeSource: (source: DeliveryIntakeSource) => void;
  surface: DeliverySurfaceConfig;
}) {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [consumeSourceId, setConsumeSourceId] = useState<string | null>(null);
  const [consumedSummarySourceId, setConsumedSummarySourceId] = useState<
    string | null
  >(null);
  const [
    returnToFocusedSourceAfterConsume,
    setReturnToFocusedSourceAfterConsume,
  ] = useState(false);
  const [
    returnToFocusedSourceAfterConsumedSummary,
    setReturnToFocusedSourceAfterConsumedSummary,
  ] = useState(false);
  const handledFocusTokenRef = useRef<number | null>(null);
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    DeliveryIntakeSourceStatus | "all"
  >("all");
  const sources = getDeliveryIntakeSources(model);
  const ownerOptions = intakeOwnerFilterOptions(sources);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredSources = sources.filter((source) => {
    const matchesOwner = ownerFilter === "all" || source.owner === ownerFilter;
    const matchesStatus =
      statusFilter === "all" || source.intake_status === statusFilter;
    const matchesSearch = normalizedSearch
      ? [
          source.accepted_source_id,
          source.delivery_package_id ?? "",
          source.gate_summary,
          source.owner,
          source.source_ref,
          source.status_label,
          source.summary,
          source.title,
          source.work_design_session_ref ?? "",
          ...source.evidence_refs,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)
      : true;

    return matchesOwner && matchesStatus && matchesSearch;
  });
  const selectedSource =
    sources.find((source) => source.accepted_source_id === selectedSourceId) ??
    filteredSources[0] ??
    sources[0] ??
    null;
  const consumeSource =
    sources.find((source) => source.accepted_source_id === consumeSourceId) ??
    null;
  const consumedSummarySource =
    sources.find(
      (source) => source.accepted_source_id === consumedSummarySourceId,
    ) ?? null;

  useEffect(() => {
    if (
      !focusSourceId ||
      !focusToken ||
      handledFocusTokenRef.current === focusToken
    ) {
      return;
    }

    const focusedSource = sources.find(
      (source) => source.accepted_source_id === focusSourceId,
    );

    if (!focusedSource) {
      return;
    }

    handledFocusTokenRef.current = focusToken;
    setOwnerFilter("all");
    setSearch("");
    setStatusFilter("all");
    setSelectedSourceId(focusedSource.accepted_source_id);

    if (focusedSource.intake_status === "consumed") {
      setConsumeSourceId(null);
      setReturnToFocusedSourceAfterConsume(false);
      setReturnToFocusedSourceAfterConsumedSummary(true);
      setConsumedSummarySourceId(focusedSource.accepted_source_id);
      return;
    }

    setConsumedSummarySourceId(null);
    setReturnToFocusedSourceAfterConsumedSummary(false);
    setReturnToFocusedSourceAfterConsume(true);
    setConsumeSourceId(focusedSource.accepted_source_id);
  }, [focusSourceId, focusToken, sources]);

  function openSourceAction(source: DeliveryIntakeSource) {
    setSelectedSourceId(source.accepted_source_id);
    setReturnToFocusedSourceAfterConsume(false);
    setReturnToFocusedSourceAfterConsumedSummary(false);

    if (source.intake_status === "consumed") {
      setConsumedSummarySourceId(source.accepted_source_id);
      return;
    }

    setConsumeSourceId(source.accepted_source_id);
  }

  function closeConsumeModal() {
    setConsumeSourceId(null);
    if (returnToFocusedSourceAfterConsume) {
      onCloseFocusedSource?.();
    }
    setReturnToFocusedSourceAfterConsume(false);
  }

  function closeConsumedSummaryModal() {
    setConsumedSummarySourceId(null);
    if (returnToFocusedSourceAfterConsumedSummary) {
      onCloseFocusedSource?.();
    }
    setReturnToFocusedSourceAfterConsumedSummary(false);
  }

  return (
    <>
      <TerasRecordControlLayout
        composition="fullscreen-register"
        data-delivery-surface-register="intake"
        mode="register-selected"
        register={
          <TerasRegisterPanel
            description="Default view shows accepted sources that still need a Delivery shell."
            filterBar={
              <TerasFilterBar
                search={{
                  ariaLabel: "Search intake accepted sources",
                  onValueChange: setSearch,
                  placeholder: "Search accepted source, owner, evidence...",
                  value: search,
                }}
                filters={[
                  {
                    label: "Filter intake owner",
                    onValueChange: setOwnerFilter,
                    options: ownerOptions.map((owner) => ({
                      label: owner === "all" ? "All owners" : owner,
                      value: owner,
                    })),
                    value: ownerFilter,
                  },
                  {
                    label: "Filter intake status",
                    onValueChange: setStatusFilter,
                    options: intakeStatusFilterOptions,
                    value: statusFilter,
                  },
                ]}
              />
            }
            kicker={surface.title}
            statusLabel={`${filteredSources.length}/${sources.length} shown`}
            statusTone="warn"
            title="Accepted Source Register"
          >
            {filteredSources.length > 0 ? (
              <DeliveryIntakeRegisterTable
                onAction={openSourceAction}
                onSelect={(source) =>
                  setSelectedSourceId(source.accepted_source_id)
                }
                selectedSourceId={selectedSource?.accepted_source_id ?? null}
                sources={filteredSources}
              />
            ) : (
              <TerasEmptyState fill>
                No intake sources match the current filters.
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={
          <DeliveryIntakeSelectedSource
            onOpenAction={openSourceAction}
            source={selectedSource}
          />
        }
      />

      {consumeSource ? (
        <DeliveryIntakeConsumeModal
          onClose={closeConsumeModal}
          onConsume={() => {
            onConsumeSource(consumeSource);
            setConsumeSourceId(null);
            setReturnToFocusedSourceAfterConsume(false);
          }}
          source={consumeSource}
        />
      ) : null}

      {consumedSummarySource ? (
        <DeliveryIntakeConsumedSummaryModal
          onClose={closeConsumedSummaryModal}
          source={consumedSummarySource}
        />
      ) : null}
    </>
  );
}
