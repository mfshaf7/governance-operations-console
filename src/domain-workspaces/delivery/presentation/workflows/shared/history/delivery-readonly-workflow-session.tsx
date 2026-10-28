"use client";

import { useMemo, useState } from "react";
import {
  TerasActionButton, TerasEmptyState, TerasFieldStack, TerasHubFrame, TerasContentRegion,
  TerasHubPanel, TerasHubStepList, TerasMetadataList, TerasModalShell,
  TerasPanel, TerasPanelHeader, TerasProgressStepSelector, TerasSegmentedControl,
} from "@/teras";
import { ControlBoardArtTreeView } from "@/product-apps/control-board";
import type { DeliveryPackageSummary, DeliveryReadModel } from "../../../../read-model/index.ts";
import { useDeliveryChangeLiveRuntime } from "../../../../live-runtime/use-delivery-change-live-runtime.ts";
import { deliveryHistoryInspectionTree } from "../../../../live-runtime/delivery-history-tree.ts";
import { useRefinementLiveRuntime } from "../../../../live-runtime/use-refinement-live-runtime.ts";
import { workDesignSteps } from "../../work-design/view-model/work-design-step-model.ts";
import { refinementProgressRoutes } from "../../refinement/view-model/refinement-step-model.ts";
import { DeliveryOwnerHistoryContent, useDeliveryOwnerHistory } from "./delivery-history-dialog.tsx";

// Deliberately does not mount the authoring session controllers. Those hydrate
// and persist local drafts and expose preparation, advisor and apply actions.
// History is an inspection route over the same registers, tree product and
// Teras workflow shell, with original owner evidence alongside current ART.
export function DeliveryReadonlyWorkflowSession({ deliveryPackage, model, onClose, stage }: {
  deliveryPackage: DeliveryPackageSummary;
  model: DeliveryReadModel;
  onClose: () => void;
  stage: "work-design" | "refinement";
}) {
  const [step, setStep] = useState("hub");
  const history = useDeliveryOwnerHistory(deliveryPackage.delivery_package_id);
  const title = stage === "work-design" ? "Design Hub" : "Refinement Hub";
  const section = stage === "work-design" ? "work_design" : "refinement";
  const steps = stage === "work-design"
    ? workDesignSteps.map(item => ({ value: item.id, label: item.label }))
    : refinementProgressRoutes.map(item => ({ value: item.id, label: item.label }));
  const treeRuntime = useDeliveryChangeLiveRuntime(step === "build" ? deliveryPackage.legacy_epic_id ?? null : null);
  const treeRead = useMemo(() => {
    try { return {tree: deliveryHistoryInspectionTree(treeRuntime.projection, deliveryPackage.delivery_package_id),error:null}; }
    catch { return {tree:null,error:"The selected package tree could not be verified."}; }
  }, [treeRuntime.projection, deliveryPackage.delivery_package_id]);
  const sourceFacts = [
    { label: "Source", value: deliveryPackage.source_ref },
    { label: "Current package posture", value: deliveryPackage.package_posture },
    { label: "Target PI", value: deliveryPackage.target_pi ?? "Not committed" },
    { label: "Access", value: "Read-only history" },
  ];
  const evidence = <DeliveryOwnerHistoryContent {...history} sections={[section]} />;
  const stepLabel = steps.find(item => item.value === step)?.label ?? title;
  return <TerasModalShell
    surfaceId={stage === "work-design" ? "work-design-session" : "delivery-refinement-workflow"}
    title={stepLabel} kicker={`${title} · Read-only`}
    description={deliveryPackage.display_name}
    width="large" height="fill" bodyLayout="fill" onClose={onClose}
    modalAttributes={{ "data-teras-active-step": step, "data-delivery-history-workflow": stage }}
    footer={<>
      {step !== "hub" ? <TerasActionButton emphasis="secondary" onClick={() => setStep("hub")}>Back to {title}</TerasActionButton> : null}
      <TerasActionButton emphasis="secondary" onClick={history.refresh}>Refresh owner history</TerasActionButton>
      <TerasActionButton onClick={onClose}>Back to Register</TerasActionButton>
    </>}
  >
    <TerasContentRegion scroll gap="normal">
      <TerasSegmentedControl ariaLabel={`${title} inspection sections`} value={step} onValueChange={setStep} options={[{value:"hub",label:title},...steps]} />
      {step === "hub" ? <TerasHubFrame
        selected={<TerasHubPanel slot="selected" tone="info"><TerasPanelHeader kicker="Selected Package" title={deliveryPackage.display_name} statusLabel={deliveryPackage.package_posture} statusTone={deliveryPackage.tone}/><TerasMetadataList items={sourceFacts}/></TerasHubPanel>}
        primary={<TerasHubPanel slot="action" tone="info"><TerasPanelHeader kicker="Read-only workflow" title="Inspect retained work" description="Browse the workflow sections and complete ART tree. Editing, AI drafting, preparation, apply and work start are locked in History."/><TerasActionButton onClick={()=>setStep(stage === "work-design" ? "build" : "metadata_draft")}>Inspect {stage === "work-design" ? "Build Tree" : "Metadata Workbench"}</TerasActionButton></TerasHubPanel>}
        status={<TerasHubPanel slot="status" tone="info"><TerasPanelHeader kicker="Evidence boundary" title="Original records and current ART" description="Current package posture does not prove a past stage completed. Original owner receipts retain their own identities, outcomes and coverage."/>{evidence}</TerasHubPanel>}
        progress={<TerasHubPanel slot="progress" tone="info"><TerasPanelHeader kicker="Workflow sections" title="Inspect each section"/><TerasHubStepList ariaLabel={`${title} sections`}>{steps.map((item,index)=><TerasProgressStepSelector key={item.value} available current={false} index={index+1} label={item.label} stateLabel="Read-only" detail="Inspect available owner evidence" tone="info" onSelect={()=>setStep(item.value)}/>)}</TerasHubStepList></TerasHubPanel>}
        history={<TerasHubPanel slot="history"><TerasPanelHeader kicker="History" title="Original Owner Evidence"/><TerasActionButton onClick={()=>setStep(stage === "work-design" ? "history" : "receipt")}>View History</TerasActionButton></TerasHubPanel>}
      /> : step === "build" ? <>
        <TerasPanelHeader kicker="Build Tree · Read-only" title="Current canonical ART tree" description="The complete retained ART hierarchy, including descriptions, can be expanded here. This is the current owner read; the original accepted draft snapshot was not retained by the Work Design history owner."/>
        {treeRead.tree ? <ControlBoardArtTreeView tree={treeRead.tree}/> : <TerasEmptyState>{treeRead.error ?? treeRuntime.projectionError ?? "Reading the selected package's complete ART tree…"}</TerasEmptyState>}
      </> : step === "context" ? <>
        <TerasPanel frame="padded" treatment="state" tone="warn"><TerasPanelHeader kicker="Context Session · Read-only" title="Original context snapshot not retained" description="The owner history retains Work Design application receipts and draft digests, but no original context canvas, finalized brief body or advisor conversation. Current ART and browser-local drafts are not substituted for those historical artifacts."/><TerasMetadataList items={sourceFacts}/></TerasPanel>
        <DeliveryOwnerHistoryContent {...history} sections={["intake","work_design"]}/>
      </> : stage === "refinement" && ["metadata_draft","readiness_review","apply_refinement"].includes(step) ? <>
        <RefinementReadonlySection deliveryPackage={deliveryPackage} step={step}/>
        {evidence}
      </> : <>
        {step === "review" ? <TerasEmptyState>The original reviewed draft and operator review note were not retained by this history owner. The current ART tree remains available in Build Tree; original application evidence follows.</TerasEmptyState> : null}
        <DeliveryOwnerHistoryContent {...history} sections={step === "history" || step === "receipt" ? ["intake","work_design","refinement","closeout"] : [section]}/>
      </>}
    </TerasContentRegion>
  </TerasModalShell>;
}

function RefinementReadonlySection({deliveryPackage,step}:{deliveryPackage:DeliveryPackageSummary;step:string}) {
  // This hook's mount path only reads the owner projection. Do not use the
  // mutable session controller, local draft hydration or inferred receipts.
  const runtime = useRefinementLiveRuntime(deliveryPackage);
  const packet = runtime.mode === "live" && runtime.projectionStatus === "current" ? runtime.packet : null;
  if (!packet) return <TerasEmptyState>{runtime.loading ? "Reading the current Refinement owner packet…" : runtime.projectionError ?? "The current Refinement owner packet is unavailable. Original history remains independent below."}</TerasEmptyState>;
  return <TerasFieldStack>
    <TerasPanelHeader kicker="Refinement · Read-only" title="Current owner packet" description="These are current owner-projected metadata, gates and routes, not an archived copy of past operator decisions. Original runs and receipts are shown separately below."/>
    <TerasMetadataList items={[{label:"Packet",value:packet.packet_id},{label:"Source revision",value:packet.packet_revision??"Not projected"},{label:"Packet state",value:packet.status},{label:"Work Design receipt",value:packet.handoff.source_work_design_receipt_id}]}/>
    {step === "metadata_draft" ? packet.draft_groups.map(group=><TerasPanel key={group.group_id} frame="padded" treatment="rail" tone="info"><TerasPanelHeader kicker="Metadata Workbench" title={group.title} description={group.summary}/>{group.fields.map((field,index)=><TerasMetadataList key={`${field.field_key??field.backend_field}:${index}`} items={[{label:field.label,value:field.value||"No current value"},{label:"Owner field state",value:field.status},...Object.entries(field.target_values??{}).map(([target,value])=>({label:target,value:value||"No current value"}))]}/>)}</TerasPanel>) : step === "readiness_review" ? packet.readiness_gates.map(gate=><TerasPanel key={gate.gate_id} frame="padded" treatment="rail" tone={gate.tone}><TerasPanelHeader kicker="Readiness Review" title={gate.label} description={gate.detail} statusLabel={gate.status} statusTone={gate.tone}/></TerasPanel>) : <>
      <TerasPanelHeader kicker="Apply Refinement · Read-only" title="Current owner apply plan" description={packet.apply_plan.summary}/>
      {packet.apply_plan.operations.map(operation=><TerasPanel key={operation.operation_id} frame="padded" treatment="rail" tone="info"><TerasPanelHeader kicker={operation.kind} title={operation.label} description={operation.detail} statusLabel={operation.status} statusTone="info"/><TerasMetadataList items={[{label:"Target",value:operation.target},{label:"Owner route",value:operation.oos_route}]}/></TerasPanel>)}
    </>}
  </TerasFieldStack>;
}
