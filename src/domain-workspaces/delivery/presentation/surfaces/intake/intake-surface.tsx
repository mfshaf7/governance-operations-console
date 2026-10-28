"use client";

import { DeliveryHistoryDialog } from "../../workflows/shared/history/delivery-history-dialog.tsx";
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
  TerasList, TerasSignalItem, TerasActionButton,
} from "@/teras";
import {
  intakeOwnerFilterOptions,
  intakeEvidenceIssuesForView,
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
  const [nativeHistoryId,setNativeHistoryId] = useState<string|null>(null);
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
  const evidenceIssues = intakeEvidenceIssuesForView(model, search, ownerFilter, statusFilter);
  const selectedSource =
    filteredSources.find((source) => source.accepted_source_id === selectedSourceId) ??
    filteredSources[0] ??
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
      if(model.source_truth === "OpenProject-backed OOS") {setNativeHistoryId(focusedSource.delivery_package_id);return;}
      setConsumeSourceId(null);
      setReturnToFocusedSourceAfterConsume(false);
      setReturnToFocusedSourceAfterConsumedSummary(true);
      setConsumedSummarySourceId(focusedSource.accepted_source_id);
      return;
    }

    setConsumedSummarySourceId(null);
    setReturnToFocusedSourceAfterConsumedSummary(false);
    setReturnToFocusedSourceAfterConsume(true);
    if (model.history_scope !== "history") setConsumeSourceId(focusedSource.accepted_source_id);
  }, [focusSourceId, focusToken, sources]);

  function openSourceAction(source: DeliveryIntakeSource) {
    setSelectedSourceId(source.accepted_source_id);
    setReturnToFocusedSourceAfterConsume(false);
    setReturnToFocusedSourceAfterConsumedSummary(false);

    if (source.intake_status === "consumed") {
      if(model.source_truth === "OpenProject-backed OOS") {setNativeHistoryId(source.delivery_package_id);return;}
      setConsumedSummarySourceId(source.accepted_source_id);
      return;
    }

    if (model.history_scope !== "history") setConsumeSourceId(source.accepted_source_id);
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
      <DeliveryHistoryDialog deliveryId={nativeHistoryId} onClose={()=>setNativeHistoryId(null)} focus="intake"/>
      <TerasRecordControlLayout
        composition="fullscreen-register"
        data-delivery-surface-register="intake"
        mode="register-selected"
        register={
          <TerasRegisterPanel
            description={model.evidence_coverage ? `${model.history_scope === "history" ? "Original admitted and consumed sources. " : "Handoffs awaiting application remain in their origin workflow. Switch to History for consumed sources. "}${model.evidence_coverage.intake.detail}` : "Default view shows accepted sources that still need a Delivery shell."}
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
            statusLabel={model.history_scope==="history"&&model.evidence_coverage?.intake.complete===false?"Loading original evidence":`${filteredSources.length}/${sources.length} shown`}
            statusTone="warn"
            title="Accepted Source Register"
          >
            {evidenceIssues.length ? <TerasList ariaLabel="Unverified Intake source evidence" frame="contained" scrollHeight="short">
              {evidenceIssues.map(issue=><TerasSignalItem key={issue.target_ref} tone="warn" label="Intake evidence unavailable" title={issue.target_ref} detail={issue.detail}
                actions={<TerasActionButton emphasis="secondary" onClick={()=>setNativeHistoryId(`delivery-${issue.target_ref.split("/").at(-1)}`)}>Inspect owner history</TerasActionButton>}/>)}
            </TerasList> : null}
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
                {model.evidence_coverage?.intake.state === "unavailable" ? "Native Intake evidence is unavailable. Refresh to retry; no empty-history claim is made." : model.history_scope === "history"&&model.evidence_coverage?.intake.complete===false ? "Loading original Intake evidence. Global totals and filter results are not complete yet." : model.history_scope === "current" ? "No admitted sources require a Delivery shell. Consumed sources remain in History." : "No verified Intake sources match these filters. Evidence issues are listed separately."}
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

      {consumeSource && model.history_scope !== "history" ? (
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
