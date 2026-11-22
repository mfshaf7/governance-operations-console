import { TerasActionButton, TerasActionRow, TerasConceptFlow, TerasContentTray, TerasEmptyState, TerasFieldStack, TerasLoadingState, TerasMetadataList, TerasPanelHeader, TerasTechnicalDetails } from "@/teras";
import type { TechnicalPlanRequirement } from "../../../../work-model/execution/technical-plan-requirement.ts";
export function TechnicalPlanOverview({requirement,workTitle,planStatus,coveredWork,designStatus,checking,readError,missing,live,current,readOnly,onRetry,onDesign,onReview,onRevise}: {
  requirement:TechnicalPlanRequirement;workTitle:string|null;planStatus:string;coveredWork:string;designStatus:string;
  checking:boolean;readError:string|null;missing:boolean;live:boolean;current:boolean;readOnly:boolean;
  onRetry:()=>void;onDesign:()=>void;onReview:()=>void;onRevise?:()=>void;
}) {
  return <TerasFieldStack spacing="normal">
    <TerasPanelHeader kicker="Purpose" title="Agree how the work will be delivered" description="Use a technical plan when implementation needs an agreed approach across architecture, repositories or dependencies. It connects the system design to the changes, checks and recovery needed to deliver it."/>
    <TerasContentTray kicker="How it is used · when a plan is required" title="From system design to an agreed implementation">
      <TerasConceptFlow label="How a technical plan is used" items={[
        {title:"System design",detail:"Understand components, connections and responsibilities."},
        {title:"Technical plan",detail:"Agree change order, verification, approvals and recovery."},
        {title:"Human approval",detail:"Review and record the proposed approach for its covered work."},
        {title:"Execution checks",detail:"Use the recorded agreement when starting and advancing that work."},
      ]}/>
    </TerasContentTray>
    <TerasContentTray kicker="Requirement for the checked work" title={requirement.title} description={requirement.detail}>
      <TerasMetadataList columns={2} items={[
        {label:"Checked work",value:workTitle ?? "No work item checked"},
        {label:"Plan status",value:planStatus},{label:"Covered work",value:coveredWork || "Choose work in Prepare Plan"},{label:"Saved system design",value:designStatus},
      ]}/>
      {checking?<TerasLoadingState inline label="Reading the recorded plan…"/>:null}
      {readError?<TerasEmptyState>The recorded plan could not be checked. Applicability remains separate.<TerasActionButton emphasis="secondary" onClick={onRetry}>Retry Plan Check</TerasActionButton></TerasEmptyState>:null}
      {missing?<TerasEmptyState>No approved plan is recorded. The work-start check determines whether this work needs one.</TerasEmptyState>:null}
      {!live?<TerasEmptyState>Disconnected preview. Local drafts are editable; model replies, validation and recording need the connected workflow services.</TerasEmptyState>:null}
      <TerasActionRow spacing="compact"><TerasActionButton emphasis="secondary" onClick={onDesign}>View System Architecture</TerasActionButton>
        {current?<><TerasActionButton emphasis="secondary" onClick={onReview}>Inspect Plan Details</TerasActionButton>{onRevise?<TerasActionButton emphasis="secondary" onClick={onRevise}>Revise Current Plan</TerasActionButton>:null}</>:null}
      </TerasActionRow>
    </TerasContentTray>
    <TerasContentTray kicker="Illustrative example · separate from this package" title="Delivering an API and its web interface" description="A plan could agree the following before implementation begins.">
      <TerasMetadataList shape="list" items={[
        {label:"Change order",value:"Land the API contract change before the interface that depends on it."},
        {label:"Verification",value:"Check the API and interface together against the expected behaviour."},
        {label:"Recovery",value:"Identify which change can be reverted and how compatibility is restored."},
      ]}/>
    </TerasContentTray>
    <TerasTechnicalDetails summary="When should I prepare or revise a plan?" items={[
      {label:"Prepare",value:"When the initiative changes architecture, source spans owner repositories or protocol boundaries, or execution depends on an unproven cross-repository sequence."},
      {label:"Reuse",value:"An approved plan can cover several work items. Routine progress and source revision changes do not automatically require another architecture decision."},
      {label:"Revise",value:"Review material changes to covered scope, responsibilities, dependencies, gates or the agreed design."},
      {label:"Ordinary work",value:"A contained routine change may not need a technical plan. Follow the requirements returned by the work-start check."},
      {label:"Approval",value:"Approval records the approach. Starting work and releasing the result keep their separate controls."},
    ]}/>
  </TerasFieldStack>;
}
