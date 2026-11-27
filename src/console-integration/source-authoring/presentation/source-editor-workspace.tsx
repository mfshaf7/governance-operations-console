"use client";
import { useEffect, useRef, useState } from "react";
import { TerasLoadingState,TerasActionButton,TerasActionRow,TerasCodeEditor,TerasContentRegion,TerasContentTray,TerasDraftCloseGuardDialog,TerasEmptyState,TerasFieldStack,TerasMetadataList,TerasModalShell,TerasNoteField,TerasPanel,TerasPanelHeader,TerasSegmentedControl,TerasTextField } from "@/teras";
import { byteLength,sourceSectionLimits,type SourceDraft,type SourceEditorTarget } from "../source-editor-contract.ts";
import { sourceBufferOperations } from "../source-editor-model.ts";
import { useSourceEditor } from "../live-runtime/use-source-editor.ts";
import { useSourceAssistant } from "../live-runtime/use-source-assistant.ts";
import { SourceFileExplorer } from "./source-file-explorer.tsx";
import { SourceImportPanel } from "./source-import-panel.tsx";
import { SourcePreviewPanel } from "./source-preview-panel.tsx";
import { SourceAssistantPanel } from "./source-assistant-panel.tsx";
import styles from "./source-editor-workspace.module.css";

export function SourceEditorWorkspace({target,onClose,onSaved,onReviewed}:{target:SourceEditorTarget;onClose:()=>void;onSaved:(draft:SourceDraft)=>void;onReviewed:(draft:SourceDraft)=>void}) {
 const runtime=useSourceEditor(target,onSaved),current=runtime.data,assistant=useSourceAssistant(target,runtime);
 const [assistantOpen,setAssistantOpen]=useState(true),[mode,setMode]=useState<"edit"|"diff">("edit");
 const [previewLayout,setPreviewLayout]=useState<"none"|"preview"|"split">("none");
 const [importOpen,setImportOpen]=useState(false),[guard,setGuard]=useState<"close"|"reload"|null>(null),[showDetails,setShowDetails]=useState(false);
 const [retainedPath, setRetainedPath] = useState<string | null>(null);
 const [sectionLine, setSectionLine] = useState("1");
 const retained = runtime.retained;
 const retainedFiles = retained?.draft.change_set.operations ?? [];
 const retainedFile = retainedFiles.find(file => file.path === retainedPath) ?? retainedFiles[0];
 const buffer=current?.buffers.find(row=>row.path===current.selected),inspectedBaseline=useRef<string|null>(null);
 useEffect(()=>{const key=`${current?.current.revision}:${current?.selected}`;if(current?.selected&&buffer&&buffer.baseline===undefined&&runtime.editable&&inspectedBaseline.current!==key){inspectedBaseline.current=key;void runtime.select(current.selected);}},[current?.selected,current?.current.revision,buffer?.baseline,runtime.editable]);
 const operations=current?sourceBufferOperations(current.buffers):[];
 const paths=retained ? retainedFiles.map(file => file.path) : current?[...new Set([...operations.map(row=>row.path),...current.paths])]:[];
 const requestClose=()=>{if(!runtime.pending)runtime.dirty||runtime.uncertain||assistant.pending||assistant.proposal?setGuard("close"):onClose();};
 const requestReload=()=>{if(runtime.dirty||runtime.uncertain||assistant.proposal)setGuard("reload");else void runtime.reload();};
 const save=()=>void runtime.save();
 const proposed=assistant.proposal?.reply.edits.find(edit=>edit.path===assistant.reviewPath),proposedOriginal=assistant.proposal?.snapshot.files.find(file=>file.path===assistant.reviewPath);
 const editorPath=retainedFile?.path??proposed?.path??buffer?.path,reviewing=!!proposed;
 const sectionFile = !retained && !reviewing && current?.selected &&
   (buffer?.patch || runtime.sectionPath === current.selected) ? current.selected : null;
 const region = buffer?.region;
 const editorMaxBytes = sectionFile ? sourceSectionLimits.textBytes :
   target.sectionEditing && buffer?.expectedDigest && !reviewing ? sourceSectionLimits.fileBytes : undefined;
 useEffect(() => { setSectionLine(String(region?.start_line ?? 1)); }, [sectionFile, region?.start_line]);
 useEffect(()=>{if(assistant.reviewPath)setPreviewLayout("none");},[assistant.reviewPath,assistant.proposal?.reply.request_id]);
 const previewActive=!retained&&previewLayout!=="none",previewOnly=!retained&&previewLayout==="preview";
 const viewOptions=[{value:"edit",label:"Edit text"},{value:"diff",label:"Review diff"},...(target.preview?[{value:"preview",label:"Preview"},{value:"split",label:"Split view"}]:[])];
 return <>
  <TerasModalShell width="viewport" height="fill" bodyLayout="fill" kicker="Source workspace" title={target.label} surfaceId="source-editor-workspace" onClose={requestClose}
   description="Edit files, import your work, or ask AI for reviewable changes. Your draft stays separate from source publication."
   footer={retained ? undefined : <TerasActionRow>
    <TerasActionButton disabled={!!retained||!runtime.editable||!operations.length||!runtime.dirty&&!!current?.draft} onClick={save}>Save private draft</TerasActionButton>
    {runtime.uncertain?<TerasActionButton disabled={runtime.pending||!!runtime.blocked} onClick={save}>Retry original save</TerasActionButton>:null}
    <TerasActionButton emphasis="secondary" disabled={!!retained||runtime.pending||!!runtime.error||runtime.dirty||runtime.uncertain||!current?.draft||current.current.state!=="draft-ready"} onClick={()=>current?.draft&&onReviewed(current.draft)}>Mark saved digest inspected</TerasActionButton>
    <TerasActionButton emphasis="secondary" disabled={runtime.pending||assistant.pending||!!runtime.blocked} onClick={requestReload}>Reload saved source draft</TerasActionButton>
   </TerasActionRow>}
   modalAttributes={{onKeyDown:event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="s"){event.preventDefault();if(!retained&&runtime.editable&&operations.length)save();}}}}>
   <div className={styles.workspace}>
    <TerasPanel className={styles.status} spacing="compact" frame="padded" treatment="state" tone={runtime.error?"danger":runtime.uncertain?"warn":"info"}>
     <TerasPanelHeader actionsLayout="inline" kicker={runtime.pending?"Working":runtime.dirty&&!retained?"Unsaved local changes":"Source status"} title={runtime.blocked==="expired"?"Console access expired":runtime.blocked==="dirty"?"Repository has uncommitted changes":retained?"Review previous draft":runtime.error?current?"Source action needs attention":"Source workspace unavailable":current?runtime.dirty?`${operations.length} changed ${operations.length===1?"file":"files"}`:"Ready to work":"Loading source workspace"}
      description={runtime.error??runtime.notice??undefined}
      actions={retained ? undefined : <TerasActionRow><TerasActionButton emphasis="secondary" aria-expanded={assistantOpen} onClick={()=>setAssistantOpen(!assistantOpen)}>{assistantOpen?"Hide AI assistant":"Show AI assistant"}</TerasActionButton><TerasActionButton emphasis="secondary" onClick={()=>setShowDetails(!showDetails)}>{showDetails?"Hide saved draft details":"Show saved draft details"}</TerasActionButton></TerasActionRow>} />
     {runtime.pending?<TerasLoadingState inline={!!current} label={current?"Reading or saving source…":"Loading source workspace…"} skeleton="details"/>:null}
     {runtime.blocked?<TerasActionRow><TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={()=>void runtime.checkWorkspace()}>Check source workspace</TerasActionButton></TerasActionRow>:null}
     {target.retainedDraftAvailable && current ? <TerasContentTray kicker="Draft recovery" title="Saved work from the previous workspace"
       description={retained ? (retained.sameRepository ? "Review the saved files. Recovery checks them against the current source before adding them to a new draft." : "This draft belongs to the previous repository. Its files are available for reference.") : "You can review the saved files and recover compatible changes into this workspace."}>
       <TerasActionRow>
         {retained ? <>
           <TerasActionButton disabled={!retained.sameRepository || !runtime.editable || runtime.dirty || !!current.draft} onClick={() => void runtime.recoverRetained()}>Check and Recover Files</TerasActionButton>
           <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={runtime.closeRetained}>Back to Current Draft</TerasActionButton>
         </> : <TerasActionButton emphasis="secondary" disabled={runtime.pending || runtime.uncertain || assistant.pending} onClick={() => void runtime.reviewRetained()}>Review Previous Draft</TerasActionButton>}
       </TerasActionRow>
     </TerasContentTray> : null}
     {current&&showDetails&&!retained?<TerasContentTray className={styles.savedDetails}><TerasMetadataList items={[{label:"Session",value:current.current.sessionId},{label:"Source base",value:current.base},{label:"Source revision",value:current.current.revision},{label:"Saved draft digest",value:current.draft?.digest??"No draft saved"},{label:"Draft origin",value:current.draft?.provenance?.origin==="operator-amended-model"?"Operator amended a model proposal":"Operator-reviewed source draft"},{label:"Local changes",value:`${operations.length} operations / ${operations.reduce((n,row)=>n+byteLength(row.content??""),0)} UTF-8 bytes`}]} /></TerasContentTray>:null}
    </TerasPanel>
    <div className={`${styles.columns} ${!assistantOpen||retained?styles.withoutAssistant:""}`}>
     <TerasPanel fit="fill" layout="header-body" overflow="hidden" spacing="normal" treatment="neutral">
      <TerasPanelHeader kicker="Files" title={current?`${paths.length} source ${paths.length === 1 ? "file" : "files"}`:"Source files"} />
      <TerasContentRegion fill scroll role="region" aria-label="Source files" tabIndex={0}><TerasFieldStack spacing="normal">
       <TerasContentTray aria-label="File browser" className={styles.compactGroup}><SourceFileExplorer paths={paths} selected={retainedFile?.path??current?.selected??null} operations={retained?retainedFiles:operations} scope={target.scope} truncated={!retained&&(current?.truncated??false)} editable={!retained&&runtime.editable} pending={runtime.pending}
        contextPaths={retained?[]:assistant.paths} contextPending={assistant.pending} onContext={retained?undefined:assistant.togglePath}
        sectionPaths={current?.buffers.filter(file=>file.patch).map(file=>file.path)}
        onSelect={path=>{if(retained){setRetainedPath(path);return;}assistant.setReviewPath(null);void runtime.select(path);}}
        onCreate={async(path,folder)=>{assistant.setReviewPath(null);return folder?runtime.addFolder(path):runtime.add(path);}}/></TerasContentTray>
       {retained ? null : <>{current?.truncated?<TerasEmptyState>The source tree is partial. Refine the source scope before adding unseen paths.</TerasEmptyState>:null}
       <div className={styles.importTools}><TerasActionButton emphasis="secondary" disabled={!runtime.editable} aria-expanded={importOpen} onClick={()=>setImportOpen(!importOpen)}>{importOpen?"Hide import":"Import files or folder"}</TerasActionButton>
       {importOpen?<SourceImportPanel scope={target.scope} disabled={!runtime.editable} onImport={files=>runtime.importFiles(files).then(success=>{if(success)setImportOpen(false);})}/>:null}</div>
       {current?<TerasContentTray kicker="Private draft" title="Change details"><TerasNoteField label={current.current.state==="draft-ready"?"Original source objective (retained by the service)":"Source objective"} minimumHeight="short" value={current.objective} onValueChange={runtime.setObjective} readOnly={!!target.objectiveReadOnly||current.current.state==="draft-ready"||!runtime.editable} maxLength={target.objectiveMax}/>
       <TerasTextField label="Commit message for the saved draft" helper="Briefly describe your changes (at least 10 characters). Saving does not create a commit." value={current.message} onValueChange={runtime.setMessage} maxLength={120} disabled={!runtime.editable}/></TerasContentTray>:null}</>}
      </TerasFieldStack></TerasContentRegion>
     </TerasPanel>
     <TerasPanel fit="fill" layout="header-body" overflow="hidden" spacing="normal" treatment="neutral">
      <TerasPanelHeader kicker={retained?"Previous draft":previewOnly?"Preview":reviewing?"AI proposal — not applied":sectionFile?"Section editor":buffer?.deleted?"Explicit deletion":"Editor"} title={previewOnly?"Application preview":editorPath??sectionFile??"Select a file"} description={retainedFile?`Saved ${retainedFile.action === "delete" ? "deletion" : retainedFile.patch ? "section edit" : "text"} from the previous workspace. This view is read-only.`:previewOnly?"The running project stays separate from your local source draft.":reviewing?proposed.content===null?"This proposal deletes the selected file. Review before applying it to your draft.":"Review the diff, then apply or reject it in AI assistant.":sectionFile?"Edit one section of this file. The rest of the file stays at its approved revision.":buffer?`${byteLength(buffer.content)} UTF-8 bytes${buffer.content.startsWith("\uFEFF")?" / BOM preserved":""}. Ctrl/Cmd+S saves; Ctrl/Cmd+F finds text.`:"Open a source file, add a path or import text to begin."}/>
      <div className={styles.editor}>
       {retained ? null : <TerasContentTray role="toolbar" aria-label="Source editing tools" className={styles.editorToolbar}><TerasFieldStack spacing="compact"><div className={styles.editorToolRow}>
        <TerasSegmentedControl ariaLabel="Source view" value={previewActive?previewLayout:reviewing?"diff":mode} onValueChange={value=>{if(value==="preview"||value==="split"){setPreviewLayout(value);}else{setPreviewLayout("none");assistant.setReviewPath(null);setMode(value as "edit"|"diff");}}} options={viewOptions} />
        {!previewOnly?<TerasActionRow>
        {!sectionFile ? <TerasActionButton emphasis="secondary" disabled={!runtime.editable||!buffer||buffer.deleted||reviewing} onClick={runtime.remove}>Delete file explicitly</TerasActionButton> : null}
        <TerasActionButton emphasis="secondary" disabled={!runtime.editable||!buffer?.changed||reviewing} onClick={()=>void runtime.undoChange()}>Undo file change</TerasActionButton>
        </TerasActionRow>:null}
       </div>
       {sectionFile ? <TerasContentTray title={region ? `Source lines ${region.start_line}–${region.end_line} of ${region.total_lines}` : "Source section"}
         description={buffer?.changed ? "Review the before and after text in Review diff. Undo the file change to load another section." : "Load up to 40 lines at a time."}>
         <div className={styles.sectionControls}>
           <TerasTextField label="Starting line" density="compact" inputMode="numeric" value={sectionLine} onValueChange={setSectionLine}
             disabled={!runtime.editable||!!buffer?.changed} maxLength={6} />
           <TerasActionButton emphasis="secondary" disabled={!runtime.editable||!!buffer?.changed||!/^[1-9]\d{0,5}$/.test(sectionLine)}
             onClick={() => void runtime.openSection(sectionFile, Number(sectionLine))}>Load section</TerasActionButton>
         </div>
       </TerasContentTray> : null}
       </TerasFieldStack></TerasContentTray>}
       <div className={styles.sourceCanvas} data-layout={retained?"none":previewLayout}><div className={styles.codePane} hidden={previewOnly}>
       {retainedFile ? <TerasCodeEditor key={`retained:${retainedFile.path}`} path={retainedFile.path} value={retainedFile.content??""} original={retainedFile.patch?.before??""} diff={!!retainedFile.patch} readOnly onValueChange={runtime.edit} /> : editorPath?<TerasCodeEditor key={`${editorPath}:${reviewing?assistant.proposal?.reply.request_id:buffer?.patch?.offset_utf16??"working"}`} path={editorPath} value={reviewing?proposed.content??"":buffer?.deleted?"":buffer?.content??""} original={reviewing?proposedOriginal?.content??"":buffer?.baseline??""} diff={reviewing||mode==="diff"&&buffer?.baseline!==undefined} readOnly={reviewing||!runtime.editable||!!buffer?.deleted||buffer?.baseline===undefined} onValueChange={runtime.edit} maxBytes={editorMaxBytes} startingLine={region?.start_line}/>:runtime.pending?<TerasLoadingState label="Loading source text…" skeleton="details"/>:<TerasEmptyState>{sectionFile?"Choose a starting line to load source text.":"Source text is loaded on selection."}</TerasEmptyState>}
       </div>{target.preview?<div className={styles.previewPane} hidden={!previewActive}><SourcePreviewPanel adapter={target.preview} active={previewActive} hasDraftChanges={operations.length>0&&["not-started","draft-ready","failed","cancelled"].includes(current?.current.state??"")}/></div>:null}</div>
      </div>
     </TerasPanel>
     {assistantOpen&&!retained?<SourceAssistantPanel assistant={assistant} disabled={!runtime.editable}/>:null}
    </div>
   </div>
  </TerasModalShell>
  <TerasDraftCloseGuardDialog open={guard!==null} kicker="Unsaved source work" title="Discard local edits?" description="Saved source drafts and acknowledged conversations stay in private storage. Unsaved buffers and unreviewed AI proposals will be lost. An AI request may still finish after you stop waiting." leaveLabel={guard==="reload"?"Discard buffers and reload":"Discard buffers and close"} onKeepEditing={()=>setGuard(null)} onLeave={()=>{const action=guard;setGuard(null);assistant.stopWaiting();assistant.reject();if(action==="reload")void runtime.reload();else onClose();}}/>
 </>;
}
