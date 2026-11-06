"use client";
import {TerasStatusItem,TerasList,TerasDialog,TerasMetadataList,TerasReadoutField,TerasTechnicalDetails,TerasFieldStack,TerasContentTray} from "@/teras";
import type {ModelProfileCheckProjection,ModelProfileRecord} from "../../../read-model/types/model-operations-types.ts";
import {modelReadinessLabel,modelReadinessTone} from "../../shared/model-profile-display-model.ts";
import {modelProfileCheckMetadata,modelProfileInspectorProjection} from "./model-profile-inspector-view-model.ts";
export type ModelProfileInspector="latest-audit"|"policy"|"runtime";
export function ModelProfileCheckDialog({check,onClose}:{check:ModelProfileCheckProjection|null;onClose:()=>void}) {
  const facts=check ? modelProfileCheckMetadata(check):[];
  return <TerasDialog contentOverflow="auto" height="content" width="standard" open={Boolean(check)} onClose={onClose}
    kicker={check?.label??"Permission check"} title="Model Profile Check" description={check?.detail??""}>
    {check ? <TerasFieldStack spacing="normal"><TerasMetadataList items={facts.slice(0,2+check.facts.length)} /><TerasTechnicalDetails items={facts.slice(2+check.facts.length)} /></TerasFieldStack> : null}
  </TerasDialog>;
}
export function ModelProfileInspectorDialog({inspector,onClose,profile}:{inspector:ModelProfileInspector|null;onClose:()=>void;profile:ModelProfileRecord}) {
  const {bounded,details,technical}=modelProfileInspectorProjection(profile,inspector);
  const titles={policy:"Profile policy",runtime:bounded?"Activation evidence":"Runtime evidence","latest-audit":bounded?"Profile change evidence":"Latest audit"};
  return <TerasDialog contentOverflow="auto" height="content" width="standard" open={Boolean(inspector)} onClose={onClose}
    kicker={inspector?titles[inspector]:"Evidence"} title="Model Profile Inspector"
    description={bounded ? "These are reported policy facts. They do not prove a live model connection or an AI invocation." : "Inspect the reported facts and their source."}>
    <TerasFieldStack spacing="normal">
      <TerasMetadataList items={details} />
      {inspector==="policy" ? <>
        <TerasReadoutField fit="content" label="Permitted workflows" value={profile.policy.allowedCallers.join("\n")||"None listed"} />
        {!bounded ? <TerasReadoutField fit="content" label="Allowed data" value={profile.policy.allowedDataScope.join(" / ")||"Not reported"} />:null}
      </>:null}
      {inspector==="runtime" ? <TerasList>{profile.runtime.gates.map((gate,index)=><TerasStatusItem key={gate.id} tone={modelReadinessTone(gate.state)} detail={gate.detail}
        index={String(index+1).padStart(2,"0")} label={gate.label} status={modelReadinessLabel(gate.state)} />)}</TerasList>:null}
      {bounded && inspector==="latest-audit" ? <TerasContentTray kicker="Scope" description="A profile change is separate from model activity. Absence here does not mean no AI requests have run." />:null}
      <TerasTechnicalDetails items={technical} />
    </TerasFieldStack>
  </TerasDialog>;
}
