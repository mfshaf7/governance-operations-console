import type { ModelProfileRequestProjection } from '../../live-runtime/model-operations-live-types.ts';
import type { ModelCapability } from "../../work-model/model-runtime-contract.ts";
import type {TerasMetadataItem} from '@/teras';
import type {ProfileLifecycleOperation,ProfileLifecyclePreparation,ProfileSecurityStatus,ProfilePolicyReview,ProfilePolicyChange} from '../../work-model/profile-requests/model-profile-lifecycle-contract.ts';
export function profileLifecycleImpactMetadata(prepared:ProfileLifecyclePreparation):TerasMetadataItem[]{return [
 {label:'Current policy',value:prepared.current_state},{label:'After implementation',value:prepared.result_state},
 {label:'Environment',value:'Development integration'},{label:'Security acceptance',value:prepared.security_acceptance_required?'Required separately':'Not required for this action'},
 ];}
export function profileLifecycleOperationMetadata(operation:ProfileLifecycleOperation):TerasMetadataItem[]{return [
 {label:'Implementation',value:operation.state.replace(/-/g,' ')},{label:'Source applied',value:operation.source_applied?'Confirmed':'Not confirmed'},{label:'Running policy',value:operation.runtime_state.replace(/-/g,' ')},
 ];}
export function profileLifecycleSecurityMetadata(acceptance:NonNullable<ProfileSecurityStatus['acceptance']>):TerasMetadataItem[]{return [
 {label:'Decision reference',value:acceptance.reference.uri},{label:'Decision digest',value:acceptance.reference.digest},
 ];}

export function profilePolicyReviewMetadata(review:ProfilePolicyReview):TerasMetadataItem[]{return [{label:'Profile',value:review.profile_id},{label:'Current policy',value:review.current_state},{label:'After implementation',value:review.result_state},{label:'Affected workflows',value:review.affected_workflows.join(', ')}];}
export function profilePolicyChangeMetadata(change:ProfilePolicyChange):TerasMetadataItem[]{const text=(v:ProfilePolicyChange['before'])=>Array.isArray(v)?v.join('; '):String(v??'Not set');return [{label:'Current',value:text(change.before)},{label:'Requested',value:text(change.after)}];}

export function profileManagedLimitMetadata(): TerasMetadataItem[] {
 return [
  {label:'Retries',value:'No automatic retry after a model request is sent.'},
  {label:'Concurrency',value:'Limited by the selected provider; this form does not increase it.'},
  {label:'Response limit',value:'Token limits apply to local and API models. The dedicated account connection uses an output-size limit instead.'},
 ];
}

export function capabilityProfileMetadata(capability: ModelCapability): TerasMetadataItem[] {
  const selected = capability.profiles.find(row => row.profile_id === capability.selected_profile_id);
  return [
    { label: "Current profile", value: selected?.profile_id === capability.capability_id ? "Standard profile" : selected?.name ?? "Unavailable" },
    { label: "Current state", value: selected?.selectable ? "Permitted by policy; model health is checked separately" : selected?.state === "active" ? "Not currently permitted by policy" : selected?.state ?? "Unknown" },
    { label: "Registered profiles", value: capability.profiles.length },
  ];
}


export function profileRevisionSubject(request: ModelProfileRequestProjection, security: ProfileSecurityStatus) {
 const state = security.review?.current_state;
 const lifecycle = state === 'active' || state === 'exception' || state === 'retired' ? state : 'suspended';
 return {policy:{profileId:security.edit?.profile_id ?? request.request.profile_intent.profile_id ?? '',
   displayName:request.request.profile_intent.display_name,purpose:request.request.profile_intent.intended_purpose,
   lifecycle,allowedDataScope:security.edit?.changes.allowed_data_scope ?? []}} as const;
}
