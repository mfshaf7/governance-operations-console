"use client";

import { RepositoryDevelopmentScope } from "../../shared/repository-development-scope.tsx";
import { repositoryDefaultWorkspaceReference } from "../../../work-model/request/repository-request-model.ts";
import {repositoryWorkspaceName} from "../../../domain/repository-workspace-reference.ts";
import {isRepositoryUse} from "../../../domain/repository-use.ts";
import {RepositoryAssociationFields} from "../../shared/repository-association-fields.tsx";

import { useEffect, useRef, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasFieldStack, TerasMetadataList,
  TerasNoteField, TerasSelectableRow, TerasSelectField, TerasTextField } from "@/teras";
import { assertRepositoryProviderLookup, repositoryCoordinatesFromUrl, type RepositoryProviderLookup } from "../../../live-runtime/repository-provider-lookup.ts";
import type { RepositoryCustodyLinkIntent, RepositoryCustodyKind, RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";

export function RepositoryRequestAttachment({proposalId, results, enabled, attachmentAvailable, onAttach, onDirtyChange, onBusyChange, onAttached, onOpenExisting, onFindByProvider, preview = false, previewLookup}: {
  proposalId?: string; results: RepositoryCustodyWorkflowResult[]; enabled: boolean; attachmentAvailable: boolean;
  onAttach: (intent: RepositoryCustodyLinkIntent) => Promise<RepositoryCustodyWorkflowResult>;
  onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void;
  onAttached: (notes: string, result: RepositoryCustodyWorkflowResult) => void;
  onOpenExisting?: (result: RepositoryCustodyWorkflowResult) => void;
  onFindByProvider?: (providerId: string) => Promise<RepositoryCustodyWorkflowResult[]>;
  preview?: boolean; previewLookup?: RepositoryProviderLookup;
}) {
  const [selectedId,setSelectedId] = useState("");
  const [url,setUrl] = useState(preview ? previewLookup?.canonical_url ?? "" : "");
  const [lookup,setLookup] = useState<RepositoryProviderLookup | null>(preview ? previewLookup ?? null : null);
  const defaultPreviewReference = previewLookup ? repositoryDefaultWorkspaceReference(previewLookup.owner,previewLookup.name) : "";
  const [owner,setOwner] = useState(preview ? defaultPreviewReference : "");
  const [custodyKind,setCustodyKind] = useState<RepositoryCustodyKind>("dedicated-owner-repo");
  const [approval,setApproval] = useState("");
  const [acknowledged,setAcknowledged] = useState(false);
  const [pending,setPending] = useState(false);
  const [error,setError] = useState<string | null>(null);
  const [result,setResult] = useState<RepositoryCustodyWorkflowResult | null>(null);
  const submitting = useRef(false);
  const identity = useRef<{signature: string; requestId: string; requestedAt: string} | null>(null);
  const dirty = Boolean(selectedId || (!preview && url) || approval || acknowledged || preview && (owner !== defaultPreviewReference || custodyKind !== "dedicated-owner-repo"));
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
    const original = known.find(row => row.request.request_id === value);
    const record = original?.provider_readback;
    const next: RepositoryProviderLookup | null = record && record.provider_lifecycle_state !== "unavailable" ? {schema_version:1 as const,provider:"github" as const,provider_host:"github.com" as const,
      provider_repository_id:record.repository_identity.provider_repository_id, owner:record.canonical_owner,name:record.canonical_name,
      canonical_url:record.canonical_url,visibility:record.visibility,provider_lifecycle_state:record.provider_lifecycle_state,
      observed_at:record.observed_at} : null;
    setLookup(next);setOwner(original?.request.requested_custody.workspace_owner_ref ?? (next ? repositoryDefaultWorkspaceReference(next.owner, next.name) : ""));
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
      const matches = onFindByProvider ? await onFindByProvider(next.provider_repository_id) : known;
      const existing = matches.find(row => row.provider_readback?.repository_identity.provider_repository_id === next.provider_repository_id);
      setLookup(next);setOwner(existing?.request.requested_custody.workspace_owner_ref ?? repositoryDefaultWorkspaceReference(next.owner, next.name));
    }catch(failure){setError(failure instanceof Error && ["TimeoutError","AbortError"].includes(failure.name)?"Repository lookup timed out. Check the connection and try again.":failure instanceof Error?failure.message:"Repository verification failed.");}
    finally{submitting.current=false;setPending(false);}
  }
  const canAttach = Boolean(isRepositoryUse(custodyKind) && !preview && enabled && attachmentAvailable && !pending && !alreadyLinked && lookup?.provider_lifecycle_state === "active" && repositoryWorkspaceName(owner) && (!proposalId || acknowledged) && approval.trim().length>=12);
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
      {preview ? <TerasContentTray kicker="Preview only" description="This is a sample repository. You can review the form; GitHub lookup and linking are disabled." /> : null}
      {!preview && !proposalId && !enabled ? <p role="status">Repository data is currently unavailable. Your draft is preserved until the connection recovers.</p> : null}
      {!preview && !attachmentAvailable ? <p role="status">{proposalId ? "Repository linking is unavailable until its service connection and approval capability are ready. Your draft is preserved." : "The approval connection for linking existing repositories is not configured. You can check repository details and prepare the draft; linking stays disabled."}</p> : null}
      {proposalId && known.length ? <TerasSelectField label="Repository to attach" aria-label="Repository to attach" disabled={readOnly} value={selectedId} onValueChange={select}
        options={[{label:"Select a known repository",value:""},...known.map(row=>({label:row.provider_readback!.canonical_url,value:row.request.request_id})),
          {label:"Enter a GitHub repository URL",value:"manual"}]} /> : null}
      {manual ? <>
        <TerasTextField label="GitHub repository URL" aria-label="GitHub repository URL" value={url} disabled={readOnly} readOnly={preview}
          placeholder="https://github.com/organization/repository" onValueChange={value=>{setUrl(value);setLookup(null);setAcknowledged(false);setError(null);}} />
        <TerasActionRow><TerasActionButton emphasis="secondary" disabled={preview || readOnly || !url.trim()} onClick={()=>void check()}>Check repository</TerasActionButton></TerasActionRow>
      </> : null}
      {error ? <p role="alert">{error}</p> : null}
      {pending ? <p role="status">Checking the repository or recording the approved link…</p> : null}
      {lookup ? <>
        <TerasMetadataList items={[{label:"Repository",value:lookup.canonical_url},{label:"Visibility",value:lookup.visibility},
          {label:"Provider state",value:preview ? "Sample only" : lookup.provider_lifecycle_state}]} />
        <RepositoryDevelopmentScope visibility={lookup.visibility} />
        {lookup.provider_lifecycle_state!=="active" ? <p role="status">Archived repositories cannot be linked. Restore it with the provider before retrying.</p> : null}
        {alreadyLinked ? <TerasContentTray kicker="Already in Repository Control" description="Open its record to review the current workspace status.">
          {onOpenExisting ? <TerasActionButton disabled={pending} onClick={() => onOpenExisting(alreadyLinked)}>Open repository</TerasActionButton> : null}
        </TerasContentTray> : <>
        <TerasContentTray kicker="Workspace" title="Repository use" description="Choose how this existing source is maintained. Its workspace identifier is prepared automatically; known repositories keep their existing identifier.">
        <RepositoryAssociationFields kind={custodyKind} reference={owner} disabled={readOnly}
          referenceLabel={proposalId ? "Attachment workspace repository" : "Workspace repository"}
          onKindChange={value=>{setCustodyKind(value);setResult(null);}} onReferenceChange={value=>{setOwner(value);setResult(null);}} />
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
