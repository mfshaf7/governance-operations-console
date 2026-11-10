"use client";
import { useEffect, useRef, useState } from "react";
import { assertAssistantReply, assertAssistantRequest, type AssistantReply, type AssistantRequest, type AssistantTurn } from "../source-assistant-contract.ts";
import type { SourceEditorTarget } from "../source-editor-contract.ts";
import { sourceAssistantFingerprint } from "../source-editor-model.ts";
import type { useSourceEditor } from "./use-source-editor.ts";

type Runtime = ReturnType<typeof useSourceEditor>;
export type AssistantSnapshot = Awaited<ReturnType<Runtime["assistantSnapshot"]>>;
type Proposal = { reply: AssistantReply; snapshot: AssistantSnapshot };
export function useSourceAssistant(target: SourceEditorTarget, runtime: Runtime) {
 const [prompt,setPrompt]=useState(""),[mode,setMode]=useState<"ask"|"edit">("ask"),[contextPaths,setContextPaths]=useState<string[]|null>(null);
 const [turns,setTurns]=useState<AssistantTurn[]>([]),[proposal,setProposal]=useState<Proposal|null>(null),[reply,setReply]=useState<AssistantReply|null>(null);
 const [pending,setPending]=useState(false),[error,setError]=useState<string|null>(null),[reviewPath,setReviewPath]=useState<string|null>(null);
 const [retry,setRetry]=useState<{request:AssistantRequest;snapshot:AssistantSnapshot}|null>(null);
 const [undo,setUndo]=useState<ReturnType<Runtime["applyAssistant"]>|null>(null);
 const alive=useRef(true),busy=useRef(false),controller=useRef<AbortController|null>(null),latest=useRef(runtime);latest.current=runtime;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort();};},[target.endpoint]);
 const paths=contextPaths??(runtime.data?.selected?[runtime.data.selected]:[]);
 async function dispatch(request:AssistantRequest,snapshot:AssistantSnapshot){
  controller.current=new AbortController();const timeout=setTimeout(()=>controller.current?.abort(),210000);
  try{
   const response=await fetch(`${target.endpoint}/assist`,{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify(request),signal:controller.current.signal});
   const body=await response.json();if(!response.ok||body.mode!=="live"||body.error||!body.projection)throw Error(body.error??"The source assistant is unavailable. Your draft was not changed.");
   const value=assertAssistantReply(body.projection,request);if(value.session_id!==target.current.sessionId)throw Error("The assistant returned another source session.");
   const missing=value.created_paths.filter(path=>!snapshot.files.some(file=>file.path===path)).map(path=>({path,content:"",expectedDigest:null,baseline:null,changed:false,deleted:true}));
   const guardFiles=[...snapshot.files,...missing];
   const guarded={...snapshot,files:guardFiles,fingerprint:sourceAssistantFingerprint(snapshot.files,guardFiles)};
   if(alive.current){setReply(value);setProposal(value.edits.length?{reply:value,snapshot:guarded}:null);setReviewPath(value.edits[0]?.path??null);setTurns([...request.conversation,{role:"operator",text:request.prompt},{role:"assistant",text:value.message}].slice(-8) as AssistantTurn[]);setRetry(null);setPrompt("");}
  }catch(caught){if(alive.current){setRetry({request,snapshot});setError(caught instanceof Error&&caught.name!=="AbortError"?caught.message:"Stopped waiting. The original request may still finish; retry it before starting a replacement.");}}
  finally{clearTimeout(timeout);if(alive.current)setPending(false);busy.current=false;}
 }
 async function send(original=false){
  if(busy.current)return;busy.current=true;setPending(true);setError(null);
  if(original&&retry){await dispatch(retry.request,retry.snapshot);return;}
  try{
   const snapshot=await latest.current.assistantSnapshot(paths);
   const sameProposal=proposal&&latest.current.data&&sourceAssistantFingerprint(latest.current.data.buffers,proposal.snapshot.files)===proposal.snapshot.fingerprint&&proposal.snapshot.current.revision===snapshot.current.revision;
   if(sameProposal&&proposal.reply.edits.some(edit=>edit.content===null))throw Error("Reject or apply the deletion proposal before requesting another revision.");
   let files=snapshot.files.map(file=>{const previous=sameProposal?proposal.reply.edits.find(edit=>edit.path===file.path):null;return {path:file.path,content:previous?.content??file.content,expected_digest:file.expectedDigest};});
   if(sameProposal){
     const additions=proposal.reply.edits.filter(edit=>!files.some(file=>file.path===edit.path)&&edit.content!==null);
     files=[...files,...additions.map(edit=>({path:edit.path,content:edit.content!,expected_digest:null}))];
     snapshot.files=[...snapshot.files,...proposal.snapshot.files.filter(file=>additions.some(edit=>edit.path===file.path))];
     snapshot.fingerprint=sourceAssistantFingerprint(latest.current.data!.buffers,snapshot.files);
   }
   const request=assertAssistantRequest({schema_version:1,request_id:`source-assistant:${crypto.randomUUID()}`,snapshot_id:crypto.randomUUID(),expected_revision:snapshot.current.revision,expected_change_set_digest:snapshot.current.attempt?.digest??null,mode,prompt:prompt.trim(),conversation:turns,files});
   await dispatch(request,snapshot);
  }catch(caught){if(alive.current){setError(caught instanceof Error?caught.message:"Context could not be prepared.");setPending(false);}busy.current=false;}
 }
 const current=runtime.data;
 const stale=!!proposal&&(!current||current.current.revision!==proposal.snapshot.current.revision||sourceAssistantFingerprint(current.buffers,proposal.snapshot.files)!==proposal.snapshot.fingerprint);
 return {prompt,setPrompt,mode,setMode,paths,turns,pending,error,reply,proposal,reviewPath,setReviewPath,stale,retry,
  send:()=>send(),retryOriginal:()=>send(true),dismissRetry:()=>{setRetry(null);setError("The previous request may still finish. No reply is applied automatically.");},stopWaiting:()=>controller.current?.abort(),
  togglePath:(path:string)=>setContextPaths(current=>{const existing=current??paths;return existing.includes(path)?existing.filter(item=>item!==path):[...existing,path];}),
  clearContext:()=>setContextPaths(null),
  apply:()=>{if(!proposal)return;try{const token=runtime.applyAssistant(proposal.snapshot,proposal.reply.edits);setUndo(token);setProposal(null);setReviewPath(null);setError(null);}catch(caught){setError((caught as Error).message);}},
  reject:()=>{setProposal(null);setReviewPath(null);},
  undoAvailable:!!undo,undo:()=>{if(!undo)return;try{runtime.undoAssistant(undo);setUndo(null);setError(null);}catch(caught){setError((caught as Error).message);}},
 };
}
