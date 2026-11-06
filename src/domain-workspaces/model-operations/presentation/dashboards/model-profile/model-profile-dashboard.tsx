"use client";

import {useMemo,useState} from "react";
import {
  TerasActionButton,TerasActionRow,TerasContentFrame,TerasContentRegion,TerasContentTray,
  TerasDetailGrid,TerasEmptyState,TerasFieldStack,TerasList,TerasMetadataList,TerasModalShell,
  TerasPanel,TerasPanelHeader,TerasStatusItem,TerasStatusPill,TerasTechnicalDetails,
} from "@/teras";
import type {ModelProfileCheckProjection,ModelProfileRecord} from "../../../read-model/types/model-operations-types.ts";
import {ModelProfileCheckDialog,ModelProfileInspectorDialog,type ModelProfileInspector} from "../../dialogs/profile-inspector/model-profile-inspector-dialog.tsx";
import {modelConsumerEligibilityLabel,modelConsumerEligibilityTone,modelReadinessLabel,modelReadinessTone,modelProfileAvailabilityTone} from "../../shared/model-profile-display-model.ts";
import {modelProfileTechnicalMetadata,modelProfileBlockerMetadata,modelProfileDashboardFacts,modelProfileDashboardProjection,modelProfilePurpose,modelProfileTitle} from "./model-profile-dashboard-view-model.ts";
import {ModelProfileLifecycleDialog} from '../../workflows/profile-request/model-profile-lifecycle-dialog.tsx';
import {ModelProfileRequestHistoryDialog} from '../../dialogs/request-history/model-profile-request-history-dialog.tsx';
import type {ModelProfileRequestProjection} from '../../../live-runtime/model-operations-live-types.ts';

export function ModelProfileDashboard({onClose,onOpenRouting,profile,preview=false}:{onClose:()=>void;onOpenRouting?:()=>void;profile:ModelProfileRecord|null;preview?:boolean}) {
  const [activeCheck,setActiveCheck]=useState<ModelProfileCheckProjection|null>(null);
  const [activeInspector,setActiveInspector]=useState<ModelProfileInspector|null>(null);
  const [changeOpen,setChangeOpen]=useState(false),[recorded,setRecorded]=useState<ModelProfileRequestProjection|null>(null);
  const view=useMemo(()=>profile ? modelProfileDashboardProjection(profile):null,[profile]);
  if(!profile||!view)return null;
  const close=()=>{setActiveCheck(null);setActiveInspector(null);setChangeOpen(false);setRecorded(null);onClose();};
  return <>
    <TerasModalShell bodyLayout="fill" height="fill" width="large" surfaceId="model-profile-dashboard"
      kicker="Purpose profiles" title="Model Profile Dashboard" description="Understand this profile's permission, its workflows and any action required." onClose={close}>
      <TerasContentFrame fill variant="single-region">
        <TerasContentRegion fill scroll gap="normal" role="region" tabIndex={0} aria-label="Profile dashboard content" data-model-profile-dashboard="true">
          <TerasPanel frame="padded" treatment="neutral" spacing="normal">
            <TerasPanelHeader kicker="Profile overview" title={modelProfileTitle(profile)} description={modelProfilePurpose(profile)}
              actionsLayout="inline" actions={<TerasStatusPill tone={modelProfileAvailabilityTone(view.availability)}>{view.accessLabel}</TerasStatusPill>} />
            <TerasContentTray kicker="Profile scope"><TerasMetadataList items={modelProfileDashboardFacts(profile)} shape="line" treatment="chip" wrap /></TerasContentTray>
            <TerasActionRow><TerasActionButton emphasis="secondary" onClick={()=>setChangeOpen(true)}>Change profile policy</TerasActionButton></TerasActionRow>
            <TerasContentTray kicker={view.availability==="available" ? "Model configuration" : "Action needed"}>
              <TerasActionRow layout="split" end={onOpenRouting ? <TerasActionButton emphasis="primary" onClick={()=>{close();onOpenRouting();}}>Models & routing</TerasActionButton> : undefined}>
                <TerasFieldStack spacing="compact"><strong>{view.nextTitle}</strong><span>{view.nextDetail}</span></TerasFieldStack>
              </TerasActionRow>
            </TerasContentTray>
          </TerasPanel>
          <TerasDetailGrid variant="balanced">
            <TerasPanel frame="padded" treatment="neutral" spacing="normal">
              <TerasPanelHeader kicker="Permission checks" title="What permits or blocks use" description={view.summaryOnly ? "These checks describe the policy and its activation. They do not test a live model connection." : "Open a check for its reported conditions and evidence."}
                statusLabel={`${view.checks.length} checks`} statusTone="info" />
              <TerasFieldStack spacing="normal">
                {view.checks.map(check=><TerasContentTray key={check.id} kicker={check.label} description={check.detail}
                  actions={<TerasActionRow><TerasStatusPill tone={check.tone}>{modelReadinessLabel(check.state)}</TerasStatusPill><TerasActionButton emphasis="secondary" size="table-compact" aria-label={`Inspect ${check.label}`} onClick={()=>setActiveCheck(check)}>Inspect</TerasActionButton></TerasActionRow>} />)}
              </TerasFieldStack>
            </TerasPanel>
            <TerasFieldStack spacing="normal">
              <TerasPanel frame="padded" treatment="neutral" spacing="normal">
                <TerasPanelHeader kicker="Who can use this profile" title="Permitted workflows" description={view.summaryOnly ? "Listed by the profile policy. Actual requests still pass their normal context and access checks." : "Eligibility is reported separately for each workflow."}
                  statusLabel={`${profile.consumers.length} listed`} statusTone="info" />
                {profile.consumers.length ? <TerasList>{profile.consumers.map(consumer=><TerasStatusItem key={consumer.callerId}
                  label={consumer.callerWorkflow.replace(/[-_]/g," ")} detail={consumer.callerRepo}
                  status={view.summaryOnly && consumer.eligibility==="eligible" ? "Policy permits" : modelConsumerEligibilityLabel(consumer.eligibility)} tone={modelConsumerEligibilityTone(consumer.eligibility)} />)}</TerasList> : <TerasEmptyState>No workflow is listed in this profile.</TerasEmptyState>}
              </TerasPanel>
              <TerasPanel frame="padded" treatment="neutral" spacing="normal">
                <TerasPanelHeader kicker="Attention" title={view.blockers.length ? "Conditions to resolve" : "No reported workflow blockers"}
                  description={view.blockers.length ? "Resolve these reported conditions before using the affected workflow." : "This describes the profile evidence; it is not a live model-health result."} />
                {view.blockers.map((blocker,index)=><TerasContentTray key={`${blocker.id}-${index}`} kicker={blocker.label} description={blocker.detail}><TerasMetadataList shape="line" treatment="chip" wrap items={modelProfileBlockerMetadata(blocker)} /></TerasContentTray>)}
              </TerasPanel>
              <TerasPanel frame="padded" treatment="neutral" spacing="normal">
                <TerasPanelHeader kicker="Recorded evidence" title={view.evidenceLabel} description={view.evidenceDetail}
                  statusLabel={profile.latestAudit.state==="unknown" ? "Not reported" : modelReadinessLabel(profile.latestAudit.state)} statusTone={modelReadinessTone(profile.latestAudit.state)} />
                <TerasActionRow><TerasActionButton emphasis="secondary" aria-label="Inspect latest audit projection" onClick={()=>setActiveInspector("latest-audit")}>Inspect evidence</TerasActionButton></TerasActionRow>
              </TerasPanel>
            </TerasFieldStack>
          </TerasDetailGrid>
          <TerasPanel frame="padded" treatment="neutral" spacing="normal">
            <TerasPanelHeader kicker="Reference" title="Policy and source details" description="Inspect the original policy, activation conditions and source identifiers." />
            <TerasActionRow><TerasActionButton emphasis="secondary" aria-label="Inspect policy projection" onClick={()=>setActiveInspector("policy")}>Inspect policy</TerasActionButton><TerasActionButton emphasis="secondary" aria-label="Inspect runtime projection" onClick={()=>setActiveInspector("runtime")}>{view.summaryOnly ? "Inspect activation" : "Inspect runtime"}</TerasActionButton></TerasActionRow>
            <TerasTechnicalDetails items={modelProfileTechnicalMetadata(profile)} />
          </TerasPanel>
        </TerasContentRegion>
      </TerasContentFrame>
    </TerasModalShell>
    <ModelProfileCheckDialog check={activeCheck} onClose={()=>setActiveCheck(null)} />
    <ModelProfileInspectorDialog inspector={activeInspector} profile={profile} onClose={()=>setActiveInspector(null)} />
    {changeOpen?<ModelProfileLifecycleDialog profile={profile} preview={preview} onClose={()=>setChangeOpen(false)} onRecorded={result=>{setChangeOpen(false);setRecorded(result);}}/>:null}
    {recorded?<ModelProfileRequestHistoryDialog preview={preview} open initialRequestId={recorded.request_id} requests={[recorded]} onClose={()=>setRecorded(null)} onChanged={async()=>undefined}/>:null}
  </>;
}
