import { useState } from "react";
import { TerasActionButton, TerasContentTray, TerasFieldStack, TerasList, TerasMetadataList, TerasNoteField, TerasPanel, TerasPanelHeader, TerasSignalItem } from "@/teras";
import { useDeliverySourceRealizationLiveRuntime } from "../../../../live-runtime/use-delivery-source-realization-live-runtime.ts";

export function ExecutionSourceRealizationPanel({ sessionId, sessionRevision, sourceWorkRequired, workItemId, sourceIntentRef }: {
  sessionId: string; sessionRevision: string; sourceWorkRequired: boolean; workItemId: number; sourceIntentRef?: string | null;
}) {
  const runtime = useDeliverySourceRealizationLiveRuntime(workItemId, sessionId);
  const [objective, setObjective] = useState("");
  const [reason, setReason] = useState("");
  const current = runtime.projection;
  const draft = current?.attempt?.change_set;
  const canStart = sourceWorkRequired && ["source-realization-start-required", "source-realization-retry-available"].includes(current?.next_action.code ?? "");
  const canCancel = current && ["accepted", "draft-ready"].includes(current.state);
  const canAccept = sourceWorkRequired && current?.state === "draft-ready" && current.next_action.code === "source-realization-acceptance-required" && draft;

  function run(command: () => Promise<unknown>) { void command().catch(() => undefined); }
  const authorization = sourceIntentRef ? { sourceIntentRef } : {};

  return <TerasPanel frame="padded" layout="header-body" tone={runtime.error ? "danger" : "info"} treatment="state">
    <TerasPanelHeader kicker="Bounded Source Realization" title="Implement the accepted work"
      description={runtime.error ?? current?.next_action.reason ?? "Reading authoritative source realization state."}
      statusLabel={runtime.pending ? "Working" : current?.state ?? "Unavailable"} />
    <TerasFieldStack spacing="normal">
      <TerasMetadataList items={[
        { label: "Authority", value: current?.next_action.authority ?? "operator-orchestration-service" },
        { label: "Attempt", value: current?.attempt?.request_id ?? "Not started" },
        { label: "Model profile", value: current?.attempt?.model?.profile_id ?? "Awaiting commissioned owner invocation" },
        { label: "Context packet", value: current?.attempt?.context?.packet_ref ?? "Not yet admitted" },
        ...(current?.attempt?.failure ? [{ label: "Owner failure", value: current.attempt.failure.code }] : []),
      ]} />
      {canStart ? <>
        <TerasNoteField label="Implementation objective" minimumHeight="short" value={objective} onValueChange={setObjective} />
        <TerasActionButton disabled={runtime.pending || objective.trim().length < 20 || objective.length > 12000} onClick={() => run(() => runtime.command({
          action: "start", objective, budgetTokens: 4000, expectedSessionRevision: sessionRevision,
          ...authorization,
          retryOf: current?.attempt?.request_id ?? null,
        }))}>{current?.attempt ? "Generate linked retry" : "Generate implementation draft"}</TerasActionButton>
      </> : null}
      {draft ? <TerasContentTray kicker="Exact Draft Review">
        <TerasFieldStack spacing="normal">
          <TerasMetadataList items={[{ label: "Commit message", value: draft.commit_message }, { label: "Change-set digest", value: draft.digest }]} />
          <TerasList frame="contained">{draft.operations.map((operation) => <TerasSignalItem key={operation.path}
            title={operation.path} label={operation.action} detail={`Content ${operation.content_digest ?? "deleted"}; expected ${operation.expected_digest ?? "new path"}`} tone="info" />)}</TerasList>
          {current?.state === "draft-ready" ? <>
            <TerasActionButton disabled={runtime.pending || !canAccept || sourceIntentRef === null} onClick={() => run(() => runtime.command({ action: "continue", expectedRevision: current.revision, acceptedChangeSetDigest: draft.digest, ...authorization }))}>Accept exact digest and create source</TerasActionButton>
          </> : null}
        </TerasFieldStack>
      </TerasContentTray> : null}
      {canCancel ? <>
        <TerasNoteField label="Cancellation reason" minimumHeight="short" value={reason} onValueChange={setReason} />
        <TerasActionButton emphasis="secondary" disabled={runtime.pending || reason.trim().length < 20} onClick={() => run(() => runtime.command({ action: "cancel", expectedRevision: current.revision, reason }))}>Cancel unapplied draft</TerasActionButton>
      </> : null}
      {current?.state === "apply-unknown" && current.next_action.code === "source-realization-recovery-required" ?
        <TerasActionButton disabled={runtime.pending || sourceIntentRef === null} onClick={() => run(() => runtime.command({ action: "recover", expectedRevision: current.revision, ...authorization }))}>Recover accepted source action</TerasActionButton> : null}
      {current?.attempt?.source_receipt ? <TerasMetadataList items={[
        { label: "Gary commit", value: current.attempt.source_receipt.head_commit },
        { label: "Owner receipt", value: current.attempt.source_receipt.receipt_id },
        { label: "Receipt digest", value: current.attempt.source_receipt.receipt_digest },
      ]} /> : null}
      <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={() => run(runtime.refresh)}>Refresh source realization</TerasActionButton>
    </TerasFieldStack>
  </TerasPanel>;
}
