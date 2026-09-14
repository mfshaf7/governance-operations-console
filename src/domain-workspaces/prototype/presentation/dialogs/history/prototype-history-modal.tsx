"use client";

import { useEffect, useState } from "react";

import {
  TerasStatusItem,
  TerasActionButton,
  TerasActionRow,
  TerasDialog,
  TerasEmptyState,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasList,
  TerasStatusPill,
  TerasTimeline,
  TerasTimelineItem,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import type { PrototypeProjectedReceipt } from "../../../read-model/prototype-workspace-read-model.ts";
import type {
  PrototypeClosureViewActions,
  PrototypeClosureViewState,
} from "../../shared/prototype-closure-presentation-model.ts";
import { prototypeClosureAuthorityFact } from "../../shared/prototype-closure-presentation-model.ts";
import type { PrototypeClosureResult } from "../../../live-runtime/prototype-closure-live-types.ts";
import { prototypeLifecycleStatus } from "../../shared/prototype-record-display-model.ts";
import {
  prototypeHistoryArchiveFacts,
  prototypeHistoryEvidenceRows,
  prototypeHistoryEvidenceRowsTone,
  prototypeHistoryReceiptFacts,
  prototypeHistoryRecordEvidenceTone,
  prototypeHistoryTimelineRows,
} from "./prototype-history-view-model.ts";

export function PrototypeHistoryModal({
  closure,
  closureActions,
  onClose,
  onOpenClosure,
  receipts,
  record,
}: {
  closure: PrototypeClosureViewState | null;
  closureActions: PrototypeClosureViewActions;
  onClose: () => void;
  onOpenClosure: (record: PrototypeRecord) => void;
  receipts: PrototypeProjectedReceipt[];
  record: PrototypeRecord | null;
}) {
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [inspectedResult, setInspectedResult] = useState<PrototypeClosureResult | null>(null);

  useEffect(() => {
    setReceiptError(null);
    setInspectedResult(null);
  }, [record?.id]);

  if (!record) {
    return null;
  }

  const preparation = closure?.preparation ?? null;
  const sourceHistory = preparation?.history ?? [];
  const timelineRows = preparation ? sourceHistory.map((event) => ({
    detail: `${event.request_ref} / ${event.previous_lifecycle} to ${event.observed_lifecycle}`,
    label: event.event_type.replaceAll("-", " "),
    status: event.observed_lifecycle,
    timestamp: event.recorded_at,
    tone: "info" as const,
  })) : prototypeHistoryTimelineRows(record, receipts);
  const evidenceRows = preparation ? [
    { label: "Design baseline", detail: preparation.expected_state.design_baseline_ref ?? "Not recorded",
      status: "source", tone: "info" as const },
    { label: "Delivery packet", detail: preparation.expected_state.delivery_packet_ref ?? "Not recorded",
      status: "source", tone: "info" as const },
    { label: "Accepted Delivery receipt", detail: preparation.expected_state.accepted_delivery_target_receipt_ref ?? "Not recorded",
      status: "source", tone: "info" as const },
    { label: "Retirement", detail: preparation.expected_state.retirement_ref ?? "Not recorded",
      status: "source", tone: "info" as const },
  ] : prototypeHistoryEvidenceRows(record);
  const lifecycleStatus = preparation ? {
    label: preparation.expected_state.lifecycle,
    tone: "info" as const,
  } : prototypeLifecycleStatus(record);
  const terminal =
    (preparation?.expected_state.lifecycle ?? record.lifecycle) === "retired" ||
    (preparation?.expected_state.lifecycle ?? record.lifecycle) === "graduated";
  const receiptTone = (preparation ? sourceHistory.length : receipts.length) > 0 ? "info" : "muted";
  const evidencePanelTone = preparation ? "info" : prototypeHistoryRecordEvidenceTone(record);
  const evidenceRowsTone = preparation ? "info" : prototypeHistoryEvidenceRowsTone(evidenceRows);
  const selectedResult = inspectedResult;

  async function inspectReceipt(requestId: string) {
    setReceiptError(null);
    try {
      const result = await closureActions.inspect(requestId);
      if (result.prototype_id !== preparation?.prototype_id) {
        throw new Error("Closure request belongs to a different Prototype.");
      }
      setInspectedResult(result);
    } catch (error) {
      setReceiptError(error instanceof Error ? error.message : "Closure receipt could not be read.");
    }
  }

  return (
    <TerasDialog
      contentOverflow="hidden"
      height="fill"
      width="large"
      closeLabel="Close Prototype history"
      description={preparation ? "Studio source events and OOS Closure receipts." :
        "Local preview history. Studio Closure authority is not connected for this record."}
      kicker="Prototype Archive"
      onClose={onClose}
      open
      title="Prototype History"
    >
      <TerasZoneLayout data-prototype-history-modal="true" variant="main-aside">
        <TerasZone fit="fill">
          <TerasPanel
            frame="padded"
            treatment="state"
            fit="content"
            spacing="normal"
            tone={evidencePanelTone}
          >
            <TerasPanelHeader
              actions={
                <TerasStatusPill tone={evidenceRowsTone}>
                  {evidenceRows.length} refs
                </TerasStatusPill>
              }
              actionsLayout="inline"
              description={preparation ? "References recorded in the current Studio source." :
                "Prototype-local preview references, not canonical Closure evidence."}
              kicker="Evidence Archive"
              title="Retained evidence"
            />
            <TerasList frame="contained">
              {evidenceRows.map((row) => (
                <TerasStatusItem
                  tone={row.tone}
                  detail={row.detail}
                  key={`${row.label}-${row.status}`}
                  label={row.label}
                  status={row.status}
                />
              ))}
            </TerasList>
          </TerasPanel>

          <TerasPanel
            frame="padded"
            treatment="neutral"
            fit="fill"
            layout="header-body"
            spacing="normal"
          >
            <TerasPanelHeader
              actions={
                <TerasStatusPill tone="info">
                  {timelineRows.length} events
                </TerasStatusPill>
              }
              actionsLayout="inline"
              description={preparation ? "Closure events committed to Studio source in retained order." :
                "Prototype-local preview events, not canonical Closure history."}
              kicker="Receipt Timeline"
              title="Receipt trail"
            />
            {timelineRows.length > 0 ? (
              <TerasTimeline ariaLabel="Prototype receipt timeline">
                {timelineRows.map((row, index) => (
                  <TerasTimelineItem
                    detail={row.detail}
                    displayTimestamp={row.timestamp}
                    key={`${row.label}-${row.timestamp}-${index}`}
                    label={row.label}
                    status={row.status}
                    timestamp={row.timestamp}
                    tone={row.tone}
                  />
                ))}
              </TerasTimeline>
            ) : (
              <TerasEmptyState>
                No recorded receipt event is available.
              </TerasEmptyState>
            )}
          </TerasPanel>
        </TerasZone>

        <TerasZone fit="content">
          <TerasPanel
            frame="padded"
            treatment="neutral"
            fit="content"
            spacing="normal"
          >
            <TerasPanelHeader
              actions={
                <TerasStatusPill tone={lifecycleStatus.tone}>
                  {lifecycleStatus.label}
                </TerasStatusPill>
              }
              actionsLayout="inline"
              description={preparation ? "Current Studio lifecycle and source custody." :
                "Fixture lifecycle; Studio authority is not verified."}
              kicker="Archive Posture"
              title={record.id}
            />
            <TerasMetadataList
              items={preparation ? [
                { label: "Lifecycle", value: preparation.expected_state.lifecycle },
                { label: "Source custody", value: preparation.expected_state.source_custody ?? "none" },
                { label: "Source revision", value: preparation.authority_revision.slice(0, 12) },
                { label: "Project phase", value: preparation.expected_state.project_phase ?? "none" },
              ] : prototypeHistoryArchiveFacts({ lifecycleStatusLabel: lifecycleStatus.label,
                record, terminal })}
              topOffset="compact"
            />
            {preparation?.expected_state.lifecycle === "retired" ? <TerasActionRow>
              <TerasActionButton emphasis="secondary" onClick={() => onOpenClosure(record!)}>
                Reopen incubation
              </TerasActionButton>
            </TerasActionRow> : null}
          </TerasPanel>

          <TerasPanel
            frame="padded"
            treatment="neutral"
            fit="content"
            spacing="normal"
          >
            <TerasPanelHeader
              actions={
                <TerasStatusPill tone={receiptTone}>
                  {preparation ? sourceHistory.length : receipts.length} receipts
                </TerasStatusPill>
              }
              actionsLayout="inline"
              description={preparation ? "Select a source event to read its OOS request and terminal receipt." :
                "Prototype-local preview receipts only."}
              kicker="Receipt Archive"
              title="Receipt sources"
            />
            {preparation ? sourceHistory.length ? <TerasList frame="contained" scrollHeight="short">
              {sourceHistory.map((event) => <TerasStatusItem
                key={event.event_id}
                ariaLabel={`Inspect Closure receipt for ${event.event_type}`}
                onSelect={() => void inspectReceipt(event.request_ref)}
                selected={selectedResult?.request_id === event.request_ref}
                label={event.event_type.replaceAll("-", " ")}
                detail={event.request_ref}
                status={event.observed_lifecycle}
                tone="info" />)}
            </TerasList> : <TerasEmptyState>No Studio Closure event is recorded yet.</TerasEmptyState> :
            receipts.length ? (
              <TerasMetadataList
                items={prototypeHistoryReceiptFacts(receipts)}
                topOffset="compact"
              />
            ) : (
              <TerasEmptyState>
                {closure?.error?.message ?? "No prototype-local preview receipt is recorded yet."}
              </TerasEmptyState>
            )}
            {selectedResult && preparation ? <TerasMetadataList
              items={[
                { label: "Request", value: selectedResult.request_id },
                { label: "Status", value: selectedResult.status },
                { label: "Outcome", value: selectedResult.receipt?.outcome ?? "Pending" },
                prototypeClosureAuthorityFact(selectedResult),
                { label: "Receipt", value: selectedResult.receipt?.receipt_id ?? "Not issued" },
                { label: "Source", value: selectedResult.readback?.merged_source_revision ?? "No merged readback" },
                ...(selectedResult.action === "graduate-source" ? [
                  { label: "Runtime", value: selectedResult.runtime_disposition?.ref ?? "Awaiting disposition" },
                ] : []),
              ]} topOffset="compact" shape="list" columns={1} /> : null}
            {receiptError ? <TerasEmptyState>{receiptError}</TerasEmptyState> : null}
          </TerasPanel>
        </TerasZone>
      </TerasZoneLayout>
    </TerasDialog>
  );
}
