"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasChoiceGroup,
  TerasFieldStack,
  TerasContentTray,
  TerasDraftCloseGuardDialog,
  TerasTechnicalDetails,
  TerasList,
  TerasMetadataList,
  TerasNoteField,
  TerasSelectableRow,
  TerasStatusItem,
  TerasTextField,
  TerasTimeline,
  TerasTimelineItem,
  TerasTrayStack,
  TerasDialog,
  TerasModalShell,
} from "@/teras";

import { workspaceInventoryLifecyclePreparationFixture } from "../fixtures/workspace-registry.fixture";
import type { WorkspaceRegistryLiveRuntime } from "../live-runtime/use-workspace-registry-live-runtime";
import type {
  WorkspaceInventoryLifecycleAction,
  WorkspaceInventoryLifecyclePreparation,
  WorkspaceInventoryLifecycleResult,
  WorkspaceRegistryRecord,
} from "../model/workspace-registry-types";
import {
  defaultWorkspaceInventoryLifecycleAction,
  workspaceInventoryLifecycleActionLabels,
  workspaceInventoryLifecycleActionOptions,
  workspaceInventoryLifecycleNextPosture,
} from "./workspace-registry-lifecycle-view-model";
import { useInventoryRequestJournal } from "../live-runtime/use-inventory-request-journal";
import { WorkspaceRegistryMetadataEditor } from "./workspace-registry-metadata-editor";
import { registryKindLabel, registryNextAction, registryRequestStatus, registryTimestamp } from "./workspace-registry-copy";
import { WorkspaceRegistryRequestJournal } from "./workspace-registry-request-journal";

type LifecycleStep = "configure" | "result" | "review";

const impactAcknowledgement =
  "I reviewed downstream references and understand that this action preserves identity and append-only history.";

export function WorkspaceRegistryLifecycleWorkflow({
  fixtureMode,
  onClose,
  record,
  onRefreshSource,
  runtime,
}: {
  fixtureMode: boolean;
  onClose: () => void;
  record: WorkspaceRegistryRecord;
  onRefreshSource: () => Promise<boolean>;
  runtime: WorkspaceRegistryLiveRuntime;
}) {
  const attempted = useRef(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [step, setStep] = useState<LifecycleStep>("configure");
  const [action, setAction] = useState<WorkspaceInventoryLifecycleAction>(() =>
    defaultWorkspaceInventoryLifecycleAction(record.posture),
  );
  const [reason, setReason] = useState("");
  const [approvalRef, setApprovalRef] = useState("");
  const [metadataValue, setMetadataValue] = useState("");
  const [impactConfirmed, setImpactConfirmed] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fixturePreparation = useMemo(
    () => workspaceInventoryLifecyclePreparationFixture(record),
    [record],
  );
  const availablePreparation = fixtureMode ? fixturePreparation : runtime.lifecyclePreparation;
  const preparation = availablePreparation?.target.record_id === record.id ? availablePreparation : null;
  const currentPosture = preparation?.expected_state.posture ?? record.posture;
  const currentVersion = preparation?.expected_state.record_version ?? record.version;
  const result = runtime.lifecycleResult;
  const initialMetadata = useMemo(() => {
    if (!preparation) return "";
    const { record: _envelope, ...value } = preparation.current_record;
    return JSON.stringify(value, null, 2);
  }, [preparation]);
  const dirty = !result && Boolean(reason || approvalRef || impactConfirmed || reviewConfirmed ||
    (metadataValue && metadataValue !== initialMetadata) || action !== defaultWorkspaceInventoryLifecycleAction(currentPosture));
  function requestNavigation(next: () => void) {
    if (runtime.pending) return;
    if (dirty) setPendingNavigation(() => next);
    else next();
  }
  const requestClose = () => requestNavigation(onClose);
  const target = { kind: record.kind, name: record.name, record_id: record.id };
  const journal = useInventoryRequestJournal("lifecycle", target, fixtureMode);
  const metadata = parseRequestedValue(
    metadataValue,
    preparation,
    action,
  );
  const registryRecord = runtime.snapshot?.records.find(item => item.id === record.id);
  const sourceCurrent = fixtureMode || Boolean(preparation && runtime.mode === "live" &&
    runtime.snapshot?.authority_revision === preparation.authority_revision &&
    registryRecord?.version === preparation.expected_state.record_version &&
    registryRecord?.record_digest === preparation.expected_state.record_digest &&
    registryRecord?.posture === preparation.expected_state.posture);
  const configured = Boolean(
    preparation && sourceCurrent && preparation.target.record_id === record.id &&
      workspaceInventoryLifecycleActionOptions(currentPosture).some(option => option.id === action && !option.disabled) &&
      reason.trim().length >= 12 &&
      approvalRef.trim().length > 0 &&
      impactConfirmed &&
      (action !== "update" || metadata.value),
  );

  async function prepareNewAction() {
    if (fixtureMode || runtime.pending || !journal.canStart || (result && !terminal(result.status))) return;
    runtime.reset();
    setLocalError(null);
    setReason(""); setApprovalRef(""); setMetadataValue(""); setImpactConfirmed(false); setReviewConfirmed(false);
    setStep("configure");
    try {
      if (!await onRefreshSource()) throw new Error("Current Registry source could not be reconciled. Refresh and prepare again before reviewing an action.");
      await runtime.prepareLifecycle(record);
    }
    catch (error) { setLocalError(message(error)); }
  }

  useEffect(() => {
    if (fixtureMode || attempted.current || !journal.canStart || result || runtime.pending) return;
    attempted.current = true;
    void prepareNewAction();
  }, [fixtureMode, journal.canStart, result, runtime.pending]);

  async function recover(requestId: string) {
    if (runtime.pending) return;
    setLocalError(null);
    try { await runtime.readLifecycle(requestId, target); setStep("result"); }
    catch (error) { setLocalError(message(error)); }
  }

  useEffect(() => {
    if (!preparation) return;
    setMetadataValue(initialMetadata);
    setAction(current => workspaceInventoryLifecycleActionOptions(preparation.expected_state.posture)
      .some(option => option.id === current && !option.disabled) ? current : defaultWorkspaceInventoryLifecycleAction(preparation.expected_state.posture));
    setReviewConfirmed(false);
    setImpactConfirmed(false);
    setStep("configure");
  }, [preparation, initialMetadata]);

  function updateAction(nextAction: WorkspaceInventoryLifecycleAction) {
    if (runtime.pending) return;
    setAction(nextAction);
    setImpactConfirmed(false);
    setReviewConfirmed(false);
    setLocalError(null);
  }

  async function submit() {
    if (!configured || !preparation || (action === "update" && !reviewConfirmed) || !metadata.valid || !journal.canStart || runtime.pending || result) return;
    setLocalError(null);
    try {
      await runtime.submitLifecycle({
        action,
        approvalRefs: [approvalRef.trim()],
        impactAcknowledgements: [impactAcknowledgement],
        reason: reason.trim(),
        requestId: `workspace-inventory-lifecycle-request:console-${crypto.randomUUID()}`,
        requestedValue: action === "update" ? metadata.value : null,
      });
      setStep("result");
    } catch (error) {
      setLocalError(message(error));
      setStep("result");
    } finally {
      void journal.load();
    }
  }

  async function continueLifecycle() {
    if (!result) return;
    setLocalError(null);
    try {
      await runtime.continueLifecycle(result.request_id);
    } catch (error) {
      setLocalError(message(error));
    } finally {
      void journal.load();
    }
  }

  async function cancelLifecycle() {
    if (!result) return;
    setLocalError(null);
    try {
      await runtime.cancelLifecycle(result.request_id);
    } catch (error) {
      setLocalError(message(error));
    } finally {
      void journal.load();
    }
  }

  const actions = <>
    <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={step === "review" ? () => setStep("configure") : requestClose}>{step === "review" ? "Back" : "Back to Registry"}</TerasActionButton>
    {step === "configure" && action === "update" ? <TerasActionButton disabled={!configured || !metadata.valid || runtime.pending || !journal.canStart || Boolean(result)} onClick={() => setStep("review")}>Review Action</TerasActionButton> : null}
    {step === "review" || (step === "configure" && action !== "update") ? <TerasActionButton busy={runtime.pending} tone={action === "retire" ? "danger" : "accent"} disabled={fixtureMode || runtime.pending || !configured || !metadata.valid || (action === "update" && !reviewConfirmed) || !journal.canStart || Boolean(result)} onClick={() => void submit()}>{runtime.pending ? "Submitting…" : workspaceInventoryLifecycleActionLabels[action]}</TerasActionButton> : null}
    {step === "result" && result && canContinue(result) ? <TerasActionButton disabled={runtime.pending} onClick={() => void continueLifecycle()}>{result.next_action === "review-and-merge" ? "Check Review" : "Continue Lifecycle"}</TerasActionButton> : null}
    {step === "result" && result && terminal(result.status) ? <TerasActionButton emphasis="secondary" disabled={runtime.pending || !journal.canStart} onClick={() => void prepareNewAction()}>Start another change</TerasActionButton> : null}
  </>;
  const guard = <TerasDraftCloseGuardDialog open={Boolean(pendingNavigation)} kicker="Unsaved lifecycle draft"
    title="Discard Lifecycle Draft?" description="Your reason, approval and metadata edits have not been submitted."
    leaveLabel="Discard Draft" onKeepEditing={() => setPendingNavigation(null)}
    onLeave={() => { const next = pendingNavigation; setPendingNavigation(null); next?.(); }}/>;
  const body = <>
      {step === "configure" ? (
        <TerasContentTray
          kicker="Change details"
        >
          <TerasTrayStack spacing="loose">
            <TerasChoiceGroup
              ariaLabel="Workspace Inventory lifecycle action"
              disabled={runtime.pending}
              frame="tray"
              label="Available actions"
              onSelect={updateAction}
              options={workspaceInventoryLifecycleActionOptions(currentPosture)}
              selectedId={action}
            />
            <TerasMetadataList columns={2} items={[
              {label: "Current posture", value: currentPosture},
              {label: "Expected posture", value: workspaceInventoryLifecycleNextPosture(action, currentPosture)},
            ]}/>
            {!sourceCurrent ? <TerasStatusItem label="Reviewed source" status="Refresh required" detail="Registry and prepared source differ. Refresh the record before confirming." tone="warn"/> : null}
            <TerasFieldStack spacing="compact">
              <TerasNoteField
                density="compact"
                label="Reason"
                disabled={runtime.pending}
                minimumHeight="short"
                onValueChange={(value) => {
                  setReason(value);
                  setReviewConfirmed(false);
                }}
                placeholder="Explain this change in at least 12 characters."
                value={reason}
              />
              <TerasTextField
                label="Approval reference"
                disabled={runtime.pending}
                onValueChange={(value) => {
                  setApprovalRef(value);
                  setReviewConfirmed(false);
                }}
                placeholder="Link or reference to the recorded approval for this change"
                value={approvalRef}
              />
              {action === "update" ? <WorkspaceRegistryMetadataEditor repositories={runtime.snapshot?.records.filter(item => item.kind === "repo" && item.posture === "active").map(item => item.name) ?? (fixtureMode ? [record.owner_refs[0]] : [])} value={metadataValue} disabled={runtime.pending || !preparation || !sourceCurrent}
                onChange={value => { setMetadataValue(value); setReviewConfirmed(false); }}/> : null}
              {action === "update" && metadata.error ? (
                <TerasStatusItem
                  detail={metadata.error}
                  label="Record value"
                  status="Correct input"
                  tone="danger"
                />
              ) : null}
              <TerasSelectableRow
                ariaLabel="Acknowledge Workspace Inventory lifecycle impact"
                detail={action === "update" ? "I reviewed downstream references; identity and history are preserved." : `I confirm ${workspaceInventoryLifecycleActionLabels[action].toLowerCase()} (${currentPosture} → ${workspaceInventoryLifecycleNextPosture(action, currentPosture)}) and have reviewed downstream references. Identity and history are preserved.`}
                label={action === "update" ? "Acknowledge impact" : "Confirm status change and impact"}
                onSelect={() => {
                  if (runtime.pending) return;
                  setImpactConfirmed((current) => !current);
                  setReviewConfirmed(false);
                }}
                selected={impactConfirmed}
                status={impactConfirmed ? "acknowledged" : "required"}
                tone={impactConfirmed ? "ok" : "warn"}
              />
            </TerasFieldStack>
            {action !== "update" ? <TerasTechnicalDetails summary="Reviewed source details" items={[
              {label:"Record",value:record.id},{label:"Authority revision",value:preparation?.authority_revision ?? "Not read"},
              {label:"Record digest",value:preparation?.expected_state.record_digest ?? record.record_digest},{label:"Current metadata",value:initialMetadata},
            ]}/> : null}
          </TerasTrayStack>
        </TerasContentTray>
      ) : step === "review" ? (
        <TerasContentTray
          kicker="Requested change"
        >
          <TerasTrayStack spacing="loose">
            <TerasMetadataList
              columns={2}
              items={[
                { label: "Record", value: record.id },
                { label: "Version", value: String(preparation?.expected_state.record_version ?? record.version) },
                { label: "Current posture", value: currentPosture },
                { label: "Expected posture", value: workspaceInventoryLifecycleNextPosture(action, currentPosture) },
                { label: "Approval", value: approvalRef.trim() },

              ]}
            />
            <TerasStatusItem
              detail={reason.trim()}
              label="Operator reason"
              status="Recorded"
              tone="info"
            />
            <TerasTechnicalDetails summary="Reviewed record details" items={[
              { label: "Authority revision", value: preparation?.authority_revision ?? "Not prepared" },
              { label: "Record digest", value: preparation?.expected_state.record_digest ?? record.record_digest },
              { label: "Current metadata", value: initialMetadata },
              { label: "Requested metadata", value: metadataValue },
            ]} />
            <TerasSelectableRow
              ariaLabel="Confirm Workspace Inventory lifecycle action"
              detail="Current source is checked again when this request is submitted."
              label="Confirm this exact lifecycle action"
              onSelect={() => { if (!runtime.pending) setReviewConfirmed((current) => !current); }}
              selected={reviewConfirmed}
              status={reviewConfirmed ? "confirmed" : "required"}
              tone={reviewConfirmed ? "ok" : "warn"}
            />
          </TerasTrayStack>
        </TerasContentTray>
      ) : (
        <LifecycleResultPanel
          onCancel={() => void cancelLifecycle()}
          onRead={() => { if (result) void recover(result.request_id); }}
          pending={runtime.pending}
          result={result}
        />
      )}
    </>;
  const error = fixtureMode ? null : localError ?? runtime.error?.message;
  if (step !== "configure") return <>
    <TerasDialog busy={runtime.pending} busyLabel="Reading or submitting registry change…" open width="standard" height="content" contentOverflow="auto" closeLabel="Close modal" closeDisabled={runtime.pending}
      onClose={step === "review" ? () => setStep("configure") : requestClose} kicker={record.name}
      title={step === "review" ? "Confirm metadata change" : result?.status === "succeeded" ? "Record updated" : result?.status === "accepted" ? "Change submitted" : result ? registryRequestStatus(result.status) : "Submission needs attention"}
      description={step === "review" ? "Confirm these changes before submitting." : result ? registryNextAction(result.next_action) : "The request outcome could not be confirmed. Inspect the original request before trying another."} actions={actions}>
      {error ? <TerasStatusItem label="Request" status="Needs attention" detail={error} tone="danger"/> : null}
      {body}
      {step === "result" && !result && !fixtureMode ? <WorkspaceRegistryRequestJournal journal={journal} disabled={runtime.pending} onReopen={id => void recover(id)}/> : null}
    </TerasDialog>{guard}
  </>;
  return <>
    <TerasModalShell bodyLayout="scroll" height="content" width="standard" title="Workspace Inventory Lifecycle" kicker={record.name}
      description="Update this record or change its status. Its identity and history are preserved." surfaceId="workspace-registry-lifecycle" onClose={requestClose} footer={actions}>
      <TerasFieldStack spacing="loose">
        <TerasMetadataList columns={2} items={[{label:"Item",value:record.name},{label:"Type and version",value:`${registryKindLabel(record.kind)} · version ${currentVersion}`}]}/>
        <TerasStatusItem label="Source" status={fixtureMode ? "Preview" : preparation && sourceCurrent ? "Current" : runtime.pending ? "Reading" : "Refresh required"}
          detail={fixtureMode ? "Preview changes are disabled." : error ?? "Current source details are collected automatically."} tone={error ? "danger" : preparation && sourceCurrent ? "info" : "warn"}/>
        {body}
        {!fixtureMode ? <TerasActionRow>
          <TerasActionButton emphasis="secondary" disabled={runtime.pending || !journal.canStart} onClick={() => requestNavigation(() => void prepareNewAction())}>Refresh record</TerasActionButton>
          <TerasActionButton emphasis="secondary" onClick={() => setHistoryOpen(current => !current)}>{historyOpen ? "Hide request history" : "Request history"}</TerasActionButton>
        </TerasActionRow> : null}
        {!fixtureMode && (historyOpen || Boolean(journal.page?.pending_request_count) || Boolean(journal.error)) ? <WorkspaceRegistryRequestJournal journal={journal} disabled={runtime.pending} onReopen={id => requestNavigation(() => void recover(id))}/> : null}
      </TerasFieldStack>
    </TerasModalShell>{guard}
  </>;
}

function LifecycleResultPanel({
  onCancel,
  onRead,
  pending,
  result,
}: {
  onCancel: () => void;
  onRead: () => void;
  pending: boolean;
  result: WorkspaceInventoryLifecycleResult | null;
}) {
  return (
    <TerasContentTray
      description={result ? registryNextAction(result.next_action) : "No outcome is available. Inspect the original request or correct the reported problem."}
      kicker="Lifecycle Result"
      title={result ? lifecycleStatusLabel(result) : "No result returned"}
    >
      {result ? (
        <TerasTrayStack spacing="loose">
          <TerasMetadataList
            columns={2}
            items={[
              { label: "Action", value: workspaceInventoryLifecycleActionLabels[result.request.action] },

              { label: "Review", value: result.review ? `#${result.review.number}` : "Not opened" },
              { label: "Receipt", value: result.receipt ? "Recorded" : terminal(result.status) ? "No receipt issued" : "Not issued yet" },
              { label: "Inventory change", value: result.merged_state ? "Recorded" : "Not merged" },

            ]}
          />
          {result.readiness?.readiness.findings.length ? (
            <TerasList>
              {result.readiness.readiness.findings.map((finding) => (
                <TerasStatusItem
                  detail={finding}
                  key={finding}
                  label="Readiness finding"
                  status="Blocked"
                  tone="danger"
                />
              ))}
            </TerasList>
          ) : null}
          <TerasTimeline ariaLabel="Workspace Inventory lifecycle history">
            {result.history.map((event) => (
              <TerasTimelineItem
                detail={null}
                evidence={<TerasTechnicalDetails summary="Event details" items={[{label:"Sequence",value:String(event.sequence)},{label:"Source status",value:event.status},...(event.details ? [{label:"Recorded details",value:JSON.stringify(event.details,null,2)}] : [])]}/>}
                displayTimestamp={registryTimestamp(event.at)}
                key={`${event.sequence}-${event.status}`}
                label={registryRequestStatus(event.status)}
                status={null}
                timestamp={event.at}
                tone={historyTone(event.status)}
              />
            ))}
          </TerasTimeline>
          {result.failure ? <TerasContentTray kicker="Needs attention" description={result.failure.message}/> : null}
          <TerasTechnicalDetails summary="Request and receipt details" items={[
            {label:"Request",value:result.request_id},{label:"Receipt",value:result.receipt?.receipt_id ?? "No receipt issued"},
            {label:"Inventory history event",value:result.merged_state?.history_event_ref.id ?? "Not merged"},
            {label:"Request revision",value:String(result.revision)},{label:"Next action code",value:result.next_action},
          ]}/>
          {(
            <TerasActionRow spacing="compact">
              <TerasActionButton emphasis="secondary" disabled={pending} onClick={onRead}>Refresh Original Request</TerasActionButton>
              {result.review ? (
                <TerasActionButton
                  emphasis="secondary"
                  onClick={() => window.open(result.review?.url, "_blank", "noopener,noreferrer")}
                >
                  Open Review
                </TerasActionButton>
              ) : null}
              {!terminal(result.status) ? (
                <TerasActionButton emphasis="secondary" disabled={pending} onClick={onCancel}>
                  Cancel Request
                </TerasActionButton>
              ) : null}
            </TerasActionRow>
          )}
        </TerasTrayStack>
      ) : null}
    </TerasContentTray>
  );
}

function parseRequestedValue(
  source: string,
  preparation: WorkspaceInventoryLifecyclePreparation | null,
  action: WorkspaceInventoryLifecycleAction,
) {
  if (action !== "update") return { error: null, valid: true, value: null };
  if (!preparation) return { error: null, valid: false, value: null };
  try {
    const value: unknown = JSON.parse(source);
    if (!isRecord(value) || "record" in value) {
      return { error: "Provide one record value without the managed record envelope.", valid: false, value: null };
    }
    if (value.posture !== preparation.expected_state.posture) {
      return { error: "Metadata updates must preserve the current posture.", valid: false, value: null };
    }
    return { error: null, valid: true, value };
  } catch {
    return { error: "Record value must be valid JSON.", valid: false, value: null };
  }
}

function canContinue(result: WorkspaceInventoryLifecycleResult) {
  return new Set([
    "continue",
    "inspect-review-or-cancel",
    "restore-dependency-and-retry",
    "review-and-merge",
  ]).has(result.next_action);
}

function terminal(status: WorkspaceInventoryLifecycleResult["status"]) {
  return new Set(["blocked", "cancelled", "rejected", "stale", "succeeded"]).has(status);
}

function lifecycleStatusLabel(result: WorkspaceInventoryLifecycleResult) {
  return registryRequestStatus(result.status);
}

function historyTone(status: WorkspaceInventoryLifecycleResult["status"]) {
  if (status === "succeeded") return "ok" as const;
  if (status === "blocked" || status === "rejected") return "danger" as const;
  if (status === "stale" || status === "review-required") return "warn" as const;
  return "info" as const;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Workspace Inventory lifecycle failed.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
