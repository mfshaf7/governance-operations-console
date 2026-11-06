import type { TerasMetadataItem } from "@/teras";
import type { ModelProfileRecord, ModelRequiredMoveProjection, ModelConsumerBlocker } from "../../../read-model/types/model-operations-types.ts";
import { modelProfileAvailability, modelProfileChecks } from "../../../read-model/selectors/model-profile-selectors.ts";

function words(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, word=>word.toUpperCase());
}
export {modelProfileTitle,modelProfilePurpose} from "../../shared/model-profile-display-model.ts";
export function modelProfileDashboardProjection(profile: ModelProfileRecord) {
  const summaryOnly = profile.evidenceScope === "policy-summary";
  const availability=modelProfileAvailability(profile);
  const consumers=profile.consumers;
  const blocked=consumers.flatMap(consumer=>consumer.blockers);
  const checks=modelProfileChecks(profile);
  const labels:Record<string,{label:string;detail:string}>={
    "profile-policy":{label:"Profile permission",detail:"Whether this profile is active and its policy evidence is current."},
    "consumer-contract":{label:"Permitted workflows",detail:summaryOnly ? "Workflows listed in this policy. Each invocation still checks its context and permissions." : "Whether the registered workflows meet their caller requirements."},
    "access-plane":{label:"Access and activation",detail:"Whether the policy permits access through the governed AI service."},
    "runtime-controls":{label:summaryOnly ? "Activation conditions" : "Runtime requirements",detail:summaryOnly ? "Policy activation conditions; provider health is read in Models & routing." : "The runtime requirements reported for this profile."},
    "security-acceptance":{label:"Security review",detail:"The Security decision referenced by the profile policy."},
  };
  return {summaryOnly,availability,
    checks:checks.map(check=>({...check,...labels[check.id]})),
    accessLabel: availability==="available" ? summaryOnly ? "Policy permits use" : "Available" : words(availability),
    nextTitle:availability==="available" ? "Review model routing when choosing a model" : profile.requiredMove.label,
    nextDetail:availability==="available" ? "This profile defines permission. Choose providers, models, effort and fallback in Models & routing." : profile.requiredMove.detail,
    blockers:blocked,
    environments:[...new Set(consumers.flatMap(consumer=>consumer.environments))].map(value=>value==="dev-integration" ? "Dev integration" : value==="prod" ? "Production" : words(value)),
    evidenceLabel:summaryOnly ? "Profile change evidence" : "Latest audit",
    evidenceDetail:summaryOnly ? "Retained lifecycle evidence for this profile; this is separate from AI invocation activity." : profile.latestAudit.summary,
  };
}
export function modelProfileDashboardFacts(profile: ModelProfileRecord): TerasMetadataItem[] {
  const view=modelProfileDashboardProjection(profile);
  return [
    {label:"Lifecycle",value:words(profile.policy.lifecycle)},
    {label:"Workflows",value:String(profile.consumers.length)},
    {label:"Environment",value:view.environments.join(", ")||"Not reported"},
    {label:"Evidence",value:view.summaryOnly ? "Policy summary" : "Detailed projection"},
  ];
}
export function modelRequiredMoveMetadata(requiredMove: ModelRequiredMoveProjection): TerasMetadataItem[] {
  return [{label:"Responsible component",value:requiredMove.owner}];
}

export function modelProfileTechnicalMetadata(profile:ModelProfileRecord):TerasMetadataItem[] {
  return [{label:"Profile ID",value:profile.policy.profileId},{label:"Purpose code",value:profile.policy.purpose},{label:"Policy source",value:profile.policy.source.ref},{label:"Source revision",value:profile.policy.source.sourceVersion},{label:"Evidence read",value:profile.policy.source.observedAt}];
}
export function modelProfileBlockerMetadata(blocker:ModelConsumerBlocker):TerasMetadataItem[] {return [{label:"Responsible component",value:blocker.owner}];}
