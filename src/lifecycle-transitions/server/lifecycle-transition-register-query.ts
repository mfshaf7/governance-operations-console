import {resolveConsoleOosConnection} from "../../console-integration/configuration/console-runtime-configuration.ts";
import {ownerQueryFetch} from "../../console-integration/server/owner-query-fetch.ts";
import {scanRegisterPage} from "../../console-integration/server/scan-register-page.ts";
import {LIFECYCLE_TRANSITION_ROUTES} from "../model/lifecycle-transition-routes.ts";
import type {LifecycleTransitionProjection} from "../read-model/lifecycle-transition-projection-types.ts";
import {buildLifecycleTransitionOverviewItem} from "../presentation/lifecycle-transition-overview-view-model.ts";
import {admitLifecycleTransition,lifecycleTransitionOosRequest,LifecycleTransitionOosError} from "./lifecycle-transition-oos-client.ts";

const states = ["all","applied","applying","authorized","awaiting-admission","awaiting-authority","blocked","cancelled","deferred","failed","prepared","rejected","returned","superseded","validating"];

export async function readLifecycleTransitionJournal(query: URLSearchParams, options: {env?:NodeJS.ProcessEnv;fetchImpl?:typeof fetch} = {}, signal?:AbortSignal) {
  const selection = {routeId:query.get("routeId")??"",state:query.get("state")??"all",query:(query.get("q")??"").trim().toLowerCase()};
  const id=query.get("id");
  if([...query.keys()].some(key=>!["view","routeId","state","q","cursor","id"].includes(key)||query.getAll(key).length!==1)||!(selection.routeId in LIFECYCLE_TRANSITION_ROUTES)||!states.includes(selection.state)||selection.query.length>128||id!==null&&!/^[A-Za-z0-9._:-]{1,256}$/.test(id)) {
    throw new LifecycleTransitionOosError("Select a valid handoff route, search and page.","lifecycle_transition_page_invalid",400);
  }
  const config=resolveConsoleOosConnection(options.env), owner=ownerQueryFetch(signal,options.fetchImpl);
  async function read(cursor:string|null) {
    const params=new URLSearchParams({limit:"25",route_id:selection.routeId,...(selection.state!=="all"?{state:selection.state}:{}),...(cursor?{cursor}:{})});
    const raw=await lifecycleTransitionOosRequest(config,id?`/v1/lifecycle-transitions/${encodeURIComponent(id)}`:`/v1/lifecycle-transitions?${params}`,owner.fetchImpl) as Record<string,unknown>;
    if(id) {
      const row=admitLifecycleTransition(raw).projected;
      if(row.transitionId!==id||row.route.routeId!==selection.routeId)throw new LifecycleTransitionOosError("The selected handoff belongs to another route.","lifecycle_transition_original_mismatch",409);
      return {records:[row],next_cursor:null};
    }
    if(raw?.schema_version!==1||!Array.isArray(raw.transitions)||raw.transitions.length>25||raw.next_cursor!==null&&(typeof raw.next_cursor!=="string"||raw.next_cursor.length>4096))throw new LifecycleTransitionOosError("The handoff journal returned an invalid page.","lifecycle_transition_projection_invalid",502);
    const rows=raw.transitions.map(value=>admitLifecycleTransition(value).projected);
    if(rows.some(row=>row.route.routeId!==selection.routeId||selection.state!=="all"&&row.state!==selection.state))throw new LifecycleTransitionOosError("The journal returned a different route or state.","lifecycle_transition_projection_invalid",502);
    return {records:rows,next_cursor:raw.next_cursor as string|null};
  }
  const result=id?await read(null):await scanRegisterPage<LifecycleTransitionProjection>({signal:owner.signal,selection,cursor:query.get("cursor"),readPage:read,identity:row=>row.transitionId,matches:row=>{
    const item=buildLifecycleTransitionOverviewItem(row);
    return !selection.query||[item.sourceRecordId,item.sourceTitle??"",item.transitionId,item.nextAction?.ownerLabel??"",item.targetRecordRef??item.targetHomeRef].join(" ").toLowerCase().includes(selection.query);
  }});
  return {mode:"live",status:"current",error:null,observedAt:new Date().toISOString(),items:result.records.map(buildLifecycleTransitionOverviewItem),page:{selection,next_cursor:result.next_cursor,total:null}};
}
