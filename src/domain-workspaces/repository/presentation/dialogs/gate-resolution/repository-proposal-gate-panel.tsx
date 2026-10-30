"use client";

import { useEffect, useState } from "react";
import { TerasActionButton, TerasFieldStack, TerasMetadataList, TerasNoteField, TerasPanel, TerasPanelHeader, TerasSelectField, TerasTrayStack } from "@/teras";
import { useProposalRepositoryGateRuntime } from "../../../../operation-integrations/use-proposal-repository-gate-runtime.ts";
import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";

export function RepositoryProposalGatePanel({ subjectRef, custodyResults, custodyCurrent, onDirtyChange }: {
  subjectRef?: string; custodyResults: RepositoryCustodyWorkflowResult[]; custodyCurrent: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const runtime = useProposalRepositoryGateRuntime();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { custodyId: string; notes: string }>>({});
  const dirty = Object.entries(drafts).some(([id, draft]) => {
    const request = runtime.requests.find(request => request.proposalId === id);
    return Boolean((draft.custodyId || draft.notes.trim()) && !request?.resolution);
  });
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  if (runtime.mode === "disconnected-preview") return null;
  const request = runtime.requests.find((entry) => entry.proposalId === (selectedId ?? subjectRef)) ??
    runtime.requests.find((entry) => !entry.resolution || entry.recovery) ?? runtime.requests[0];
  const recovery = request?.recovery;
  const resolved = Boolean(request?.resolution && !recovery);
  const draft = request ? drafts[request.proposalId] ?? { custodyId: "", notes: "" } : { custodyId: "", notes: "" };
  const custodyId = recovery?.custody_request_id ?? draft.custodyId;
  const notes = recovery?.notes ?? draft.notes;
  const options = [...new Map(custodyResults.filter((result) => result.status === "succeeded" && result.receipt_ref && result.provider_readback)
    .map((result) => [result.request.request_id, result])).values()];
  const custody = options.find((result) => result.request.request_id === custodyId);
  const canSubmit = Boolean(request && !resolved && runtime.status === "current" && custodyCurrent &&
    !runtime.pending && notes.trim() && (recovery || custody?.receipt_ref));
  function update(patch: Partial<typeof draft>) {
    if (request) setDrafts((current) => ({ ...current, [request.proposalId]: { ...draft, ...patch } }));
  }
  return <TerasPanel frame="padded" treatment="rail" fit="content" tone={resolved ? "ok" : "warn"}>
    <TerasPanelHeader kicker="Proposal Repository Gate" title={request?.title ?? "Canonical Proposal repository requests"}
      description="Resolve repository custody here, then refresh Proposal to continue Handoff. Disposition is preserved."
      statusLabel={runtime.pending ? "Recording" : resolved ? "Resolved" : recovery ? "Acknowledgement recovery" : runtime.status === "current" ? request ? "Repository needed" : "No requests" : runtime.status}
      statusTone={resolved ? "ok" : "warn"} />
    <TerasTrayStack spacing="loose" topOffset="section">
      {runtime.error ? <p role="alert">{runtime.error}</p> : null}
      {request ? <>
        <TerasSelectField label="Proposal request" aria-label="Proposal repository request" value={request.proposalId}
          onValueChange={setSelectedId} disabled={runtime.pending}
          options={runtime.requests.map((entry) => ({ label: `${entry.title} / ${entry.recordVersion}`, value: entry.proposalId }))} />
        <TerasMetadataList items={[
          { label: "Proposal source", value: `${request.proposalId} / ${request.recordVersion}` },
          { label: "Request", value: `repo-request://proposal/${request.proposalId}` },
          ...(request.resolution ? [{ label: "Owner receipt", value: request.resolution.receipt_ref }, { label: "Repository", value: request.resolution.resolved_repo_ref }] : []),
        ]} />
        {!resolved ? <TerasFieldStack spacing="loose">
          <TerasSelectField label="Successful repository custody" aria-label="Successful repository custody" value={custodyId}
            disabled={Boolean(recovery) || runtime.pending} onValueChange={(value) => update({ custodyId: value })}
            options={[{ label: "Provision a repository or select successful custody", value: "" }, ...options.map((entry) => ({ label: entry.provider_readback!.canonical_url, value: entry.request.request_id })),
              ...(recovery && !custody ? [{ label: recovery.resolved_repo_ref, value: recovery.custody_request_id }] : [])]} />
          {custody?.receipt_ref ? <TerasMetadataList items={[{ label: "Reviewed custody receipt", value: custody.receipt_ref.uri }, { label: "Provider repository", value: custody.provider_readback!.repository_identity.provider_repository_id }]} /> : null}
          <TerasNoteField label="Resolution notes" aria-label="Repository resolution notes" value={notes}
            disabled={Boolean(recovery) || runtime.pending} onValueChange={(value) => update({ notes: value })} />
          <TerasActionButton disabled={!canSubmit} onClick={() => {
            if (!canSubmit) return;
            void runtime.resolve({ proposalId: request.proposalId, recordRef: request.recordRef,
              recordVersion: recovery?.source_version ?? request.recordVersion,
              custodyRequestId: recovery?.custody_request_id ?? custody!.request.request_id,
              custodyReceiptRef: recovery?.custody_receipt_ref ?? custody!.receipt_ref!, notes });
          }}>{recovery ? "Complete Repository Acknowledgement" : "Record Gate Resolution"}</TerasActionButton>
        </TerasFieldStack> : null}
      </> : null}
    </TerasTrayStack>
  </TerasPanel>;
}
