import { effectiveModelLabel } from "../../../../../../console-integration/governed-ai/model-selection.ts";
import { useState } from "react";
import { TerasActionButton, TerasContentTray, TerasFieldStack, TerasList, TerasMetadataList, TerasNoteField, TerasPanel, TerasPanelHeader, TerasSignalItem, TerasTechnicalDetails } from "@/teras";
import type { DeliverySourceRealizationProjection } from "../../../../live-runtime/delivery-source-realization-live-types.ts";
import { useDeliverySourceRealizationLiveRuntime } from "../../../../live-runtime/use-delivery-source-realization-live-runtime.ts";
import { SourceEditorWorkspace } from "../../../../../../console-integration/source-authoring/presentation/source-editor-workspace.tsx";

const draftingStages: Record<DeliverySourceRealizationProjection["state"], { label: string; help: string }> = {
  "not-started": { label: "Ready", help: "Open or import your files, or ask the assistant to draft changes." },
  accepted: { label: "Requested", help: "Your draft request has been accepted." },
  "draft-ready": { label: "Draft ready", help: "Open the editor to review the changes before applying the draft." },
  applying: { label: "Applying", help: "The approved draft is being applied." },
  "apply-unknown": { label: "Checking required", help: "Check the result of the original request before trying again." },
  "source-created": { label: "Changes created", help: "The draft changes have been applied to this session’s branch." },
  cancelled: { label: "Cancelled", help: "The draft request was cancelled." },
  failed: { label: "Needs attention", help: "The draft request failed. Check the details before trying again." },
};

export function ExecutionSourceRealizationPanel({ sessionId, sessionRevision, sourceWorkRequired, workItemId, sourceIntentRef }: {
  sessionId: string; sessionRevision: string; sourceWorkRequired: boolean; workItemId: number; sourceIntentRef?: string | null;
}) {
  const runtime = useDeliverySourceRealizationLiveRuntime(workItemId, sessionId);
  const [objective, setObjective] = useState("");
  const [reason, setReason] = useState("");
  const [editorOpen, setEditorOpen] = useState(false), [reviewed, setReviewed] = useState<{ digest: string; revision: string } | null>(null);
  const current = runtime.projection;
  const draftingStage = current && draftingStages[current.state];
  const draft = current?.attempt?.change_set;
  const canStart = sourceWorkRequired && ["source-realization-start-required", "source-realization-retry-available"].includes(current?.next_action.code ?? "");
  const canCancel = current && ["accepted", "draft-ready"].includes(current.state);
  const canAccept = sourceWorkRequired && current?.state === "draft-ready" && current.next_action.code === "source-realization-acceptance-required" && draft && reviewed?.digest === draft.digest && reviewed.revision === current.revision;

  function run(command: () => Promise<unknown>) { void command().catch(() => undefined); }
  const authorization = sourceIntentRef ? { sourceIntentRef } : {};

  return <TerasPanel spacing="normal" frame="padded" layout="header-body" tone={runtime.error ? "danger" : "info"} treatment="state">
    <TerasPanelHeader busy={runtime.pending} busyLabel="Checking file changes…" kicker="Files" title="Edit or draft changes"
      description={runtime.error ? "The latest result could not be confirmed. Refresh file status to check the current state." :
        draftingStage?.help ?? (runtime.pending ? "Loading the editor and draft status." : "The files could not be loaded. Refresh to try again.")}
      statusLabel={runtime.pending ? "Working" : runtime.error ? "Check result" : draftingStage?.label ?? "Unavailable"} />
    <TerasFieldStack spacing="normal">
      <TerasActionButton emphasis="secondary" disabled={runtime.pending || !current || !sourceWorkRequired && current.state !== "source-created"} onClick={() => setEditorOpen(true)}>Edit or import files</TerasActionButton>
      <TerasTechnicalDetails items={[
        ...(runtime.error ? [{ label: "Read or action result", value: runtime.error }] : []),
        ...(current?.next_action.reason ? [{ label: "Recorded reason", value: current.next_action.reason }] : []),
        { label: "Authority", value: current?.next_action.authority ?? "operator-orchestration-service" },
        { label: "Attempt", value: current?.attempt?.request_id ?? "Not started" },
        { label: "Model profile", value: current?.attempt?.model?.profile_id ?? "No draft model recorded" },
        ...(current?.attempt?.model?.effective_selection ? [{ label: "Actual model", value: effectiveModelLabel(current.attempt.model.effective_selection) }] : []),
        { label: "Context packet", value: current?.attempt?.context?.packet_ref ?? "No context recorded" },
        ...(current?.attempt?.failure ? [{ label: "Service failure", value: current.attempt.failure.code }] : []),
      ]} />
      {canStart ? <>
        <TerasNoteField label="Implementation objective" minimumHeight="short" value={objective} onValueChange={setObjective} />
        <TerasActionButton disabled={runtime.pending || objective.trim().length < 20 || objective.length > 12000} onClick={() => run(() => runtime.command({
          action: "start", objective, budgetTokens: 4000, expectedSessionRevision: sessionRevision,
          ...authorization,
          retryOf: current?.attempt?.request_id ?? null,
        }))}>{current?.attempt ? "Try drafting again" : "Draft changes with AI"}</TerasActionButton>
      </> : null}
      {draft ? <TerasContentTray kicker="Draft changes">
        <TerasFieldStack spacing="normal">
          <TerasMetadataList items={[{ label: "Commit message", value: draft.commit_message }]} />
          <TerasList frame="contained">{draft.operations.map((operation) => <TerasSignalItem key={operation.path}
            title={operation.path} label={operation.action === "delete" ? "Delete" : operation.action === "replace" ? "Update" :
              operation.action === "patch" ? "Update section" : "Add"} tone="info" />)}</TerasList>
          <TerasTechnicalDetails items={[
            { label: "Draft digest", value: draft.digest },
            ...draft.operations.map(operation => ({ label: operation.path, value: `New: ${operation.content_digest ?? "none"} · expected: ${operation.expected_digest ?? "none"}` })),
          ]} />
          {current?.state === "draft-ready" ? <>
            <TerasActionButton disabled={runtime.pending || !canAccept || sourceIntentRef === null} onClick={() => run(() => runtime.command({ action: "continue", expectedRevision: current.revision, acceptedChangeSetDigest: draft.digest, ...authorization }))}>Apply reviewed draft</TerasActionButton>
          </> : null}
        </TerasFieldStack>
      </TerasContentTray> : null}
      {canCancel ? <>
        <TerasNoteField label="Cancellation reason" minimumHeight="short" value={reason} onValueChange={setReason} />
        <TerasActionButton emphasis="secondary" disabled={runtime.pending || reason.trim().length < 20} onClick={() => run(() => runtime.command({ action: "cancel", expectedRevision: current.revision, reason }))}>Cancel unapplied draft</TerasActionButton>
      </> : null}
      {current?.state === "apply-unknown" && current.next_action.code === "source-realization-recovery-required" ?
        <TerasActionButton disabled={runtime.pending || sourceIntentRef === null} onClick={() => run(() => runtime.command({ action: "recover", expectedRevision: current.revision, ...authorization }))}>Check original result</TerasActionButton> : null}
      {current?.attempt?.source_receipt ? <TerasTechnicalDetails summary="Applied change details" items={[
        { label: "Gary commit", value: current.attempt.source_receipt.head_commit },
        { label: "Source receipt", value: current.attempt.source_receipt.receipt_id },
        { label: "Receipt digest", value: current.attempt.source_receipt.receipt_digest },
      ]} /> : null}
      <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={() => run(runtime.refresh)}>
        Refresh file status
      </TerasActionButton>
      {editorOpen && current ? <SourceEditorWorkspace key={sessionId} target={{ endpoint: `/api/delivery/execution/${workItemId}/work-session/realization`, label: "Delivery source workspace",
        current: { sessionId, revision: current.revision, state: current.state, attempt: current.attempt ? { requestId: current.attempt.request_id, executionId: current.attempt.execution_id ?? "", objectiveDigest: current.attempt.objective_digest, digest: current.attempt.change_set?.digest ?? null } : null },
        objective, objectiveMin: 20, objectiveMax: 12000, scope: null, sectionEditing: true, retainedDraftAvailable: current.retained_draft_available }} onClose={() => setEditorOpen(false)} onSaved={() => { setReviewed(null); run(runtime.refresh); }} onReviewed={draft => setReviewed({ digest: draft.digest, revision: draft.revision })} /> : null}
    </TerasFieldStack>
  </TerasPanel>;
}
