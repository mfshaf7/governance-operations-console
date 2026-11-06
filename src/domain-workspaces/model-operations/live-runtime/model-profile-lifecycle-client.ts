import {assertProfileLifecycleOperation,assertProfileLifecyclePreparation,type ProfileLifecycleIntent} from '../work-model/profile-requests/model-profile-lifecycle-contract.ts';
import {assertModelProfileRequestProjection} from './model-operations-live-contract.ts';
export class ProfileLifecycleError extends Error{constructor(message:string,readonly status:number|null){super(message);}}
async function request(action:string,input:unknown,requestId:string|null=null){
 const path=requestId?'/api/model-operations/requests/'+encodeURIComponent(requestId)+'/lifecycle':'/api/model-operations/lifecycle';
 let response:Response;
 try{response=await fetch(path+(input===null&&action==='security'?'?view=security':''),{method:input===null?'GET':'POST',cache:'no-store',headers:{'content-type':'application/json'},...(input===null?{}:{body:JSON.stringify({action,input})}),signal:AbortSignal.timeout(30000)});}catch{throw new ProfileLifecycleError('The original action result could not be read. Check it before retrying.',null);}
 const value=await response.json().catch(()=>null);if(!response.ok)throw new ProfileLifecycleError(typeof value?.error==='string'?value.error:'The owner did not confirm this action. Check the original result before retrying.',response.status);return value;
}
export async function prepareProfileLifecycle(input:Record<string,unknown>&{profile_id:string;intent:ProfileLifecycleIntent}){return assertProfileLifecyclePreparation(await request('prepare',input),input.profile_id,input.intent);}
export async function reviseProfileLifecycle(input:unknown){return assertModelProfileRequestProjection(await request('revise',input));}
export async function submitProfileLifecycle(input:unknown){return assertModelProfileRequestProjection(await request('submit',input));}
export async function profileLifecycleOperation(requestId:string,input:unknown=null){return assertProfileLifecycleOperation(await request('operation',input,requestId),requestId);}
export async function profileSecurityStatus(requestId:string){
 const v=await request('security',null,requestId);if(v?.request_id!==requestId||typeof v.authorized!=='boolean'||typeof v.required!=='boolean'||typeof v.prepared!=='boolean'||!Number.isSafeInteger(v.revision))throw Error('Security decision authority could not be confirmed.');
 return v as import('../work-model/profile-requests/model-profile-lifecycle-contract.ts').ProfileSecurityStatus;
}
export async function acceptProfileSecurity(requestId:string,input:unknown){const v=await request('security',input,requestId);return assertModelProfileRequestProjection(v.request);}
