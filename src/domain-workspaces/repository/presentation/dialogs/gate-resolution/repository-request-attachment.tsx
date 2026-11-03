"use client";

import { useEffect, useRef, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasFieldGrid, TerasFieldStack, TerasMetadataList,
  TerasNoteField, TerasSelectableRow, TerasSelectField, TerasTextField } from "@/teras";
import { assertRepositoryProviderLookup, repositoryCoordinatesFromUrl, type RepositoryProviderLookup } from "../../../live-runtime/repository-provider-lookup.ts";
import type { RepositoryCustodyLinkIntent, RepositoryCustodyKind, RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";

export function RepositoryRequestAttachment({proposalId, results, enabled, attachmentAvailable, onAttach, onDirtyChange, onBusyChange, onAttached}: {
  proposalId: string; results: RepositoryCustodyWorkflowResult[]; enabled: boolean; attachmentAvailable: boolean;
  onAttach: (intent: RepositoryCustodyLinkIntent) => Promise<RepositoryCustodyWorkflowResult>;
  onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void;
  onAttached: (notes: string) => void;
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
  const manual = selectedId === "manual" || (!selectedId && (!known.length || Boolean(url)));
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
      setLookup(next);setOwner(`repo:${next.name}`);
    }catch(failure){setError(failure instanceof Error && ["TimeoutError","AbortError"].includes(failure.name)?"Repository lookup timed out. Check the connection and try again.":failure instanceof Error?failure.message:"Repository verification failed.");}
    finally{submitting.current=false;setPending(false);}
  }
  const canAttach = Boolean(enabled && attachmentAvailable && !pending && lookup?.provider_lifecycle_state === "active" && owner.trim() && acknowledged && approval.trim().length>=12);
  async function attach() {
    if (!canAttach || !lookup || submitting.current) return;
    submitting.current=true;setPending(true);setError(null);
    const fields={approvalNote:approval.trim(),createdForRequest:true as const,proposalId,custodyKind,
      providerHost:"github.com",providerRepositoryId:lookup.provider_repository_id,repositoryId:`repo-provider-${lookup.provider_repository_id}`,
      repositoryName:lookup.name,repositoryOwner:lookup.owner,workspaceOwnerRef:owner.trim()};
    const signature=JSON.stringify(fields);
    if(identity.current?.signature!==signature)identity.current={signature,requestId:`repository-custody-request:attach-${crypto.randomUUID()}`,requestedAt:new Date().toISOString()};
    try {
      const outcome=await onAttach({...fields,requestId:identity.current.requestId,requestedAt:identity.current.requestedAt});
      setResult(outcome);
      if(outcome.status==="succeeded")onAttached(approval.trim());
      else setError(outcome.failure?.message ?? "Attachment has not completed. Review the recorded result before retrying.");
    }catch(failure){setError(failure instanceof Error?failure.message:"Repository attachment failed.");}
    finally{submitting.current=false;setPending(false);}
  }
  return <TerasContentTray kicker="Already created" title="Attach a repository to this request"
    description="Select a known repository or enter its GitHub URL. Attachment verifies its identity and records your approval; it does not create a repository.">
    <TerasFieldStack spacing="loose">
      {!attachmentAvailable ? <p role="status">Repository attachment is unavailable until its owner connection and approval capability are ready. You can still prepare and inspect the draft.</p> : null}
      {known.length ? <TerasSelectField label="Repository to attach" aria-label="Repository to attach" disabled={readOnly} value={selectedId} onValueChange={select}
        options={[{label:"Select a known repository",value:""},...known.map(row=>({label:row.provider_readback!.canonical_url,value:row.request.request_id})),
          {label:"Enter a GitHub repository URL",value:"manual"}]} /> : null}
      {manual ? <>
        <TerasTextField label="GitHub repository URL" aria-label="GitHub repository URL" value={url} disabled={readOnly}
          placeholder="https://github.com/organization/repository" onValueChange={value=>{setUrl(value);setLookup(null);setAcknowledged(false);setError(null);}} />
        <TerasActionRow><TerasActionButton emphasis="secondary" disabled={readOnly || !url.trim()} onClick={()=>void check()}>Check repository</TerasActionButton></TerasActionRow>
      </> : null}
      {error ? <p role="alert">{error}</p> : null}
      {pending ? <p role="status">Checking the repository and recording the reviewed attachment…</p> : null}
      {lookup ? <>
        <TerasMetadataList items={[{label:"Repository",value:lookup.canonical_url},{label:"Visibility",value:lookup.visibility},
          {label:"Provider state",value:lookup.provider_lifecycle_state}]} />
        {lookup.provider_lifecycle_state!=="active" ? <p role="status">Archived repositories cannot be attached. Restore it with the provider before retrying.</p> : null}
        <TerasFieldGrid><TerasTextField label="Workspace owner reference" aria-label="Attachment workspace owner reference" value={owner} disabled={readOnly}
          onValueChange={value=>{setOwner(value);setResult(null);}} />
          <TerasSelectField label="Ownership type" aria-label="Attachment ownership type" value={custodyKind} disabled={readOnly}
            onValueChange={value=>{setCustodyKind(value);setResult(null);}} options={[
              {label:"Dedicated owner repository",value:"dedicated-owner-repo"},{label:"Shared owner repository",value:"shared-owner-repo"},
              {label:"Incubation repository",value:"incubation-repo"},{label:"External repository",value:"external-repo"}]} />
        </TerasFieldGrid>
        <TerasSelectableRow ariaLabel="Confirm repository was created for this request" label="This repository was created for this request"
          detail="For a repository already serving existing work, use the earlier Proposal reuse choice. Attachment checks the provider again before recording a receipt."
          selected={acknowledged} status={acknowledged?"Confirmed":"Review needed"} disabled={readOnly}
          onSelect={()=>setAcknowledged(value=>!value)} />
        <TerasNoteField label="Attachment approval" aria-label="Attachment approval" value={approval} disabled={readOnly} minLength={12} minimumHeight="short"
          placeholder="Explain how this already-created repository fulfils this request (at least 12 characters)." onValueChange={value=>{setApproval(value);setResult(null);}} />
        <TerasActionRow><TerasActionButton disabled={!canAttach} onClick={()=>void attach()}>{result?.retryable?"Retry attachment":"Verify and attach repository"}</TerasActionButton></TerasActionRow>
      </> : null}
    </TerasFieldStack>
  </TerasContentTray>;
}
