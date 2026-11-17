import { TerasContentTray, TerasEmptyState, TerasFieldStack, TerasMetadataList, TerasTechnicalDetails, TerasInspectionSection } from "@/teras";
import { technicalPlanGroups, technicalPlanEntryName } from "../../../../work-model/execution/technical-plan-preparation.ts";
import { technicalPlanDisplayLabel, technicalPlanSections, technicalPlanSectionValue, type TechnicalPlanDraft } from "../../../../work-model/execution/technical-plan-model.ts";

export function TechnicalPlanValue({ value, name = "Plan", titles = {} }: { value: unknown; name?: string; titles?: Record<string,string> }) {
  if (value === null || value === undefined || value === "") return <TerasEmptyState>Not recorded</TerasEmptyState>;
  if (Array.isArray(value) && value.length && value.every(item => item === null || typeof item !== "object")) return <TerasMetadataList shape="list" items={value.map((item,index) => ({label:`${name} ${index+1}`,value:item === null || item === "" ? "Not recorded" : titles[String(item)] ?? String(item)}))}/>;
  if (Array.isArray(value)) return value.length ? <TerasFieldStack spacing="normal">{value.map((entry,index)=><TerasContentTray key={index} kicker={`${name} ${index+1}`} title={technicalPlanEntryName(entry,index,titles)}>
    <TechnicalPlanValue value={entry} titles={titles} />
  </TerasContentTray>)}</TerasFieldStack> : <p>No entries recorded.</p>;
  if (typeof value === "object") {
    const rows=Object.entries(value), scalar=rows.filter(([,value])=>!value||typeof value!=="object"),nested=rows.filter(([,value])=>value&&typeof value==="object");
    if(!rows.length)return <TerasEmptyState>Not recorded</TerasEmptyState>;
    return <TerasFieldStack spacing="normal">
      {scalar.length?<TerasMetadataList shape="list" items={scalar.map(([key,value])=>({label:technicalPlanDisplayLabel(key),value:typeof value==="boolean"?value?"Yes":"No":value===null||value===""?"Not recorded":titles[String(value)]??String(value)}))}/>:null}
      {nested.map(([key,value])=><TerasContentTray key={key} title={technicalPlanDisplayLabel(key)}><TechnicalPlanValue value={value} name={technicalPlanDisplayLabel(key)} titles={titles}/></TerasContentTray>)}
    </TerasFieldStack>;
  }
  return <p>{titles[String(value)]??String(value)}</p>;
}

export function TechnicalPlanReview({ editor, titles }: { editor: TechnicalPlanDraft; titles: Record<string,string> }) {
  try { JSON.parse(editor.architectureJson); JSON.parse(editor.conformanceJson); JSON.parse(editor.repoRevisionsJson); }
  catch { return <TerasEmptyState>The draft contains invalid technical data. Correct it in Prepare Plan before reviewing or approving it.</TerasEmptyState>; }
  return <TerasFieldStack spacing="normal">
    <TerasContentTray kicker="Covered work"><TechnicalPlanValue value={editor.coveredWorkItemIds.filter(Boolean)} name="Work item" titles={titles}/></TerasContentTray>
    <TerasMetadataList shape="line" treatment="chip" items={[{label:"Verification required",value:typeof JSON.parse(editor.conformanceJson)?.required === "boolean" ? JSON.parse(editor.conformanceJson).required ? "Yes" : "No" : "Not entered"}]}/>
    {technicalPlanGroups.map(group => <TerasContentTray key={group.id} title={group.label}>
      <TerasFieldStack spacing="normal">{technicalPlanSections.filter(([section]) => group.sections.some(key => key === section)).map(([section,title,description]) => {
        let value: unknown;try{value=technicalPlanSectionValue(editor,section);}catch{return <TerasEmptyState key={section}>{title} cannot be read. Correct the draft before review.</TerasEmptyState>;}
        return <TerasFieldStack key={section} spacing="compact"><TerasMetadataList shape="list" items={[{label:title,value:reviewSummary(value,titles)}]}/><TerasTechnicalDetails summary={`${title} details`} items={[]}><TerasFieldStack spacing="normal"><p>{description}</p><TechnicalPlanValue value={value} name={title} titles={titles}/></TerasFieldStack></TerasTechnicalDetails></TerasFieldStack>;
      })}</TerasFieldStack>
    </TerasContentTray>)}
  </TerasFieldStack>;
}

function reviewSummary(value:unknown,titles:Record<string,string>):string {
  if(value === null || value === undefined || value === "")return "Not recorded";
  if(typeof value === "boolean")return value?"Yes":"No";
  if(typeof value === "string")return value.length>160?value.slice(0,157)+"…":titles[value]??value;
  if(Array.isArray(value))return value.length?`${value.length} ${value.length===1?"entry":"entries"} · ${value.slice(0,2).map((item,index)=>technicalPlanEntryName(item,index,titles)).join(" · ")}${value.length>2?" · more in details":""}`:"No entries recorded";
  if(typeof value === "object"){
    const record=value as Record<string,unknown>;
    if(typeof record.summary === "string" && record.summary)return reviewSummary(record.summary,titles);
    const parts=Object.entries(record).slice(0,3).map(([key,item])=>`${technicalPlanDisplayLabel(key)}: ${Array.isArray(item)?`${item.length} entries`:typeof item === "boolean"?item?"Yes":"No":typeof item === "string"?reviewSummary(item,titles):item==null?"Not recorded":"Recorded details"}`);
    return parts.join(" · ")||"Not recorded";
  }
  return String(value);
}
