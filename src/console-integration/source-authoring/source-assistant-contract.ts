import {assertEffectiveModelSelection,type EffectiveModelSelection} from "../governed-ai/model-selection.ts";
import { sourceObject, sourceExact, sourceId, sourceDate, sourceDigest, sourceText, sourcePath, sourceString, byteLength } from "./source-editor-contract.ts";
export type AssistantFile = { path: string; content: string; expected_digest: string | null };
export type AssistantTurn = { role: "operator" | "assistant"; text: string };
export type AssistantRequest = { schema_version: 1; request_id: string; snapshot_id: string; expected_revision: string; expected_change_set_digest: string | null; mode: "ask" | "edit"; prompt: string; conversation: AssistantTurn[]; files: AssistantFile[] };
export type AssistantReply = { schema_version: 1; request_id: string; snapshot_id: string; session_id: string; revision: string; message: string; created_paths: string[]; edits: Array<{ path: string; content: string | null }>; evidence: { profile_id: string; audit_ref: string; context_ref: string; effective_selection?: EffectiveModelSelection }; replayed: boolean };
export function assertAssistantRequest(value: unknown): AssistantRequest {
 const item = sourceObject(value); sourceExact(item,["schema_version","request_id","snapshot_id","expected_revision","expected_change_set_digest","mode","prompt","conversation","files"]);
 if(item.schema_version!==1||!["ask","edit"].includes(String(item.mode))||!Array.isArray(item.conversation)||item.conversation.length>8||!Array.isArray(item.files)||!item.files.length||item.files.length>48)throw Error("Choose supported source files and a bounded assistant request.");
 sourceId(item.request_id);sourceId(item.snapshot_id);sourceDate(item.expected_revision);if(item.expected_change_set_digest!==null)sourceDigest(item.expected_change_set_digest);sourceString(item.prompt,8000);
 for(const turn of item.conversation){const t=sourceObject(turn);sourceExact(t,["role","text"]);if(!["operator","assistant"].includes(String(t.role)))throw Error("Invalid conversation role.");sourceString(t.text,12000);}
 const files=item.files.map(file=>{const f=sourceObject(file);sourceExact(f,["path","content","expected_digest"]);sourcePath(f.path);sourceText(f.content);if(f.expected_digest!==null)sourceDigest(f.expected_digest);return f;});
 if(new Set(files.map(f=>f.path)).size!==files.length||files.reduce((n,f)=>n+byteLength(String(f.content)),0)>262144||byteLength(JSON.stringify(value))>524288)throw Error("Selected context is too large. Choose fewer files; source is never silently truncated.");
 return item as AssistantRequest;
}
export function assertAssistantReply(value: unknown, request: AssistantRequest): AssistantReply {
 const item=sourceObject(value);sourceExact(item,["schema_version","request_id","snapshot_id","session_id","revision","message","created_paths","edits","evidence","replayed"]);
 if(item.schema_version!==1||item.request_id!==request.request_id||item.snapshot_id!==request.snapshot_id||item.revision!==request.expected_revision||typeof item.replayed!=="boolean"||!Array.isArray(item.edits)||item.edits.length>64||request.mode==="ask"&&item.edits.length)throw Error("The assistant reply does not match this source snapshot.");
 sourceId(item.session_id);sourceString(item.message,12000);if(!Array.isArray(item.created_paths)||item.created_paths.length>64||new Set(item.created_paths).size!==item.created_paths.length)throw Error("Invalid owner-proven new paths.");for(const path of item.created_paths)sourcePath(path);const seen=new Set();for(const value of item.edits){const edit=sourceObject(value);sourceExact(edit,["path","content"]);sourcePath(edit.path);if((!request.files.some(file=>file.path===edit.path)&&!item.created_paths.includes(edit.path))||item.created_paths.includes(edit.path)&&edit.content===null||seen.has(edit.path))throw Error("The assistant proposed a file outside the selected context.");seen.add(edit.path);if(edit.content!==null)sourceText(edit.content);}
 if(item.created_paths.some(path=>!seen.has(path)))throw Error("New-path evidence does not match the proposed files.");
 const evidence=sourceObject(item.evidence);if(Object.keys(evidence).some(key=>!["profile_id","audit_ref","context_ref","effective_selection"].includes(key)))throw Error("Unsupported assistant evidence.");sourceString(evidence.profile_id);sourceString(evidence.audit_ref,2048);sourceString(evidence.context_ref,2048);if(evidence.effective_selection!==undefined)assertEffectiveModelSelection(evidence.effective_selection,`${evidence.profile_id}/source_editor_assistance`);
 return item as AssistantReply;
}
