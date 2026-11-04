"use client";

import { RepositoryDevelopmentScope } from "../../shared/repository-development-scope.tsx";

import { useEffect, useRef, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasFieldGrid, TerasFieldStack, TerasMetadataList,
  TerasNoteField, TerasSelectableRow, TerasSelectField, TerasTextField } from "@/teras";
import { assertRepositoryProviderLookup, repositoryCoordinatesFromUrl, type RepositoryProviderLookup } from "../../../live-runtime/repository-provider-lookup.ts";
import type { RepositoryCustodyLinkIntent, RepositoryCustodyKind, RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";

export function RepositoryRequestAttachment({proposalId, results, enabled, attachmentAvailable, onAttach, onDirtyChange, onBusyChange, onAttached, onOpenExisting}: {
  proposalId?: string; results: RepositoryCustodyWorkflowResult[]; enabled: boolean; attachmentAvailable: boolean;
  onAttach: (intent: RepositoryCustodyLinkIntent) => Promise<RepositoryCustodyWorkflowResult>;
  onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void;
  onAttached: (notes: string, result: RepositoryCustodyWorkflowResult) => void;
  onOpenExisting?: (result: RepositoryCustodyWorkflowResult) => void;
}) {
  const [selectedId,setSelectedId] = useState("");
  const [url,setUrl] = useState("");
  const [lookup,setLookup] = useState<RepositoryProviderLookup | null>(null);
  const [owner,setOwner] = useState("");
  const [custodyKind,setCustodyKind] = useState<RepositoryCustodyKind>("dedicated-owner-repo");
  const [approval,setApproval] = useState("");
  const [acknowledged,setAcknowledged] = useState(false);
  const [pending,setPending] = useState(false);
  const [error,setError] = useState<string | null>(null);
  const [result,setResult] = useState<RepositoryCustodyWorkflowResult | null>(null);
  const submitting = useRef(false);
  const identity = useRef<{signature: string; requestId: string; requestedAt: string} | null>(null);
  const dirty = Boolean(selectedId || url || approval || acknowledged);
  useEffect(() => {onDirtyChange(dirty);},[dirty,onDirtyChange]);
  useEffect(() => {onBusyChange(pending);},[pending,onBusyChange]);
  useEffect(() => () => {onDirtyChange(false);onBusyChange(false);},[onDirtyChange,onBusyChange]);
  const known = [...new Map(results.filter(row => row.status === "succeeded" && row.receipt_ref && row.provider_readback)
    .map(row => [row.provider_readback!.repository_identity.provider_repository_id,row])).values()];
  const manual = !proposalId || selectedId === "manual" || (!selectedId && (!known.length || Boolean(url)));
  const alreadyLinked = !proposalId && lookup ? known.find(row => row.provider_readback!.repository_identity.provider_repository_id === lookup.provider_repository_id) : undefined;
  const readOnly = !enabled || pending;
  function select(value: string) {
    setSelectedId(value);setError(null);setResult(null);setAcknowledged(false);
    const record = known.find(row => row.request.request_id === value)?.provider_readback;
    const next: RepositoryProviderLookup | null = record && record.provider_lifecycle_state !== "unavailable" ? {schema_version:1 as const,provider:"github" as const,provider_host:"github.com" as const,
      provider_repository_id:record.repository_identity.provider_repository_id, owner:record.canonical_owner,name:record.canonical_name,
      canonical_url:record.canonical_url,visibility:record.visibility,provider_lifecycle_state:record.provider_lifecycle_state,
      observed_at:record.observed_at} : null;
    setLookup(next);setOwner(next ? `repo:${next.name}` : "");
  }
  async function check() {
    if (readOnly || submitting.current) return;
    setError(null);setLookup(null);setResult(null);setAcknowledged(false);
    try {
      const coordinates = repositoryCoordinatesFromUrl(url);
      submitting.current=true;setPending(true);
      const response = await fetch(`/api/repositories/custody/provider-repository?${new URLSearchParams(coordinates)}`,{cache:"no-store",signal:AbortSignal.timeout(15_000)});
      const body: unknown = await response.json().catch(()=>null);
      if (!response.ok) throw new Error(body && typeof body === "object" && "error" in body ? String(body.error) : "Repository verification is unavailable.");
      const next=assertRepositoryProviderLookup(body);
      if(next.owner.toLowerCase()!==coordinates.owner.toLowerCase()||next.name.toLowerCase()!==coordinates.name.toLowerCase())throw new Error("The lookup returned another repository.");
      setLookup(next);setOwner(`repo:${proposalId ? next.name : next.name.toLowerCase()}`);
    }catch(failure){setError(failure instanceof Error && ["TimeoutError","AbortError"].includes(failure.name)?"Repository lookup timed out. Check the connection and try again.":failure instanceof Error?failure.message:"Repository verification failed.");}
    finally{submitting.current=false;setPending(false);}
  }
  const canAttach = Boolean(enabled && attachmentAvailable && !pending && !alreadyLinked && lookup?.provider_lifecycle_state === "active" && owner.trim() && (!proposalId || acknowledged) && approval.trim().length>=12);
  async function attach() {
    if (!canAttach || !lookup || submitting.current) return;
    submitting.current=true;setPending(true);setError(null);
    const fields={approvalNote:approval.trim(),...(proposalId ? {createdForRequest:true as const,proposalId} : {}),custodyKind,
      providerHost:"github.com",providerRepositoryId:lookup.provider_repository_id,repositoryId:`repo-provider-${lookup.provider_repository_id}`,
      repositoryName:lookup.name,repositoryOwner:lookup.owner,workspaceOwnerRef:owner.trim()};
    const signature=JSON.stringify(fields);
    if(identity.current?.signature!==signature)identity.current={signature,requestId:`repository-custody-request:attach-${crypto.randomUUID()}`,requestedAt:new Date().toISOString()};
    try {
      const outcome=await onAttach({...fields,requestId:identity.current.requestId,requestedAt:identity.current.requestedAt});
      setResult(outcome);
      if(outcome.status==="succeeded")onAttached(approval.trim(),outcome);
      else setError(outcome.failure?.message ?? "Linking has not completed. Review the recorded result before retrying.");
    }catch(failure){setError(failure instanceof Error?failure.message:"Repository linking failed.");}
    finally{submitting.current=false;setPending(false);}
  }
  return <TerasContentTray kicker={proposalId ? "Already created" : "Existing repository"} title={proposalId ? "Attach a repository to this request" : "Repository to link"}
    description={proposalId ? "Select a known repository or enter its GitHub URL. Attachment verifies its identity and records your approval; it does not create a repository." : "Enter a GitHub repository URL. The Console retrieves its identity and visibility through your configured GitHub connection."}>
    <TerasFieldStack spacing="loose">
      {!proposalId && !enabled ? <p role="status">Repository data is currently unavailable. Your draft is preserved until the connection recovers.</p> : null}
      {!attachmentAvailable ? <p role="status">{proposalId ? "Repository linking is unavailable until its service connection and approval capability are ready. Your draft is preserved." : "The approval connection for linking existing repositories is not configured. You can check repository details and prepare the draft; linking stays disabled."}</p> : null}
      {proposalId && known.length ? <TerasSelectField label="Repository to attach" aria-label="Repository to attach" disabled={readOnly} value={selectedId} onValueChange={select}
        options={[{label:"Select a known repository",value:""},...known.map(row=>({label:row.provider_readback!.canonical_url,value:row.request.request_id})),
          {label:"Enter a GitHub repository URL",value:"manual"}]} /> : null}
      {manual ? <>
        <TerasTextField label="GitHub repository URL" aria-label="GitHub repository URL" value={url} disabled={readOnly}
          placeholder="https://github.com/organization/repository" onValueChange={value=>{setUrl(value);setLookup(null);setAcknowledged(false);setError(null);}} />
        <TerasActionRow><TerasActionButton emphasis="secondary" disabled={readOnly || !url.trim()} onClick={()=>void check()}>Check repository</TerasActionButton></TerasActionRow>
      </> : null}
      {error ? <p role="alert">{error}</p> : null}
      {pending ? <p role="status">Checking the repository or recording the approved link…</p> : null}
      {lookup ? <>
        <TerasMetadataList items={[{label:"Repository",value:lookup.canonical_url},{label:"Visibility",value:lookup.visibility},
          {label:"Provider state",value:lookup.provider_lifecycle_state}]} />
        <RepositoryDevelopmentScope visibility={lookup.visibility} />
        {lookup.provider_lifecycle_state!=="active" ? <p role="status">Archived repositories cannot be linked. Restore it with the provider before retrying.</p> : null}
        {alreadyLinked ? <TerasContentTray kicker="Already in Repository Control" description="Open its record to review the current workspace status.">
          {onOpenExisting ? <TerasActionButton disabled={pending} onClick={() => onOpenExisting(alreadyLinked)}>Open repository</TerasActionButton> : null}
        </TerasContentTray> : <>
        <TerasContentTray kicker="Workspace link" description="The workspace reference is filled from the repository name. Change it only to associate this GitHub repository with another workspace record.">
        <TerasFieldGrid><TerasTextField label="Workspace repository" aria-label={proposalId ? "Attachment workspace repository" : "Workspace repository"} value={owner} disabled={readOnly}
          onValueChange={value=>{setOwner(value);setResult(null);}} />
          <TerasSelectField label="Repository use" aria-label={proposalId ? "Attachment repository use" : "Repository use"} value={custodyKind} disabled={readOnly}
            onValueChange={value=>{setCustodyKind(value);setResult(null);}} options={[
              {label:"Dedicated repository",value:"dedicated-owner-repo"},{label:"Shared repository",value:"shared-owner-repo"},
              {label:"Incubation repository",value:"incubation-repo"},{label:"External repository",value:"external-repo"}]} />
        </TerasFieldGrid>
        </TerasContentTray>
        {proposalId ? <TerasSelectableRow ariaLabel="Confirm repository was created for this request" label="This repository was created for this request"
          detail="For a repository already serving existing work, use the earlier Proposal reuse choice. Attachment checks the provider again before recording a receipt."
          selected={acknowledged} status={acknowledged?"Confirmed":"Review needed"} disabled={readOnly}
          onSelect={()=>setAcknowledged(value=>!value)} /> : null}
        <TerasNoteField label={proposalId ? "Attachment approval" : "Link approval"} aria-label={proposalId ? "Attachment approval" : "Link approval"} value={approval} disabled={readOnly} minLength={12} minimumHeight="short"
          placeholder={proposalId ? "Explain how this already-created repository fulfils this request (at least 12 characters)." : "Explain why this repository should be linked to the workspace (at least 12 characters)."} onValueChange={value=>{setApproval(value);setResult(null);}} />
        <TerasActionRow><TerasActionButton disabled={!canAttach} onClick={()=>void attach()}>{result?.retryable ? proposalId ? "Retry attachment" : "Retry link" : proposalId ? "Verify and attach repository" : "Verify and link repository"}</TerasActionButton></TerasActionRow>
        </>}
      </> : null}
    </TerasFieldStack>
  </TerasContentTray>;
}
