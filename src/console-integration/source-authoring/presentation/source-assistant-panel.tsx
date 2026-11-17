"use client";
import {effectiveModelLabel} from "../../governed-ai/model-selection.ts";
import {useEffect,useRef} from "react";
import { TerasActionButton,TerasActionRow,TerasAdvisorStatusBar,TerasContentRegion,TerasContentTray,TerasEmptyState,TerasFieldStack,TerasLoadingState,TerasNoteField,TerasNewConversationButton,TerasPanel,TerasPanelHeader,TerasSegmentedControl,TerasTechnicalDetails } from "@/teras";
import { useAgentConnectionStatus } from "@/agent-console";
import type { useSourceAssistant } from "../live-runtime/use-source-assistant.ts";
import styles from "./source-editor-workspace.module.css";
export function SourceAssistantPanel({assistant,disabled}:{assistant:ReturnType<typeof useSourceAssistant>;disabled:boolean}) {
 const {connection}=useAgentConnectionStatus();
 const a=assistant,end=useRef<HTMLDivElement>(null);
 useEffect(()=>{const root=end.current?.closest<HTMLElement>("[data-teras-content-region]");if(!root)return;let follow=true;
  const bottom=()=>{root.scrollTop=a.turns.length||a.pending||a.proposal||a.error?root.scrollHeight:0;};
  const scroll=()=>{follow=root.scrollTop+root.clientHeight>=root.scrollHeight-8;};
  bottom();const observer=new ResizeObserver(()=>{if(follow)bottom();});observer.observe(root);root.addEventListener("scroll",scroll);
  return()=>{observer.disconnect();root.removeEventListener("scroll",scroll);};
 },[a.turns.length,a.pending,!!a.proposal,!!a.error]);
 return <TerasPanel role="region" aria-label="Source AI assistant" className={styles.assistantPane} density="compact" fit="fill" layout="header-body-footer" overflow="hidden" spacing="tight" treatment="neutral">
  <div className={styles.assistantHeader}><TerasPanelHeader kicker="AI assistant" title="Source assistant" />
   <TerasAdvisorStatusBar connection={connection} conversationStatus={a.conversation.status}/>
  </div>
  <div className={styles.assistantBody}>
   <TerasContentRegion className={styles.assistantContext} scroll role="region" aria-label="Source AI included files">
    <TerasContentTray kicker="Included files" className={styles.compactGroup}><TerasTechnicalDetails summary={`${a.paths.length} ${a.paths.length===1?"file":"files"} in AI context`} items={a.paths.map(path=>({label:a.readOnlyPaths.includes(path)?"Read-only context":"May propose edits",value:<TerasFieldStack spacing="compact"><span>{path}</span><TerasSegmentedControl ariaLabel={`AI access for ${path}`} value={a.readOnlyPaths.includes(path)?"read":"edit"} disabled={a.pending||!!a.retry} onValueChange={value=>a.setFileAccess(path,value==="read")} options={[{value:"read",label:"Read only"},{value:"edit",label:"May edit"}]}/></TerasFieldStack>}))}/></TerasContentTray>
   </TerasContentRegion>
   <TerasContentTray className={styles.conversationFrame} fit="fill" title="Conversation" role="region" aria-label="Source AI conversation">
    <div className={styles.conversationLayout}>
    <TerasContentRegion className={styles.conversationMessages} fill scroll role="region" aria-label="Source AI messages" tabIndex={0}>
     <TerasFieldStack spacing="compact">
    {!a.turns.length?<p className={styles.message}>Ask about included files or request changes. Select relevant architecture, interfaces or design files when needed. Includes unsaved text; sending happens when you ask.</p>:null}
    {a.contextNotice?<small>{a.contextNotice}</small>:null}
    {a.conversation.hasEarlier||a.conversation.saveError||a.conversation.conflict?<TerasActionRow spacing="compact">
      {a.conversation.hasEarlier?<TerasActionButton emphasis="secondary" onClick={a.conversation.showEarlier}>Earlier messages</TerasActionButton>:null}
      {a.conversation.saveError&&!a.conversation.conflict?<TerasActionButton disabled={a.pending} emphasis="secondary" onClick={()=>void a.conversation.retry()}>Retry conversation save</TerasActionButton>:null}
      {!a.conversation.ready&&a.conversation.saveError?<TerasActionButton emphasis="secondary" onClick={a.conversation.useCurrentContextOnly}>Use current context only</TerasActionButton>:null}
      {a.conversation.conflict?<><TerasActionButton disabled={a.pending} emphasis="secondary" onClick={()=>void a.conversation.useServerCopy()}>Use server conversation</TerasActionButton><TerasActionButton disabled={a.pending} emphasis="secondary" onClick={()=>void a.conversation.keepBrowserEdits()}>Keep browser conversation</TerasActionButton></>:null}
    </TerasActionRow>:null}
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
    </div>
   </TerasContentTray>
  </div>
  <div className={styles.assistantFooter}><TerasFieldStack spacing="compact">
   <TerasContentTray className={styles.composer}><div className={styles.assistantIntent}><TerasSegmentedControl size="compact" ariaLabel="Assistant intent" value={a.mode} onValueChange={value=>a.setMode(value as "ask"|"edit")} options={[{value:"ask",label:"Ask / explain"},{value:"edit",label:"Propose edits"}]} /></div>
   <TerasNoteField density="compact" label="Message to source assistant" value={a.prompt} onValueChange={a.setPrompt} placeholder={a.mode==="ask"?"Explain, review, or help me understand…":"Describe the change to selected files…"} minimumHeight="short" maxLength={8000} readOnly={a.pending} />
   <TerasActionRow layout="split" end={<TerasActionRow><TerasActionButton disabled={disabled||a.pending||!a.conversation.ready||!a.prompt.trim()||!a.paths.length||!!a.retry} onClick={()=>void a.send()}>{a.mode==="ask"?"Ask assistant":"Propose changes"}</TerasActionButton>
    {a.pending?<TerasActionButton emphasis="secondary" onClick={a.stopWaiting}>Stop waiting</TerasActionButton>:null}
    {a.retry?<><TerasActionButton disabled={disabled||a.pending} onClick={()=>void a.retryOriginal()}>Retry original request</TerasActionButton><TerasActionButton emphasis="secondary" disabled={a.pending} onClick={a.dismissRetry}>Start another request</TerasActionButton></>:null}
   </TerasActionRow>}>
    <TerasNewConversationButton disabled={a.pending||!!a.retry||!a.conversation.ready} onClick={a.newConversation}/>
   </TerasActionRow></TerasContentTray>
  </TerasFieldStack></div>
 </TerasPanel>;
}
