"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  TerasActionButton,
  TerasChoiceGroup,
  TerasContentRegion,
  TerasLoadingState,
  TerasSegmentedControl,
  TerasActionRow,
  TerasDraftCloseGuardDialog,
  TerasEmptyState,
  TerasFieldStack,
  TerasMetadataList,
  TerasModalShell,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
  TerasSignalItem,
  TerasTechnicalDetails,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";
import { useArchitecturePacketLiveRuntime } from "../../../../live-runtime/use-architecture-packet-live-runtime.ts";
import type {
  ArchitecturePacketArtifact,
  ArchitecturePacketCurrentResult,
  ArchitecturePacketDraftResult,
  ArchitecturePacketPersistResult,
} from "../../../../live-runtime/architecture-packet-live-types.ts";
import {
  architecturePacketEditorFromArtifact,
  architecturePacketEditorIssues,
  architecturePacketInputFromEditor,
  emptyArchitecturePacketEditor,
  type ArchitecturePacketEditor,
} from "./architecture-packet-editor-model.ts";
import type { DeliveryReadModel } from "../../../../read-model/delivery-read-model.ts";
import { ArchitecturePlanEditor } from "./architecture-plan-editor.tsx";
import { ArchitectureSavedContext, useArchitectureSavedContext } from "./architecture-saved-context.tsx";
import { technicalPlanDefaultSection, technicalPlanFillRecordedFacts, technicalPlanWorkItems } from "../../../../work-model/execution/technical-plan-model.ts";
import { TechnicalPlanAdvisor } from "./technical-plan-advisor.tsx";
import { TechnicalPlanReview } from "./technical-plan-review.tsx";
import { TechnicalPlanOverview } from "./technical-plan-overview.tsx";
import { TechnicalPlanActionPanel } from "./technical-plan-action-panel.tsx";
import { technicalPlanRequirement, type TechnicalPlanRequirement } from "../../../../work-model/execution/technical-plan-requirement.ts";
import { TechnicalPlanSequenceView } from "./technical-plan-sequence-view.tsx";

export function ArchitecturePacketAuthoringModal({
  defaultDeliveryId,
  defaultWorkItemId,
  onClose,
  model,
  readOnly = false,
  onCanonicalChanged,
  sourceContext,
  requirement: suppliedRequirement,
  onChooseWorkItem,
}: {
  defaultDeliveryId: string | null;
  defaultWorkItemId: number | null;
  onClose: () => void;
  model: DeliveryReadModel;
  readOnly?: boolean;
  onCanonicalChanged?: () => Promise<void>;
  requirement?: TechnicalPlanRequirement;
  onChooseWorkItem?: () => void;
  sourceContext?: { tree: import("../../../../live-runtime/delivery-change-live-types.ts").DeliveryChangeNode; revision: string };
}) {
  const runtime = useArchitecturePacketLiveRuntime();
  const exitAction = useRef(onClose);
  const [editor, setEditor] = useState(() =>
    technicalPlanFillRecordedFacts(emptyArchitecturePacketEditor({
      deliveryId: defaultDeliveryId ?? "",
      workItemId: defaultWorkItemId,
    }), model),
  );
  const [current, setCurrent] = useState<ArchitecturePacketCurrentResult | null>(null);
  const [validated, setValidated] = useState<ArchitecturePacketDraftResult | null>(null);
  const [approved, setApproved] = useState<ArchitecturePacketDraftResult | null>(null);
  const [persisted, setPersisted] = useState<ArchitecturePacketPersistResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  const live = model.source_truth === "OpenProject-backed OOS";
  const [tab, setTab] = useState("overview"), [section,setSection] = useState<string>(technicalPlanDefaultSection);
  const [confirmed,setConfirmed] = useState(false),[readError,setReadError] = useState<string|null>(null),[checking,setChecking] = useState(live),[editing,setEditing] = useState(false),[missing,setMissing] = useState(false);
  const saved = useArchitectureSavedContext(editor.deliveryId,live);
  const item = model.packages.find(item=>item.delivery_package_id===editor.deliveryId||`delivery-${item.legacy_epic_id}`===editor.deliveryId);
  const titles = useMemo(()=>Object.fromEntries(technicalPlanWorkItems(model,editor.deliveryId).map(node=>[`work-item-${node.legacy_work_package_id}`,`${node.component_type} ${node.legacy_work_package_id} · ${node.title}`])),[model,editor.deliveryId]);
  useEffect(()=>{
    if(!live){setChecking(false);return;}
    let active=true;setChecking(true);
    void runtime.inspectCurrent(editor.deliveryId).then(snapshot=>{
      if(!active)return;
      if(snapshot.result?.workflow_id!=="delivery-art-architecture-packet-current"||snapshot.result.artifact.delivery_id!==editor.deliveryId)throw Error("The recorded plan did not match this package.");
      setCurrent(snapshot.result);setReadError(null);setMissing(false);
    }).catch(error=>{if(!active)return;if(error?.code==="delivery_art_reference_missing")setMissing(true);else setReadError(error instanceof Error?error.message:"The recorded plan could not be checked.");})
      .finally(()=>{if(active)setChecking(false);});
    return()=>{active=false;};
  },[live,editor.deliveryId,runtime.inspectCurrent]);
  const savedDraft = useRef(JSON.stringify(editor));
  const dirty = JSON.stringify(editor) !== savedDraft.current;

  function requestClose() {
    exitAction.current = onClose;
    if (submitting) return;
    if (dirty) setCloseGuardOpen(true);
    else onClose();
  }

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty || submitting) event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, submitting]);

  const draftIssues = useMemo(
    () => architecturePacketEditorIssues(editor, "draft"),
    [editor],
  );
  const approvalIssues = useMemo(
    () => architecturePacketEditorIssues(editor, "architecture-ready"),
    [editor],
  );

  function edit(update: (current: ArchitecturePacketEditor) => ArchitecturePacketEditor) {
    if(readOnly||submitting)return;
    setEditor(update);
    setEditing(true);setConfirmed(false);
    setValidated(null);
    setApproved(null);
    setPersisted(null);
    setError(null);
  }

  async function run(action: () => Promise<void>) {
    setSubmitting(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Architecture Packet request failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function inspectCurrent() {
    const deliveryId = editor.deliveryId.trim();
    if (!/^delivery-[1-9][0-9]*$/.test(deliveryId)) {
      throw new Error("Enter a Delivery identity such as delivery-1275 first.");
    }
    setChecking(true);
    try {
      const snapshot = await runtime.inspectCurrent(deliveryId);
      const result = snapshot.result;
      if (!result || result.workflow_id !== "delivery-art-architecture-packet-current" || result.artifact.delivery_id!==editor.deliveryId) throw new Error("The recorded plan did not match this package.");
      setCurrent(result);setReadError(null);setMissing(false);
    } catch(error) {
      setCurrent(null);
      if(error&&typeof error==="object"&&"code"in error&&error.code==="delivery_art_reference_missing"){setMissing(true);setReadError(null);}
      else {setMissing(false);setReadError(error instanceof Error?error.message:"The recorded plan could not be checked.");}
    } finally {setChecking(false);}

  }

  async function validateDraft() {
    const snapshot = await runtime.draft(
      architecturePacketInputFromEditor(editor, "draft"),
    );
    const result = snapshot.result;
    if (!result || result.workflow_id !== "delivery-art-architecture-packet-draft") {
      throw new Error("OOS did not return a validated Architecture Packet draft.");
    }
    if(result.architecture_packet.delivery_id!==editor.deliveryId || [...result.architecture_packet.covered_work_item_ids].sort().join()!==editor.coveredWorkItemIds.map(id=>id.trim()).filter(Boolean).sort().join()) throw Error("The validated plan did not match the selected package and covered work.");
    setValidated(result);
    setConfirmed(false);setTab("review");
    setApproved(null);
    setPersisted(null);
  }

  async function approveCandidate() {
    if(readOnly||!validated||!confirmed)throw Error("Review and explicitly approve the current plan first.");
    const snapshot = await runtime.draft(
      architecturePacketInputFromEditor(editor, "architecture-ready"),
    );
    const result = snapshot.result;
    if (!result || result.workflow_id !== "delivery-art-architecture-packet-draft") {
      throw new Error("OOS did not return an operator-approved Architecture Packet.");
    }
    if (result.architecture_packet.decision.status !== "architecture-ready") {
      throw new Error("OOS did not preserve the architecture-ready decision.");
    }
    if(result.source_snapshot.art_digest!==validated.source_snapshot.art_digest || JSON.stringify(result.architecture_packet.architecture)!==JSON.stringify(validated.architecture_packet.architecture) || JSON.stringify(result.architecture_packet.conformance_plan)!==JSON.stringify(validated.architecture_packet.conformance_plan) || JSON.stringify(result.architecture_packet.source_snapshot.repo_revisions)!==JSON.stringify(validated.architecture_packet.source_snapshot.repo_revisions) || JSON.stringify(result.architecture_packet.covered_work_item_ids)!==JSON.stringify(validated.architecture_packet.covered_work_item_ids)) {
      setValidated(null);setConfirmed(false);throw Error("Source facts changed during approval. Validate and review the current plan again; nothing was recorded.");
    }
    setApproved(result);
    setPersisted(null);
  }

  async function persistCandidate() {
    if (readOnly) throw Error("History cannot record a plan.");
    if (!approved) throw new Error("Approve the exact candidate before persistence.");
    const persistedDraft = JSON.stringify(editor);
    const snapshot = await runtime.persist(approved.architecture_packet);
    const result = snapshot.result;
    if (!result || result.workflow_id !== "delivery-art-architecture-packet-persist") {
      throw new Error("OOS did not return durable Architecture Packet custody.");
    }
    if(result.artifact.delivery_id!==editor.deliveryId || result.artifact.integrity.content_digest!==approved.architecture_packet.integrity.content_digest)throw Error("Recording was not confirmed for the reviewed plan. Its approval is retained for retry.");
    setPersisted(result);
    setConfirmed(false);void onCanonicalChanged?.().catch(()=>undefined);
    savedDraft.current = persistedDraft;
  }

  const displayed = persisted?.artifact ?? approved?.architecture_packet ?? validated?.architecture_packet ?? (!editing?current?.artifact:null) ?? null;
  const viewEditor = displayed ? architecturePacketEditorFromArtifact(displayed) : editor;
  const sourceLabel = persisted ? "Recorded approved plan" : approved ? "Approved locally · not recorded" : validated ? "Validated draft" : current&&!editing ? "Recorded plan" : "Unvalidated local draft";
  const stateLabel = persisted ? "Approved and recorded" : approved ? "Approval not yet recorded" : validated ? "Ready for review" : checking ? "Checking recorded plan…" : current&&!editing ? current.contract_posture === "current" ? "Approved plan available" : "Historical · read-only" : editing ? "Local draft" : missing ? "No approved plan recorded" : !live ? "Disconnected preview" : "Plan check unavailable";
  const requirement = readOnly ? {...technicalPlanRequirement({deliveryId:editor.deliveryId}),title:"Recorded technical agreement",detail:"Inspect the historical plan and covered scope. Current execution requirements are checked outside History."} : suppliedRequirement ?? technicalPlanRequirement({deliveryId:editor.deliveryId,available:live});
  const actionTitle = persisted ? "Approval recorded" : readOnly ? "Inspect the recorded plan" : approved ? "Record the approved plan" : validated ? "Review and approve" : current&&!editing ? "Review the recorded plan" : tab === "overview"&&!editing ? requirement.status === "required" ? "Prepare the required plan" : requirement.status === "binding" ? "Review the existing plan" : requirement.status === "not-required" ? "Continue with the checked work" : requirement.status === "covered" ? "Inspect the approved plan" : "Choose work to inspect" : "Validate this draft";
  const actionDescription = persisted ? "Recording is confirmed. Return to the work-start checks to continue execution." : readOnly ? "Inspect the saved agreement and evidence. This historical view keeps changes locked." : approved ? "Approval is not recorded yet. Record this exact candidate so execution can reference it." : validated ? "Review the candidate in Review Plan and explicitly accept it. Approval rechecks the source before recording." : current&&!editing ? "Reuse the recorded agreement while its scope and design remain applicable. Revise it for a material change." : tab === "overview"&&!editing ? requirement.status === "unknown" ? "Choose a work item, then review its execution requirements. Selecting work does not start it. Prepare Plan remains available separately." : requirement.detail : "Check the scope, implementation and verification plan. Validation does not approve or start work.";
  const disabledReason = submitting ? "Waiting for the workflow response…" : !live ? "Validation and recording are unavailable in disconnected preview." : !approved&&validated&&!confirmed ? "Select the explicit approval choice in Review Plan to enable approval." : !approved&&!validated&&(editing||tab === "prepare")&&draftIssues.length ? draftIssues[0] : null;
  function requestWorkSelection(){ if(!onChooseWorkItem)return;exitAction.current=onChooseWorkItem;if(dirty)setCloseGuardOpen(true);else onChooseWorkItem(); }
  function reviseCurrent(){if(!current||readOnly||current.contract_posture!=="current")return;const next=architecturePacketEditorFromArtifact(current.artifact);edit(()=>next);savedDraft.current=JSON.stringify(next);setTab("prepare");}
  let architecture: unknown = null, architectureError = false;try{architecture=JSON.parse(viewEditor.architectureJson);}catch{architectureError=true;}
  return <>
    <TerasModalShell busy={submitting} busyLabel="Checking or recording this technical plan…" bodyLayout="fill" height="fill" width="viewport"
      kicker="Delivery · Execution" title="Technical Plan & Approval" surfaceId="delivery-architecture-packet-authoring" onClose={requestClose}
      description="Connect the saved system design to its implementation, verification and recovery plan. Approval covers only the listed work and does not start execution."
      footer={<TerasActionButton disabled={submitting} emphasis="secondary" onClick={requestClose}>Back to Execution Board</TerasActionButton>}>
      <TerasZoneLayout variant="main-aside">
        <TerasZone fit="fill"><TerasPanel fit="fill" frame="padded" layout="header-toolbar-body" spacing="normal" treatment="neutral">
          <TerasPanelHeader kicker={`Selected package · Epic ${item?.legacy_epic_id??editor.deliveryId}`} title={item?.display_name??"Selected work"} statusLabel={readOnly?"Read-only":stateLabel} statusTone={persisted?"ok":readError?"warn":"info"}/>
          <TerasSegmentedControl ariaLabel="Technical plan views" disabled={submitting} value={tab} onValueChange={setTab} options={[
            {value:"overview",label:"Overview"},...(!readOnly?[{value:"prepare",label:"Prepare Plan"}]:[]),{value:"design",label:"System Architecture"},{value:"sequence",label:"Implementation Sequence"},{value:"review",label:"Review Plan"}]}/>
          <TerasContentRegion fill scroll={tab!=="sequence"} gap="normal">
            {tab==="overview"?<TechnicalPlanOverview requirement={requirement} workTitle={requirement.workItemId ? titles[requirement.workItemId] ?? requirement.workItemId : null}
              planStatus={stateLabel} coveredWork={viewEditor.coveredWorkItemIds.filter(Boolean).map(id=>titles[id]??id).join(" · ")}
              designStatus={saved.loading?"Reading saved brief…":saved.error?"Unavailable":saved.brief?`${saved.brief.name} · ${saved.brief.versionLabel}`:"No saved finalized brief returned"}
              checking={checking} readError={readError} missing={missing} live={live} current={Boolean(current)} readOnly={readOnly}
              onRetry={()=>void run(inspectCurrent)} onDesign={()=>setTab("design")} onReview={()=>setTab("review")}
              onRevise={!readOnly&&current?.contract_posture==="current"?reviseCurrent:undefined} onChooseWorkItem={!readOnly&&onChooseWorkItem&&(editing||current)?requestWorkSelection:undefined}/>:null}
            {tab==="prepare"&&!readOnly?current&&!editing?<TerasEmptyState>An approved plan is already recorded. Reuse it when preparing a revision. Historical records remain read-only.<TerasActionButton disabled={current.contract_posture!=="current"} onClick={reviseCurrent}>Revise Current Plan</TerasActionButton></TerasEmptyState>:<TerasFieldStack spacing="normal">
            {!readOnly&&!validated&&draftIssues.length?<TerasTechnicalDetails summary={`Before validation · ${draftIssues.length} ${draftIssues.length === 1 ? "check" : "checks"}`} items={draftIssues.map((issue,index)=>({label:`Check ${index+1}`,value:issue}))}/>:null}
              <ArchitecturePlanEditor editor={editor} model={model} disabled={submitting} onEdit={edit} selectedSection={section} onSectionChange={setSection} packageLocked/>
              <TerasTechnicalDetails summary="Technical data · JSON import and export" items={[]}><TerasFieldStack spacing="normal">
                {([ ["architectureJson","Architecture design"],["conformanceJson","Verification plan"],["repoRevisionsJson","Repository revisions"] ] as const).map(([key,label])=><TerasNoteField key={key} label={`${label} JSON`} value={editor[key]} minimumHeight="tall" disabled={submitting} onValueChange={value=>edit(current=>({...current,[key]:value}))}/>)}
              </TerasFieldStack></TerasTechnicalDetails>
            </TerasFieldStack>:null}
            {tab==="design"?<ArchitectureSavedContext deliveryId={editor.deliveryId} live={live} context={saved}/>:null}
            {tab==="sequence"?architectureError?<TerasEmptyState>The draft architecture data cannot be read. Correct its technical data in Prepare Plan before viewing the sequence.</TerasEmptyState>:<TechnicalPlanSequenceView architecture={architecture} titles={titles} sourceLabel={sourceLabel}/>:null}
            {tab==="review"?<TerasFieldStack spacing="normal">
              <TerasPanelHeader kicker={sourceLabel} title="Review the technical agreement" description="Check the covered work, design, implementation sequence, verification and recovery. The readable plan is below; JSON is available in technical details."/>
              <TechnicalPlanReview editor={viewEditor} titles={titles}/><TerasMetadataList items={[{label:"Plan justification",value:viewEditor.rationale||"Not recorded"}]}/>
              {validated&&!readOnly&&!approved?<TerasChoiceGroup frame="tray" ariaLabel="Technical plan approval" label="Operator approval" selectedId={confirmed?"approve":"review"} onSelect={value=>setConfirmed(value==="approve")} disabled={submitting}
                options={[{id:"review",label:"Review required",tone:"warn"},{id:"approve",label:"I approve this technical plan for the covered work",tone:"ok"}]}/>:null}
              {displayed?<TerasTechnicalDetails summary="Plan identity and source evidence" items={candidateMetadata(displayed)}>
                <TerasNoteField label="Canonical plan JSON" value={JSON.stringify(displayed,null,2)} minimumHeight="tall" readOnly onValueChange={()=>undefined}/>
              </TerasTechnicalDetails>:null}
            </TerasFieldStack>:null}
          </TerasContentRegion>
        </TerasPanel></TerasZone>
        <TerasZone fit="fill">
          <TerasPanelStack fill="last" minimumFillHeight="medium" scroll>
          <TechnicalPlanActionPanel title={actionTitle} description={actionDescription} disabledReason={disabledReason} error={error} recorded={Boolean(persisted)}
            evidence={persisted?<TerasTechnicalDetails summary="Recording evidence" items={[{label:"Plan reference",value:persisted.artifact.custody.uri},{label:"Custody receipt",value:JSON.stringify(persisted.custody_receipt)},{label:"Source receipt",value:JSON.stringify(persisted.owner_receipt)}]}/>:undefined}>
            {!readOnly&&!persisted&&(!current||editing)?approved?<TerasActionButton disabled={submitting||!live} onClick={()=>void run(persistCandidate)}>Record Approved Plan</TerasActionButton>:
              validated?<TerasActionButton disabled={submitting||!live||!confirmed||approvalIssues.length>0} onClick={()=>void run(approveCandidate)}>Approve Plan</TerasActionButton>:
              tab==="overview"&&!editing&&["unknown","not-required"].includes(requirement.status)&&onChooseWorkItem?<TerasActionButton disabled={submitting} onClick={requestWorkSelection}>Choose Work Item</TerasActionButton>:
              tab==="overview"&&!editing&&["binding","covered"].includes(requirement.status)?<TerasActionButton disabled={submitting} onClick={()=>void run(inspectCurrent)}>Check Recorded Plan</TerasActionButton>:
              tab==="overview"&&!editing?<TerasActionButton disabled={submitting} onClick={()=>{setEditing(true);setTab("prepare");}}>Prepare Technical Plan</TerasActionButton>:
              <TerasActionButton disabled={submitting||!live||draftIssues.length>0} onClick={()=>void run(validateDraft)}>Validate Plan</TerasActionButton>:null}
            {current&&!editing?<TerasActionButton emphasis="secondary" onClick={()=>setTab("review")}>View Recorded Plan</TerasActionButton>:null}
            {!readOnly&&validated?<TerasActionButton emphasis="secondary" onClick={()=>setTab("review")}>{persisted?"View Recorded Plan":"Review Validated Plan"}</TerasActionButton>:null}
            {current&&!editing&&!readOnly&&current.contract_posture==="current"?<TerasActionButton emphasis="secondary" onClick={reviseCurrent}>Revise Current Plan</TerasActionButton>:null}
          </TechnicalPlanActionPanel>
          <TechnicalPlanAdvisor key={editor.deliveryId} sourceContext={sourceContext} editor={readOnly||current&&!editing?viewEditor:editor} section={section} onSectionChange={setSection} model={model} brief={saved.brief} contextState={saved.loading?"loading":saved.error??(saved.brief?"available":"no finalized brief returned")}
            currentPlanRef={persisted?.artifact.custody.uri??current?.artifact.custody.uri??null} disabled={readOnly||submitting||Boolean(current?.contract_posture==="historical-read-only"&&!editing)} onEdit={next=>edit(()=>next)}/>
          </TerasPanelStack>
        </TerasZone>
      </TerasZoneLayout>
    </TerasModalShell>
    <TerasDraftCloseGuardDialog open={closeGuardOpen} title="Discard technical plan edits?" kicker="Unsaved plan" description="These local edits have not been recorded. The existing approved plan remains available." leaveLabel="Discard Draft" onKeepEditing={()=>{exitAction.current=onClose;setCloseGuardOpen(false);}} onLeave={()=>exitAction.current()}/>
  </>;
}

function candidateMetadata(artifact: ArchitecturePacketArtifact) {
  return [
    { label: "Artifact", value: artifact.artifact_id },
    { label: "Delivery", value: artifact.delivery_id },
    { label: "Decision", value: artifact.decision.status },
    { label: "Operator", value: artifact.operator.id },
    { label: "Covered scope", value: `${artifact.covered_work_item_ids.length} work items` },
    { label: "Digest", value: artifact.integrity.content_digest },
    { label: "Custody", value: artifact.custody.state },
  ];
}
