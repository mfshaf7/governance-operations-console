"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentFrame, TerasContentTray, TerasDraftCloseGuardDialog, TerasEmptyState, TerasFilterBar,
  TerasLoadingState, TerasMetadataList, TerasModalShell, TerasRecordCellText, TerasRecordTable, TerasRegisterPagination,
  TerasRegisterPanel, TerasSelectableRow, TerasSelectField, TerasTechnicalDetails, TerasTextField, TerasTrayStack, type TerasRecordTableColumn } from "@/teras";
import { useRegisterPageSize } from "@/console-integration/registers/use-register-page-size";
import { assertMembershipOutcome, assertMembershipProjection, type MembershipCommand, type MembershipOutcome,
  type MembershipProjection, type ProjectMember } from "../../../live-runtime/membership-contract.ts";
import { membershipPreview } from "./membership-preview.ts";

type Draft = { operation: MembershipCommand["operation"]; member: ProjectMember | null; principalId: string; roleIds: number[] };
const endpoint = "/api/delivery/catalog/memberships";
const messageOf = (error: unknown) => error instanceof Error ? error.message : "Project members could not be loaded.";
export function CatalogMembershipDialog({ open, preview, onClose, onApplied }: {
  open: boolean; preview: boolean; onClose: () => void; onApplied: () => Promise<unknown>;
}) {
  const [data, setData] = useState<MembershipProjection | null>(null), [loading, setLoading] = useState(false), [readError, setReadError] = useState<string | null>(null);
  const [search, setSearch] = useState(""), [candidateSearch, setCandidateSearch] = useState(""), [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Draft | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<MembershipCommand | null>(null), [stale, setStale] = useState(false), [guard, setGuard] = useState(false);
  const [outcome, setOutcome] = useState<MembershipOutcome | null>(null), [previewResult, setPreviewResult] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState("");
  const sample = useRef(membershipPreview()), serial = useRef(0), readSequence = useRef(0);
  const {pageSize} = useRegisterPageSize("Delivery project members");
  const load = useCallback(async (signal?: AbortSignal) => {
    const sequence = ++readSequence.current;
    setLoading(true); setReadError(null);
    try {
      let projection: MembershipProjection;
      if (preview) {
        const base = sample.current, members = base.members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
        const candidates = base.candidates.filter(m => m.name.toLowerCase().includes(candidateSearch.toLowerCase()));
        projection = {...base,total:members.length,page,page_size:pageSize,members:members.slice((page-1)*pageSize,page*pageSize),candidates,candidate_total:candidates.length};
      } else {
        const response = await fetch(`${endpoint}?${new URLSearchParams({page:String(page),page_size:String(pageSize),search,candidate_search:candidateSearch})}`, {cache:"no-store",signal});
        const body: unknown = await response.json();
        if (!response.ok) throw new Error((body as {message?:string})?.message ?? "Project members are unavailable.");
        projection = assertMembershipProjection(body);
      }
      if (!signal?.aborted && sequence === readSequence.current) setData(projection);
      return projection;
    } catch (error) {
      if (!signal?.aborted && sequence === readSequence.current) setReadError(messageOf(error));
      return null;
    } finally { if (!signal?.aborted && sequence === readSequence.current) setLoading(false); }
  }, [preview,page,pageSize,search,candidateSearch]);
  useEffect(() => { if (!open) return; const controller = new AbortController(); const timer = setTimeout(() => void load(controller.signal),150); return () => {clearTimeout(timer);controller.abort();}; },[open,load]);
  useEffect(() => setPage(1),[pageSize,search]);
  const begin = (operation: Draft["operation"], member: ProjectMember | null = null) => {
    setDraft({operation,member,principalId:member ? String(member.id) : "",roleIds:operation === "remove" ? [] : member?.role_ids ?? []});
    setAccepted(null);setStale(false);setError(null);
  };
  const closeDraft = () => {if(busy)return; if(draft && (accepted || draft.operation !== "remove"))setGuard(true);else setDraft(null);};
  async function apply() {
    if ((!draft && !accepted) || !data || busy) return;
    const command: MembershipCommand = accepted ?? {request_id:crypto.randomUUID(),operation:draft!.operation,principal_id:Number(draft!.principalId),
      membership_id:draft!.member?.membership_id ?? null,role_ids:[...draft!.roleIds].sort((a,b)=>a-b),expected_version:draft!.member?.version ?? null};
    setBusy(true);setError(null);setAccepted(command);
    try {
      if (preview) {
        const base=sample.current, existing=base.members.find(m=>m.id===command.principal_id);
        const principal=existing ?? base.candidates.find(p=>p.id===command.principal_id);
        if(!principal || existing?.protected)throw new Error("This preview member cannot be changed.");
        if(command.operation === "remove") {base.members=base.members.filter(m=>m.id!==principal.id);base.candidates.push({id:principal.id,name:principal.name,kind:principal.kind});}
        else {
          const member:ProjectMember={...principal,membership_id:existing?.membership_id ?? 100+ ++serial.current,role_ids:command.role_ids,
            role_names:base.roles.filter(r=>command.role_ids.includes(r.id)).map(r=>r.name),version:"sha256:"+String(++serial.current).padStart(64,"0"),protected:false,restriction:null};
          base.members=[...base.members.filter(m=>m.id!==principal.id),member];base.candidates=base.candidates.filter(p=>p.id!==principal.id);
        }
        setPreviewResult(`Preview ${command.operation === "remove" ? "removed" : command.operation === "add" ? "added" : "updated"} ${principal.name}. No live membership changed.`);
      } else {
        const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(command)});
        const body=await response.json();
        if(!response.ok){if(response.status<500){setAccepted(null);setStale(response.status===409);}throw new Error(body?.message ?? "The membership change could not be confirmed.");}
        const result=assertMembershipOutcome(body);
        if(result.request_id!==command.request_id || result.principal.id!==command.principal_id || result.operation!==command.operation || result.project_id!==data.project_id)throw new Error("The outcome does not match this decision. Recover the original request.");
        setOutcome(result);setSelectedOutcome(result.request_id);
      }
      setDraft(null);setAccepted(null);setPage(1);await load();
      if(!preview)await onApplied().catch(()=>undefined);
    } catch(error){setError(messageOf(error));} finally{setBusy(false);}
  }
  async function reloadDraft() {
    const current=await load();if(!current || !draft)return;
    const member=current.members.find(m=>m.id===Number(draft.principalId));
    if(draft.operation!=="add" && !member){setError("This membership is no longer on the current page. Close the form and find the current member before deciding again.");return;}
    setDraft({...draft,member:member ?? null});setStale(false);setError(null);setAccepted(null);
  }
  if(!open)return null;
  const columns:TerasRecordTableColumn<ProjectMember>[]=[
    {key:"member",header:"Member",render:m=><TerasRecordCellText title={m.name} meta={m.kind === "group" ? "Group" : m.kind === "placeholder" ? "Placeholder" : "User"}/>},
    {key:"roles",header:"Project roles",render:m=><TerasRecordCellText title={m.role_names.join(", ")} description={m.restriction}/>},
    {key:"actions",header:"Actions",render:m=>m.protected ? <TerasRecordCellText title="Protected access"/> : <TerasActionRow spacing="compact">
      <TerasActionButton emphasis="secondary" disabled={Boolean(accepted)} onClick={()=>begin("change",m)}>Change Roles</TerasActionButton>
      <TerasActionButton emphasis="secondary" tone="danger" disabled={Boolean(accepted)} onClick={()=>begin("remove",m)}>Remove</TerasActionButton></TerasActionRow>},
  ];
  const principalName = draft?.member?.name ?? data?.candidates.find(p=>String(p.id)===draft?.principalId)?.name ?? "Choose a user or group";
  const roleNames = data?.roles.filter(r=>draft?.roleIds.includes(r.id)).map(r=>r.name).join(", ") ?? "";
  const outcomes = [...(outcome ? [outcome] : []), ...(data?.recent_outcomes ?? [])].filter((entry,index,all)=>all.findIndex(other=>other.request_id===entry.request_id)===index);
  const recent = outcomes.find(entry=>entry.request_id===selectedOutcome) ?? outcomes[0] ?? null;
  const hasStatus = Boolean(accepted && !draft || previewResult || recent);
  return <>
    <TerasModalShell bodyLayout="fill" height="fill" width="large" kicker="Delivery" title="Project Members"
      description={preview ? "Disconnected preview · Sample members and local changes only." : `Manage access to ${data?.project_name ?? "the Delivery project"}. Existing work keeps its recorded assignments.`}
      onClose={()=>{if(!draft && !busy)onClose();}} surfaceId="delivery-project-members">
      <TerasContentFrame fill variant={hasStatus ? "standard" : "single-region"}>
        {hasStatus ? <TerasTrayStack spacing="compact" scrollHeight="short">
        {accepted && !draft ? <TerasContentTray kicker="Membership outcome not confirmed" description={error ?? "Recover the original decision before making another membership change."}>
          <TerasActionButton emphasis="primary" disabled={busy} onClick={()=>void apply()}>Recover pending change</TerasActionButton></TerasContentTray> : null}
        {previewResult ? <TerasContentTray kicker="Preview result" description={previewResult}/> : null}
        {recent ? <TerasContentTray kicker={recent.request_id===outcome?.request_id ? "Membership updated" : "Recorded membership change"}
          description={`${recent.principal.name} · ${recent.operation === "remove" ? "Removed from project" : recent.operation === "add" ? "Added to project" : "Project roles updated"}`}>
          {outcomes.length>1 ? <TerasSelectField label="Recorded change" value={recent.request_id} onValueChange={setSelectedOutcome} options={outcomes.map(entry=>({value:entry.request_id,label:`${new Date(entry.applied_at).toLocaleString()} · ${entry.principal.name} · ${entry.operation}`}))}/> : null}
          <TerasMetadataList items={[{label:"Recorded",value:new Date(recent.applied_at).toLocaleString()},{label:"Roles",value:recent.after?.role_names.join(", ") ?? "No project membership"}]}/>
          <TerasTechnicalDetails items={[{label:"Receipt",value:recent.receipt.ref},{label:"Request",value:recent.request_id},{label:"Operator",value:recent.operator_id}]}/>
        </TerasContentTray> : null}
        </TerasTrayStack> : null}
        <TerasRegisterPanel kicker="Project access" title="Members" description="Users and groups with access to this Delivery project. Protected installation access cannot be changed here."
          filterBar={!readError ? <TerasFilterBar search={{ariaLabel:"Search project members",value:search,onValueChange:setSearch,placeholder:"Search members…"}}
            action={<TerasActionButton emphasis="primary" disabled={loading || Boolean(accepted)} onClick={()=>begin("add")}>Add Member</TerasActionButton>}/> : undefined}
          footer={data && !readError && data.total>0 ? <TerasRegisterPagination label="Delivery project members" offset={(data.page-1)*data.page_size} count={data.members.length} total={data.total} page={data.page}
            pending={loading} hasPrevious={data.page>1} hasNext={data.page*data.page_size<data.total} onPrevious={()=>setPage(p=>p-1)} onNext={()=>setPage(p=>p+1)}/> : undefined}>
          {loading ? <TerasLoadingState fill label="Loading project members…"/> : readError ? <TerasEmptyState fill>{readError}<TerasActionButton emphasis="primary" onClick={()=>void load()}>Retry loading</TerasActionButton></TerasEmptyState> : data?.members.length ?
            <TerasRecordTable ariaLabel="Project members" columns={columns} rows={data.members} getRowId={m=>String(m.membership_id)} density="compact" profile="register"/> : <TerasEmptyState>No members match this search.</TerasEmptyState>}
        </TerasRegisterPanel>
      </TerasContentFrame>
    </TerasModalShell>
    {draft && data ? <TerasModalShell bodyLayout="scroll" height="content" width="standard" kicker="Project access"
      title={draft.operation === "add" ? "Add Project Member" : draft.operation === "remove" ? "Remove Project Member" : "Change Project Roles"}
      description={draft.operation === "remove" ? "Remove project access. Existing work retains its recorded assignments; this does not delete the account." : "Choose existing project roles. This changes project access, not the user’s global account."}
      busy={busy} busyLabel="Applying membership change…" onClose={closeDraft} surfaceId="delivery-project-member-change"
      footer={<><TerasActionButton emphasis="secondary" disabled={busy} onClick={closeDraft}>Cancel</TerasActionButton>
        <TerasActionButton emphasis="primary" tone={draft.operation === "remove" ? "danger" : "accent"} disabled={busy || stale || !draft.principalId || draft.operation!=="remove" && !draft.roleIds.length || Boolean(readError)} onClick={()=>void apply()}>
          {accepted ? "Retry same change" : draft.operation === "add" ? "Add Member" : draft.operation === "remove" ? "Remove Member" : "Save Roles"}</TerasActionButton></>}>
      <TerasTrayStack>
        {accepted && !busy ? <TerasContentTray kicker="Outcome not confirmed" description="Your original decision is retained. Retry recovers that exact request. Closing does not undo a change that may already have applied."/> : null}
        {error ? <TerasContentTray kicker="Check membership change" description={error}>{stale ? <TerasActionButton emphasis="secondary" onClick={()=>void reloadDraft()}>Reload current membership</TerasActionButton> : null}</TerasContentTray> : null}
        {draft.operation === "add" ? <TerasContentTray kicker="Existing user or group" description="Only accounts visible to this connection are listed. New accounts and invitations are managed in OpenProject.">
          <TerasTextField label="Find user or group" value={candidateSearch} disabled={Boolean(accepted) || busy} onValueChange={setCandidateSearch}/>
          {loading ? <TerasLoadingState inline label="Finding available accounts…"/> : <TerasSelectField label="User or group" value={draft.principalId} disabled={Boolean(accepted) || busy}
            options={[{value:"",label:"Choose an existing user or group"},...data.candidates.map(p=>({value:String(p.id),label:`${p.name}${p.kind==="group" ? " · Group" : ""}`}))]} onValueChange={id=>setDraft({...draft,principalId:id})}/>}
          {data.candidate_total===0 ? <TerasEmptyState>No available accounts match. Existing project members are managed from the member list.</TerasEmptyState> : data.candidate_total>data.candidates.length ? <TerasEmptyState>Showing the first {data.candidates.length} accounts. Narrow your search to find another account.</TerasEmptyState> : null}
        </TerasContentTray> : null}
        {draft.operation!=="remove" ? <TerasContentTray kicker="Project roles" description="Choose the access this member needs. Assignment support is shown for each role. Role definitions come from OpenProject.">
          <TerasTrayStack columns={2}>{data.roles.map(role=><TerasSelectableRow key={role.id} ariaLabel={`Role: ${role.name}`} label={role.name} selected={draft.roleIds.includes(role.id)} disabled={Boolean(accepted) || busy}
            detail={role.manages_members ? "Can manage project access" : role.can_assign_work ? "Can be assigned work" : "Project permissions"}
            onSelect={()=>setDraft({...draft,roleIds:draft.roleIds.includes(role.id) ? draft.roleIds.filter(id=>id!==role.id) : [...draft.roleIds,role.id]})}/>)}</TerasTrayStack>
        </TerasContentTray> : null}
        <TerasContentTray kicker="Review change"><TerasMetadataList items={[{label:"Member",value:principalName},{label:"Current roles",value:draft.member?.role_names.join(", ") ?? "Not a project member"},
          {label:"After this change",value:draft.operation === "remove" ? "No project access through this membership" : roleNames || "Select at least one role"}]}/></TerasContentTray>
      </TerasTrayStack>
    </TerasModalShell> : null}
    {guard ? <TerasDraftCloseGuardDialog title="Close membership change?" description={accepted ? "Closing does not undo an applied change. Reopen Project Members to inspect recorded outcomes before making a replacement decision." : "Your unsubmitted choices will be discarded."}
      kicker="Project access" leaveLabel="Close Form" onLeave={()=>{setGuard(false);setDraft(null);if(!accepted)setError(null);}} onKeepEditing={()=>setGuard(false)} open/> : null}
  </>;
}
