"use client";
import {useMemo,useState} from "react";
import {TerasEmptyState,TerasSelectField} from "@/teras";
import {ContextBoardSequenceView} from "../../../../product-adapters/context-board/index.ts";
import {technicalPlanSequence} from "../../../../work-model/execution/technical-plan-sequence.ts";
import {TechnicalPlanValue} from "./technical-plan-review.tsx";
export function TechnicalPlanSequenceView({architecture,titles,sourceLabel}:{architecture:unknown;titles:Record<string,string>;sourceLabel:string}) {
  const [mode,setMode]=useState<"changes"|"work">("changes");
  const result=useMemo(()=>{try{return {plan:technicalPlanSequence(architecture,mode,titles),error:null};}catch(error){return {plan:null,error:error instanceof Error?error.message:"The sequence could not be rendered."};}},[architecture,mode,titles]);
  if(!result.plan)return <TerasEmptyState>{result.error}</TerasEmptyState>;
  return <ContextBoardSequenceView fit="workspace" key={mode} plan={result.plan} sourceLabel={sourceLabel}
    controls={<TerasSelectField label="Sequence view" value={mode} onValueChange={value=>setMode(value as "changes"|"work")} options={[{value:"changes",label:"Change groups and approvals"},{value:"work",label:"Work dependencies"}]}/>}
    renderDetails={node=><TechnicalPlanValue value={node.facts} titles={titles}/>}/>;
}
