"use client";
import { useState, type FormEvent } from "react";
import { advisorWorkContext, useDraftAdvisor } from "@/agent-console";
import { TerasAdvisorPanel, TerasSelectField, TerasTechnicalDetails, TerasFieldStack } from "@/teras";
import { contextBoardArchitectureContext, contextBoardDiagrams } from "../../../../../../product-apps/context-board/context-board-diagrams.ts";
import type { DeliveryChangeNode } from "../../../../live-runtime/delivery-change-live-types.ts";
import { technicalPlanAdvisorEdit, technicalPlanSections, technicalPlanSection, technicalPlanSectionContract, technicalPlanSectionValue, technicalPlanSetSection, technicalPlanWorkItems, type TechnicalPlanDraft } from "../../../../work-model/execution/technical-plan-model.ts";
import type { DeliveryReadModel } from "../../../../read-model/delivery-read-model.ts";
import type { WorkDesignBriefVersion } from "../../../../work-model/work-design/work-design-types.ts";

export function TechnicalPlanAdvisor({ editor, section, model, brief, contextState, currentPlanRef, disabled, onEdit, onSectionChange, sourceContext }: {
  editor: TechnicalPlanDraft; section: string; model: DeliveryReadModel; brief: WorkDesignBriefVersion | null;
  contextState: string; currentPlanRef: string | null; disabled: boolean; onEdit: (editor: TechnicalPlanDraft) => void;
  onSectionChange: (section: string) => void;
  sourceContext?: { tree: DeliveryChangeNode; revision: string };
}) {
  const [prompt,setPrompt]=useState(""),[turns,setTurns]=useState<Array<{id:string;role:"operator"|"advisor";text:string}>>([]),[diagramId,setDiagramId]=useState("");
  const [contextMode,setContextMode]=useState("related");
  const diagrams=brief?contextBoardArchitectureContext(brief.snapshot):[];
  const diagram=diagrams.find(view=>view.id===diagramId)??diagrams[0];
  const item=model.packages.find(item=>item.delivery_package_id===editor.deliveryId||`delivery-${item.legacy_epic_id}`===editor.deliveryId),label=technicalPlanSection(section)[1];
  const sourceOnly=section==="repo_revisions";
  const advisor=useDraftAdvisor({ disabled:disabled||sourceOnly, conversation:{role:"execution-architecture",ref:editor.deliveryId,sourceRef:item?.source_ref??editor.deliveryId,sourceRevision:model.generated_at},
    getScope:()=>{
      const nodes=technicalPlanWorkItems(model,editor.deliveryId),selected=nodes.filter(node=>editor.coveredWorkItemIds.includes(`work-item-${node.legacy_work_package_id}`));
      const narratives: Array<{id:number;type:string;title:string;description?:string}> = [];
      function visit(node: DeliveryChangeNode): boolean { const selected=editor.coveredWorkItemIds.includes(`work-item-${node.id}`); const children=node.children.map(visit).some(Boolean);
        if(selected||children)narratives.push({id:node.id,type:node.type,title:node.subject,description:node.description});return selected||children; }
      if(sourceContext)visit(sourceContext.tree);
      const removed=brief&&diagram?contextBoardDiagrams(brief.snapshot).find(view=>view.id===diagram.id)?.snapshot.removedCoreIds??[]:[];
      return {role:"execution-architecture",ref:`${editor.deliveryId}:${section}`,packageRef:editor.deliveryId,sourceRef:item?.source_ref??editor.deliveryId,sourceRevision:model.generated_at,
        context:advisorWorkContext({package:{id:editor.deliveryId,title:item?.display_name,summary:item?.summary},
          coveredWork:selected.map(node=>({id:`work-item-${node.legacy_work_package_id}`,type:node.component_type,title:node.title,description:node.description,repository:node.owner_repo,status:node.backend_status,dependencies:node.depends_on_work_package_ids})),
          sectionContract:technicalPlanSectionContract(section),
          canonicalWorkNarratives:sourceContext?{revision:sourceContext.revision,items:narratives}:null,
          savedWorkDesign:brief?{name:brief.name,version:brief.versionLabel,finalizedAt:brief.finalizedAt,note:brief.finalizedBrief?.note,summary:brief.finalizedBrief?.diagramSummary,selectedDiagram:diagram,
            coreArchitectureNodes:brief.coreNodes?.filter(node=>!removed.includes(node.id)),removedCoreNodeIds:removed,
            availableDiagrams:diagrams.map(view=>({id:view.id,name:view.name,description:view.description})),coverage:"Only the selected diagram's contents and supplied core nodes are loaded. Other diagram names are references, not loaded architecture."}:null,
          workDesignAvailability:contextState,currentPlanRef,sourceRevision:model.projection_state.source_revision,
          supportingPlan:contextMode==="related"?Object.fromEntries(["landing_units","source_landing_graph","work_item_execution_plan","required_human_gates"].filter(key=>section!==`architecture:${key}`).map(key=>[key,JSON.parse(editor.architectureJson)[key]??null])):null,
          planCoverage:contextMode==="related"?"Selected section plus supplied change groups, dependencies and human gates. Other sections are not loaded.":"Selected section only; cross-section consistency has not been checked.",
          sourceObservations:JSON.parse(editor.repoRevisionsJson),boundary:"Only sectionJson is editable. Scope, approval, source revisions and canonical writes are outside this advisor."},
          {provided:["Current selected local section and its actual schema", "Supplied work records and source observations", ...(brief?["Finalized Work Design narrative and selected diagram contents"]:[])],
            unavailable:["Implementation files, provider inspection and test/runtime results",...(brief?[]:["Finalized Work Design contents"]),...(sourceContext?[]:["Canonical work narratives beyond the supplied inventory"]),"Contents of other unselected diagrams and linked evidence"]}),
        fields:[{key:"sectionJson",label,value:JSON.stringify(technicalPlanSectionValue(editor,section)??null,null,2),maxLength:24000}]};
    },
    apply:edits=>{const next=technicalPlanAdvisorEdit(editor,section,edits);onEdit(next);return [{field:"sectionJson",value:JSON.stringify(technicalPlanSectionValue(next,section),null,2)}];},
    restore:edits=>{const found=edits.find(edit=>edit.field==="sectionJson");if(found&&typeof found.value==="string")onEdit(technicalPlanSetSection(editor,section,JSON.parse(found.value)));},
  });
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const text=prompt.trim();if(!text)return;setPrompt("");const id=crypto.randomUUID();
    setTurns(value=>[...value,{id:`${id}:operator`,role:"operator",text}]);
    try{const reply=await advisor.run(text);setTurns(value=>[...value,{id:`${id}:advisor`,role:"advisor",text:reply.message}]);}
    catch(error){setTurns(value=>[...value,{id:`${id}:advisor`,role:"advisor",text:error instanceof Error?error.message:"Advisor unavailable. Your plan is retained."}]);}
  }
  const opening = {id:"technical-plan-opening",role:"advisor" as const,text:sourceOnly
    ? "Ask me to explain source revisions. Source values must come from observed or independently verified records."
    : disabled ? "Ask me to explain the recorded plan. This plan is read-only."
    : `Ask me to explain this plan or draft ${label.toLowerCase()}. Approval and recording remain your decisions.`};
  const history = advisor.panelControls.history;
  const controls = {...advisor.panelControls,...(history ? {history:{...history,transcript:history.transcript.length ? history.transcript : [opening]}} : {})};
  return <TerasAdvisorPanel fill density="compact" profileLabel="Technical Plan Advisor" draftControls={controls}
    statusLabel={disabled||sourceOnly?"Read-only advice":"Draft assistance"} statusTone="info" statusTitle="Ask to explain or draft the selected section. Approval and recording remain operator actions."
    transcript={[opening,...turns]}
    prompt={{ariaLabel:"Technical plan advisor prompt",value:prompt,onChange:setPrompt,onSubmit:submit,placeholder:disabled||sourceOnly?`Ask about ${label.toLowerCase()}…`:`Ask about or request a draft of ${label.toLowerCase()}…`,rows:2}}
    footer={<TerasTechnicalDetails summary="Advisor context" items={[]}><TerasFieldStack spacing="compact">
      <TerasSelectField label="Advisor plan section" disabled={advisor.busy} value={section} onValueChange={onSectionChange} options={technicalPlanSections.map(([value,label])=>({value,label}))}/>
      <TerasSelectField label="Plan context" disabled={advisor.busy} value={contextMode} onValueChange={setContextMode} options={[{value:"related",label:"Selected section and related dependencies"},{value:"selected",label:"Selected section only"}]}/>
      {diagrams.length>1?<TerasSelectField label="Diagram context" disabled={advisor.busy} value={diagram?.id??""} onValueChange={setDiagramId} options={diagrams.map(view=>({value:view.id,label:view.name}))}/>:null}
    </TerasFieldStack></TerasTechnicalDetails>}/>;
}
