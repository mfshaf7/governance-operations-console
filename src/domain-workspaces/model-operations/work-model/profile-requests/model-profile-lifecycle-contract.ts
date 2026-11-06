export type ProfileLifecycleIntent='create'|'amend'|'activate'|'suspend'|'retire'|'exception';
export const profileLifecycleLabels:Record<ProfileLifecycleIntent,string>={create:'Create from this profile',amend:'Change operating policy',activate:'Activate profile',suspend:'Suspend profile',retire:'Retire profile',exception:'Request an exception'};
export type ProfilePolicyChange={field:string;label:string;before:string[]|number|null;after:string[]|number|null};
export type ProfilePolicyReview={profile_id:string;source_version:string;current_state:string;result_state:string;affected_workflows:string[];policy_changes:ProfilePolicyChange[]};
export type ProfileLifecyclePreparation={schema_version:1;preparation_digest:string;profile_id:string;intent:ProfileLifecycleIntent;current_state:string;result_state:string;affected_workflows:string[];security_acceptance_required:boolean;impact:string;can_submit?:boolean;policy_changes?:ProfilePolicyChange[];source_version:string;editable_policy:{allowed_data_scope:string[];runtime_limits:Record<string,number>}};
export type ProfileLifecycleOperation={request_id:string;state:'previous-implementation'|'not-started'|'queued'|'authoring'|'awaiting-review'|'merged'|'source-applied'|'runtime-unverified'|'cleanup'|'declined'|'verified';source_applied:boolean;runtime_state:string;next_action:string;history:{state:string;recorded_at:string;detail:string}[];review:{url:string;number:number;head:string}|null;operation_digest:string|null;error:string|null;rollback_available?:boolean};
export type ProfileLifecycleSelection={request_id:string;profile_id:string;intent:ProfileLifecycleIntent;environment:'dev-integration';changes:{display_name?:string;allowed_data_scope?:string[];runtime_limits?:Record<string,number>}};
export type ProfileSecurityStatus={edit?:ProfileLifecycleSelection|null;request_id:string;revision:number;required:boolean;authorized:boolean;prepared:boolean;review?:ProfilePolicyReview|null;acceptance:{reference:{uri:string;digest:string};reason:string;operator_id:string;recorded_at:string}|null};
const hash=(v:unknown)=>typeof v==='string'&&/^sha256:[0-9a-f]{64}$/.test(v);
export function assertProfileLifecyclePreparation(value:unknown,profileId:string,intent:ProfileLifecycleIntent):ProfileLifecyclePreparation{
 const v=value as ProfileLifecyclePreparation;
 if(!v||v.schema_version!==1||v.profile_id!==profileId||v.intent!==intent||!hash(v.preparation_digest)||!Array.isArray(v.affected_workflows)||v.affected_workflows.some(w=>typeof w!=='string')||typeof v.impact!=='string'||typeof v.current_state!=='string'||typeof v.result_state!=='string'||typeof v.security_acceptance_required!=='boolean'||!/^([0-9a-f]{40})$/.test(v.source_version)||!v.editable_policy||!Array.isArray(v.editable_policy.allowed_data_scope))throw Error('The policy owner did not confirm this exact profile action.');
 return v;
}
export function assertProfileLifecycleOperation(value:unknown,requestId:string):ProfileLifecycleOperation{
 const v=value as ProfileLifecycleOperation;
 if(!v||v.request_id!==requestId||!['previous-implementation','not-started','queued','authoring','awaiting-review','merged','source-applied','runtime-unverified','cleanup','declined','verified'].includes(v.state)||typeof v.source_applied!=='boolean'||typeof v.runtime_state!=='string'||typeof v.next_action!=='string'||!Array.isArray(v.history)||v.history.some(e=>typeof e.detail!=='string'||!Number.isFinite(Date.parse(e.recorded_at)))||(v.operation_digest!==null&&!hash(v.operation_digest)))throw Error('The original implementation result could not be verified.');
 if(v.review){const u=new URL(v.review.url);if(u.protocol!=='https:'||u.hostname!=='github.com'||!/^\/mfshaf7\/platform-engineering\/pull\/[1-9][0-9]*$/.test(u.pathname)||!Number.isSafeInteger(v.review.number)||!/^([0-9a-f]{40})$/.test(v.review.head))throw Error('The exact source review reference is invalid.');}
 if(v.state==='verified'&&(!v.source_applied||!['active','suspended','retired','exception','removed'].includes(v.runtime_state)||v.next_action!=='complete'||!v.review))throw Error('The owner returned contradictory implementation and runtime evidence.');
 if(['source-applied','runtime-unverified'].includes(v.state)&&!v.source_applied)throw Error('The owner did not confirm source application.');
 return v;
}
