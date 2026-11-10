"use client";
import {effectiveModelLabel} from "../../governed-ai/model-selection.ts";
import {useEffect,useRef} from "react";
import { TerasActionButton,TerasActionRow,TerasContentRegion,TerasContentTray,TerasEmptyState,TerasFieldStack,TerasLoadingState,TerasNoteField,TerasPanel,TerasPanelHeader,TerasSegmentedControl,TerasTechnicalDetails } from "@/teras";
import type { useSourceAssistant } from "../live-runtime/use-source-assistant.ts";
import styles from "./source-editor-workspace.module.css";
export function SourceAssistantPanel({assistant,disabled}:{assistant:ReturnType<typeof useSourceAssistant>;disabled:boolean}) {
 const a=assistant,end=useRef<HTMLDivElement>(null);
 useEffect(()=>{const root=end.current?.closest<HTMLElement>("[data-teras-content-region]");if(!root)return;let follow=true;
  const bottom=()=>{root.scrollTop=root.scrollHeight;};
  const scroll=()=>{follow=root.scrollTop+root.clientHeight>=root.scrollHeight-8;};
  bottom();const observer=new ResizeObserver(()=>{if(follow)bottom();});observer.observe(root);root.addEventListener("scroll",scroll);
  return()=>{observer.disconnect();root.removeEventListener("scroll",scroll);};
 },[a.turns.length,a.pending,!!a.proposal,!!a.error]);
 return <TerasPanel role="region" aria-label="Source AI assistant" className={styles.assistantPane} fit="fill" layout="header-body-footer" overflow="hidden" spacing="compact" treatment="neutral">
  <TerasPanelHeader kicker="AI assistant" title="Source assistant" />
  <TerasContentRegion className={styles.conversationFrame} fill scroll role="region" aria-label="Source AI conversation" tabIndex={0}>
   <TerasFieldStack spacing="compact">
    <TerasContentTray kicker="Included files" className={styles.compactGroup}><TerasTechnicalDetails summary={`${a.paths.length} ${a.paths.length===1?"file":"files"} in AI context`} items={a.paths.map(path=>({label:"Selected current text",value:path}))}/></TerasContentTray>
    {!a.turns.length?<p className={styles.message}>Ask about selected files or request changes. Includes unsaved text; nothing is sent until you ask.</p>:null}
    {a.turns.map((turn,index)=><TerasContentTray key={index} kicker={turn.role==="operator"?"You":"Assistant"}><p className={styles.message}>{turn.text}</p></TerasContentTray>)}
    {a.pending?<TerasLoadingState label="Waiting for AI…" skeleton="details" />:null}
    {a.error?<TerasEmptyState>{a.error}</TerasEmptyState>:null}
    {a.proposal?<TerasContentTray kicker="Review proposed files"><TerasFieldStack spacing="compact">
      {a.proposal.reply.edits.map(edit=><TerasActionButton key={edit.path} emphasis="secondary" aria-pressed={a.reviewPath===edit.path} onClick={()=>a.setReviewPath(edit.path)}>{edit.content===null?"Delete":a.proposal!.reply.created_paths.includes(edit.path)?"Create":"Review"} {edit.path.split("/").at(-1)}</TerasActionButton>)}
      {a.stale?<TerasEmptyState>Your draft changed after this proposal. Ask again; your newer edits are preserved.</TerasEmptyState>:null}
      <TerasActionRow><TerasActionButton disabled={disabled||a.pending||a.stale} onClick={a.apply}>Apply to draft</TerasActionButton><TerasActionButton emphasis="secondary" disabled={a.pending} onClick={a.reject}>Reject proposal</TerasActionButton></TerasActionRow>
    </TerasFieldStack></TerasContentTray>:null}
    {a.undoAvailable?<TerasContentTray kicker="Applied to local draft" className={styles.compactGroup}><TerasActionButton emphasis="secondary" disabled={disabled||a.pending} onClick={a.undo}>Undo AI changes</TerasActionButton></TerasContentTray>:null}
    {a.reply?<TerasTechnicalDetails items={[...(a.reply.evidence.effective_selection?[{label:"Actual model and effort",value:effectiveModelLabel(a.reply.evidence.effective_selection)}]:[]),{label:"Permission profile",value:a.reply.evidence.profile_id},{label:"Model audit",value:a.reply.evidence.audit_ref},{label:"Context receipt",value:a.reply.evidence.context_ref}]} />:null}
    <div ref={end}/>
   </TerasFieldStack>
  </TerasContentRegion>
  <div className={styles.assistantFooter}><TerasFieldStack spacing="compact">
   <TerasContentTray kicker="Your request" className={styles.composer}><TerasSegmentedControl ariaLabel="Assistant intent" value={a.mode} onValueChange={value=>a.setMode(value as "ask"|"edit")} options={[{value:"ask",label:"Ask / explain"},{value:"edit",label:"Propose edits"}]} />
   <TerasNoteField label="Message to source assistant" value={a.prompt} onValueChange={a.setPrompt} placeholder={a.mode==="ask"?"Explain, review, or help me understand…":"Describe the change to selected files…"} minimumHeight="short" maxLength={8000} readOnly={a.pending} />
   <TerasActionRow><TerasActionButton disabled={disabled||a.pending||!a.prompt.trim()||!a.paths.length||!!a.retry} onClick={()=>void a.send()}>{a.mode==="ask"?"Ask assistant":"Propose changes"}</TerasActionButton>
    {a.pending?<TerasActionButton emphasis="secondary" onClick={a.stopWaiting}>Stop waiting</TerasActionButton>:null}
    {a.retry?<><TerasActionButton disabled={disabled||a.pending} onClick={()=>void a.retryOriginal()}>Retry original request</TerasActionButton><TerasActionButton emphasis="secondary" disabled={a.pending} onClick={a.dismissRetry}>Start another request</TerasActionButton></>:null}
   </TerasActionRow></TerasContentTray>
  </TerasFieldStack></div>
 </TerasPanel>;
}
