import {TerasContentTray,TerasFieldStack,TerasMetadataList,TerasPanel,TerasPanelHeader,TerasTechnicalDetails,TerasTimeline,TerasTimelineItem} from "@/teras";
import type {ModelProfileRequestProjection} from "../../../live-runtime/model-operations-live-types.ts";
import {modelProfileRequestEvent,modelProfileRequestHistoryMetadata,modelProfileRequestTechnicalMetadata,modelProfileRequirementMetadata} from "./model-profile-request-history-view-model.ts";

export function ModelProfileRequestDetails({request}:{request:ModelProfileRequestProjection}) {
  return <TerasPanel frame="padded" treatment="neutral" spacing="normal" fit="content">
    <TerasPanelHeader kicker="Request details" title={request.request.profile_intent.display_name}/>
    <TerasMetadataList items={modelProfileRequestHistoryMetadata(request)}/>
    {request.requirements.length?<TerasContentTray kicker="Requested changes"><TerasFieldStack>{request.requirements.map(r=><TerasMetadataList key={String(r.requirement_id)} items={modelProfileRequirementMetadata(r)}/>)}</TerasFieldStack></TerasContentTray>:null}
    <TerasTechnicalDetails items={modelProfileRequestTechnicalMetadata(request)}/>
  </TerasPanel>;
}
export function ModelProfileRequestEvents({request}:{request:ModelProfileRequestProjection}) {
  return <TerasPanel frame="padded" treatment="neutral" spacing="normal" fit="content">
    <TerasPanelHeader kicker="History" title="Request events" description="Recorded events for this request. Times are shown in UTC."/>
    {request.history.length?<TerasTimeline ariaLabel="Profile request events" frame="contained">{request.history.map(event=>{
      const row=modelProfileRequestEvent(event);
      return <TerasTimelineItem key={event.sequence} label={row.label} detail={row.summary} displayTimestamp={row.displayTimestamp} timestamp={row.timestamp} status={row.status} tone={row.tone} evidence={<TerasTechnicalDetails summary="Event details" items={row.evidence}/>}/>;
    })}</TerasTimeline>:<TerasContentTray kicker="No recorded events" description="The request source returned no events."/>}
  </TerasPanel>;
}
