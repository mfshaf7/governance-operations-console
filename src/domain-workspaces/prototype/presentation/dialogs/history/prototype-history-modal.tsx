"use client";

import { useEffect, useRef, useState } from "react";

import {
  TerasStatusItem,
  TerasActionButton,
  TerasActionRow,
  TerasDialog,
  TerasContentRegion,
  TerasTrayStack,
  TerasEmptyState,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasList,
  TerasLoadingState,
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
  canonical,
  closureActions,
  onClose,
  onOpenClosure,
  receipts,
  record,
}: {
  canonical: boolean;
  closure: PrototypeClosureViewState | null;
  closureActions: PrototypeClosureViewActions;
  onClose: () => void;
  onOpenClosure: (record: PrototypeRecord) => void;
  receipts: PrototypeProjectedReceipt[];
  record: PrototypeRecord | null;
}) {
  const receiptReadSequence = useRef(0);
  const [inspectingRequest, setInspectingRequest] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [inspectedResult, setInspectedResult] = useState<PrototypeClosureResult | null>(null);

  useEffect(() => {
    receiptReadSequence.current++;
    setInspectingRequest(null);
    setReceiptError(null);
    setInspectedResult(null);
    return () => { receiptReadSequence.current++; };
  }, [record?.id]);

  if (!record) {
    return null;
  }

  const preparation = closure?.preparation ?? null;
  const sourceHistory = preparation?.history ?? [];
  const timelineRows = prototypeHistoryTimelineRows(record, receipts, preparation);
  const evidenceRows = [...prototypeHistoryEvidenceRows(record), ...(preparation ? [
    { label: "Design baseline", detail: preparation.expected_state.design_baseline_ref ?? "Not recorded",
      status: "source", tone: "info" as const },
    { label: "Delivery packet", detail: preparation.expected_state.delivery_packet_ref ?? "Not recorded",
      status: "source", tone: "info" as const },
    { label: "Accepted Delivery receipt", detail: preparation.expected_state.accepted_delivery_target_receipt_ref ?? "Not recorded",
      status: "source", tone: "info" as const },
    { label: "Retirement", detail: preparation.expected_state.retirement_ref ?? "Not recorded",
      status: "source", tone: "info" as const },
  ] : [])];
  const lifecycleStatus = preparation && !canonical ? {
    label: preparation.expected_state.lifecycle,
    tone: "info" as const,
  } : prototypeLifecycleStatus(record);
  const terminal =
    (canonical ? record.lifecycle : preparation?.expected_state.lifecycle ?? record.lifecycle) === "retired" ||
    (canonical ? record.lifecycle : preparation?.expected_state.lifecycle ?? record.lifecycle) === "graduated";
  const receiptTone = sourceHistory.length + receipts.length > 0 ? "info" : "muted";
  const evidencePanelTone = preparation ? "info" : prototypeHistoryRecordEvidenceTone(record);
  const evidenceRowsTone = preparation ? "info" : prototypeHistoryEvidenceRowsTone(evidenceRows);
  const selectedResult = inspectedResult;
  const pendingResult = closure?.result;

  async function inspectReceipt(requestId: string) {
    const ticket = ++receiptReadSequence.current;
    setInspectingRequest(requestId);
    setInspectedResult(null);
    setReceiptError(null);
    try {
      const result = await closureActions.inspect(requestId);
      if (result.prototype_id !== preparation?.prototype_id) {
        throw new Error("Closure request belongs to a different Prototype.");
      }
      if (ticket === receiptReadSequence.current) setInspectedResult(result);
    } catch (error) {
      if (ticket === receiptReadSequence.current) setReceiptError(error instanceof Error ? error.message : "Closure receipt could not be read.");
    } finally {
      if (ticket === receiptReadSequence.current) setInspectingRequest(null);
    }
  }

  return (
    <TerasDialog
      contentOverflow="hidden"
      height="fill"
      width="large"
      closeLabel="Close Prototype history"
      description={canonical ? "Available Studio lifecycle events and owner receipts." :
        "Disconnected preview history. These examples are not canonical evidence."}
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
              description={canonical ? "References retained by the Studio record and available owner evidence." :
                "Prototype-local preview references, not canonical Closure evidence."}
              kicker="Evidence Archive"
              title="Retained evidence"
            />
            <TerasList frame="contained" scrollHeight="short" ariaLabel="Prototype retained evidence">
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
              description={canonical ? "Available Landing, maturity, Preview and Closure events in time order." :
                "Prototype-local preview events, not canonical Closure history."}
              kicker="Receipt Timeline"
              title="Receipt trail"
            />
            <TerasContentRegion fill scroll role="region" aria-label="Prototype lifecycle events" tabIndex={0}>
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
            </TerasContentRegion>
          </TerasPanel>
        </TerasZone>

        <TerasZone fit="fill">
          <TerasContentRegion fill scroll role="region" aria-label="Prototype history details" tabIndex={0}>
          <TerasTrayStack spacing="normal">
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
              description={canonical ? "Retained Studio lifecycle and available Closure details." :
                "Fixture lifecycle; Studio authority is not verified."}
              kicker="Archive Posture"
              title={record.name}
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
                  {sourceHistory.length + receipts.length} receipts
                </TerasStatusPill>
              }
              actionsLayout="inline"
              description={canonical ? "Retained owner receipts; select a Closure event to inspect its request." :
                "Prototype-local preview receipts only."}
              busy={Boolean(inspectingRequest) || closure?.pending === true}
              busyLabel={inspectingRequest ? "Loading receipt details…" : "Loading Closure history…"}
              kicker="Receipt Archive"
              title="Receipt sources"
            />
            {receipts.length ? <TerasList frame="contained" scrollHeight="short">{prototypeHistoryReceiptFacts(receipts).map((item, index) => <TerasStatusItem key={`${item.label}-${index}`} label={item.label} detail={item.value} status="retained" tone="info" />)}</TerasList> : null}
            {preparation ? sourceHistory.length ? <TerasList frame="contained" scrollHeight="short">
              {sourceHistory.map((event) => <TerasStatusItem
                key={event.event_id}
                ariaLabel={`Inspect Closure receipt for ${event.event_type}`}
                onSelect={() => void inspectReceipt(event.request_ref)}
                selected={inspectingRequest === event.request_ref || selectedResult?.request_id === event.request_ref}
                label={event.event_type.replaceAll("-", " ")}
                detail={event.request_ref}
                status={event.observed_lifecycle}
                tone="info" />)}
            </TerasList> : <TerasEmptyState>No Studio Closure event is recorded yet.</TerasEmptyState> :
            receipts.length ? null : (
              <TerasEmptyState>
                {closure?.pending ? "Loading Closure evidence…" : canonical ? "No additional Closure receipt is available for this record." : "No preview receipt is recorded yet."}
              </TerasEmptyState>
            )}
            {!preparation && !closure?.pending && closure?.error ? <TerasEmptyState>
              {canonical && record.sourceRef.startsWith("record://prototype-captures/")
                ? "This Proposal has not landed in Studio yet. Its available source references remain visible."
                : "Additional Closure history could not be loaded. The available earlier receipts remain visible."}
            </TerasEmptyState> : null}
            {inspectingRequest ? <TerasLoadingState label="Loading receipt details…" skeleton="details" /> : null}
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
            {pendingResult && !["succeeded", "denied", "failed"].includes(pendingResult.status) ? (
              <TerasActionRow>
                <TerasActionButton emphasis="secondary" onClick={() => onOpenClosure(record!)}>
                  Resume Closure
                </TerasActionButton>
              </TerasActionRow>
            ) : null}
          </TerasPanel>
          </TerasTrayStack>
          </TerasContentRegion>
        </TerasZone>
      </TerasZoneLayout>
    </TerasDialog>
  );
}
