import type { ModelOperationsOperatingProjection, ModelProfileRequestProjection } from "../../../live-runtime/model-operations-live-types.ts";
import { modelProfileRequestReceiptItems } from "../../../work-model/profile-requests/model-profile-request-model.ts";

type Event = ModelProfileRequestProjection["history"][number];
const words = (value: string) => value.replace(/[-_]+/g, " ");
export function modelProfileReviewStatus(value: string) {
  return ({draft:"Draft",submitted:"Awaiting review","under-review":"Under review","changes-required":"Changes requested",approved:"Approved",rejected:"Rejected",withdrawn:"Withdrawn"} as Record<string,string>)[value] ?? words(value);
}
export function modelProfileImplementationStatus(value: string) {
  return ({"not-started":"Not started",implementing:"In progress",applied:"Applied",failed:"Failed"} as Record<string,string>)[value] ?? words(value);
}
export function modelProfileNextMove(value: string) {
  return ({"revise-or-submit":"Edit the draft or submit it for review.","start-review":"Start reviewing this request.","record-review-decision":"Record a review decision.","revise-and-resubmit":"Revise the request, then submit it again.",complete:"No further request action.","begin-platform-fulfillment":"Await implementation by Platform.","await-platform-fulfillment":"Implementation is in progress.","retry-or-correct-fulfillment":"Implementation needs attention from Platform.","refresh-authoritative-projections":"Check the applied profile in Purpose profiles."} as Record<string,string>)[value] ?? words(value);
}
export function modelProfileRequestChoice(request: ModelProfileRequestProjection|{display_name:string;review_state:string}) {
  return `${"display_name" in request?request.display_name:request.request.profile_intent.display_name} · ${modelProfileReviewStatus(request.review_state)}`;
}
export function modelProfileRequestHistoryMetadata(request: ModelProfileRequestProjection) {
  const intent=request.request.profile_intent;
  const environments:Record<string,string>={"dev-integration":"Local development",stage:"Staging",prod:"Production"};
  const classifications:Record<string,string>={public:"Public",internal:"Internal",confidential:"Confidential",restricted:"Restricted"};
  return [
    {label:"Purpose",value:intent.intended_purpose},
    {label:"Why it is needed",value:intent.operator_justification},
    {label:"Environment",value:intent.requested_environments.map(env=>environments[env]??env).join(", ")},
    {label:"Most sensitive data",value:classifications[intent.input_data_classification]??intent.input_data_classification},
    {label:"Operating rules",value:intent.operational_expectations.join("; ")},
    {label:"Requesting repository",value:intent.requesting_owner},
  ];
}
export function modelProfileRequestStatusMetadata(request: ModelProfileRequestProjection) {
  return [{label:"Review",value:modelProfileReviewStatus(request.review_state)},{label:"Implementation",value:modelProfileImplementationStatus(request.fulfillment_state)},{label:"Next action",value:modelProfileNextMove(request.next_action)}];
}
export function modelProfileRequestTechnicalMetadata(request: ModelProfileRequestProjection) {
  return [...modelProfileRequestReceiptItems(request),
    {label:"Caller bindings",value:request.request.profile_intent.registered_callers.map(c=>`${c.caller_id} = ${c.owner_repo}`).join("; ")},
    {label:"Output contract",value:`${request.request.profile_intent.required_output_schema_ref.repo} / ${request.request.profile_intent.required_output_schema_ref.path} @ ${request.request.profile_intent.required_output_schema_ref.version}`},
    {label:"Admitted context",value:`${request.request.profile_intent.admitted_context_ref.uri} / ${request.request.profile_intent.admitted_context_ref.digest}`},
    {label:"Operator",value:request.request.operator_id},
    ...(request.decision_ref?[{label:"Decision record",value:request.decision_ref.uri},{label:"Decision digest",value:request.decision_ref.digest}]:[]),
    {label:"Profile source authority",value:"Platform Engineering"}];
}
export function modelProfileRequirementMetadata(r: Record<string, unknown>) {
  return [{label:"Requested change",value:String(r.summary??"Unavailable")},{label:"Responsible repository",value:String(r.owner_repo??"Unavailable")},{label:"Next action",value:String(r.next_action??"Unavailable")}];
}
export function modelProfileFulfillmentMetadata(projection: ModelOperationsOperatingProjection) {
  return [{label:"Verified request",value:projection.oos_request_ref.request_id},{label:"Implementation",value:"Complete for this request; current registry is checked separately"},{label:"Original merged source",value:projection.platform_source_ref.source_version},{label:"Lifecycle receipt",value:projection.platform_source_ref.lifecycle_receipt_digest},{label:"Merged readback",value:projection.platform_source_ref.merged_readback_digest}];
}
export function modelProfileRequestEvent(event: Event) {
  const labels:Record<string,string>={"request-created":"Request created","review-submit":"Submitted for review","review-start-review":"Review started","review-request-changes":"Changes requested","review-approve":"Request approved","review-reject":"Request rejected","review-withdraw":"Request withdrawn","review-revise":"Request revised","fulfillment-implementing":"Implementation started","fulfillment-applied":"Implementation applied","fulfillment-failed":"Implementation failed","sample-review":"Sample review event"};
  const date=new Date(event.occurred_at);
  return {label:labels[event.event_type]??"Recorded event",summary:event.summary,timestamp:event.occurred_at,displayTimestamp:Number.isNaN(date.getTime())?event.occurred_at:new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"UTC"}).format(date)+" UTC",status:modelProfileReviewStatus(event.review_state_after),tone:event.fulfillment_state_after==="failed"?"danger" as const:event.review_state_after==="approved"?"ok" as const:"info" as const,
    evidence:[{label:"Event number",value:String(event.sequence)},{label:"Event type",value:event.event_type},{label:"Recorded at",value:event.occurred_at},{label:"Recorded by",value:event.actor_id},{label:"Command reference",value:event.command_id},{label:"Review state",value:event.review_state_after},{label:"Implementation state",value:event.fulfillment_state_after},{label:"Receipt reference",value:event.receipt_ref.uri},{label:"Receipt digest",value:event.receipt_ref.digest}]};
}
