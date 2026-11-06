import type {ModelProfileRequestProjection} from '../../live-runtime/model-operations-live-types.ts';
import {assertModelProfileRequestId} from '../../live-runtime/model-operations-live-contract.ts';
export type ModelProfileRequestSummary=Pick<ModelProfileRequestProjection,'request_id'|'revision'|'review_state'|'fulfillment_state'|'next_action'>&{display_name:string;requested_at:string};
export type ModelProfileRequestPage={schema_version:1;requests:ModelProfileRequestSummary[];next_cursor:string|null};
export function profileRequestSummary(request:ModelProfileRequestProjection):ModelProfileRequestSummary {
 return{request_id:request.request_id,revision:request.revision,display_name:request.request.profile_intent.display_name,requested_at:request.request.requested_at,review_state:request.review_state,fulfillment_state:request.fulfillment_state,next_action:request.next_action};
}
const keys=['request_id','revision','display_name','requested_at','review_state','fulfillment_state','next_action'].sort().join();
export function assertModelProfileRequestPage(value:unknown,cursor:string|null=null):ModelProfileRequestPage {
 const page=value as ModelProfileRequestPage;
 if(!page||typeof page!=='object'||Object.keys(page).sort().join()!=='next_cursor,requests,schema_version'||page.schema_version!==1||!Array.isArray(page.requests)||page.requests.length>25)throw Error('Request history page is invalid.');
 let previous=cursor??'';
 for(const row of page.requests){
  if(!row||typeof row!=='object'||Object.keys(row).sort().join()!==keys)throw Error('Request history summary is invalid.');
  assertModelProfileRequestId(row.request_id);
  if(row.request_id<=previous||!Number.isSafeInteger(row.revision)||row.revision<1||typeof row.display_name!=='string'||!row.display_name.trim()||Array.from(row.display_name).length>160||typeof row.requested_at!=='string'||!Number.isFinite(Date.parse(row.requested_at))||!['draft','submitted','under-review','changes-required','approved','rejected','withdrawn'].includes(row.review_state)||!['not-started','implementing','applied','failed'].includes(row.fulfillment_state)||!['revise-or-submit','start-review','record-review-decision','revise-and-resubmit','complete','begin-platform-fulfillment','await-platform-fulfillment','retry-or-correct-fulfillment','refresh-authoritative-projections'].includes(row.next_action))throw Error('Request history summary is incomplete or out of order.');
  previous=row.request_id;
 }
 if(page.next_cursor!==null){assertModelProfileRequestId(page.next_cursor);if(!page.requests.length||page.next_cursor!==previous)throw Error('Request history cursor does not match this page.');}
 return page;
}
