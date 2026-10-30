import { provisionRepository } from "../../src/domain-workspaces/repository/server/repository-custody-oos-client.ts";
import { projectConsoleRuntimeCapabilities } from "../../src/console-integration/configuration/console-runtime-configuration.ts";
import { provisioningResult } from "./repository-provisioning-result.mjs";
import { proposalCompletionRecord } from "./proposal-completion-fixture.mjs";

// Synthetic owner responses for isolated UI inspection, never live authority.
export async function repositoryUiFixture() {
  const digest=`sha256:${"a".repeat(64)}`;
  const env={OOS_BASE_URL:"http://owner.test",OOS_CALLER_SECRET:"synthetic-test-only",GOVERNANCE_CONSOLE_OPERATOR_ID:"operator:synthetic",
    GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH:"/synthetic/session-projection.json",
    WGCF_BASE_URL:"http://wgcf.test",WGCF_CALLER_SECRET:"synthetic-wgcf-only",
    REPOSITORY_CUSTODY_CREDENTIAL_BINDING_URI:"https://binding.test/custody",REPOSITORY_CUSTODY_CREDENTIAL_BINDING_DIGEST:digest,
    REPOSITORY_LIFECYCLE_PROVIDER_CREDENTIAL_BINDING_URI:"https://binding.test/lifecycle",REPOSITORY_LIFECYCLE_PROVIDER_CREDENTIAL_BINDING_DIGEST:digest,
    REPOSITORY_CUSTODY_POLICY_PROFILE_URI:"https://policy.test/custody",REPOSITORY_CUSTODY_POLICY_PROFILE_DIGEST:digest,
    REPOSITORY_PROVISIONING_CREDENTIAL_BINDING_URI:"https://binding.test/create",REPOSITORY_PROVISIONING_CREDENTIAL_BINDING_DIGEST:digest,
    REPOSITORY_LIFECYCLE_POLICY_PROFILE_URI:"https://policy.test/lifecycle",REPOSITORY_LIFECYCLE_POLICY_PROFILE_DIGEST:digest};
  const result=await provisionRepository({approvalNote:"Approve this exact synthetic repository.",custodyKind:"dedicated-owner-repo",
    repositoryDescription:"Synthetic Repository UI inspection",repositoryName:"synthetic-source",repositoryOwner:"synthetic-workspace",
    requestedAt:"2026-06-21T08:00:00Z",requestId:"repository-custody-request:synthetic-ui",templateReviewed:true,
    visibility:"private",workspaceOwnerRef:"repo:synthetic-source"},{env,fetchImpl:async(_url,init)=>Response.json(provisioningResult(JSON.parse(init.body)))});
  const revision="b".repeat(40);
  const continuity={artifact_type:"workspace-continuity-projection",schema_version:1,
    authority:{owner_repo:"workspace-governance",revision,file_digests:{"contracts/repos.yaml":digest}},
    authority_boundary:{canonical_registry:"workspace-governance",mutation_authority:"none",readiness_projection:"workspace-governance-control-fabric",
      terminal_publication_authority:"operator-orchestration-service",workflow_authority:"operator-orchestration-service"},
    projection_digest:digest,projection_id:`workspace-continuity-projection:${digest.slice(7)}`,projection_state:"current",intake:[],products:[],
    inventory:[{kind:"repo",name:"synthetic-source",record_id:"repo:synthetic-source",record_version:2,record_digest:digest,posture:"active",lifecycle:"source-only",retired_collection:false,
      lineage:{intake_entry_version:1,source:"workspace-intake",source_digest:digest,source_ref:"repo:synthetic-source"},
      last_mutation:{action:"promote",applied_at:"2026-06-21T09:00:00Z",id:"mutation:synthetic",idempotency_key:"synthetic",readiness_digest:digest,readiness_ref:"readiness://synthetic",request_digest:digest,request_ref:"request://synthetic"}}]};
  const gate=proposalCompletionRecord({status:"accepted",title:"Synthetic pending repository gate",route:{target:"prototype",rationale:"Prototype source requires custody.",
    source_custody:{classification:"new-repo-required",repository_mode:"new",repository_gate_state:"pending",owner:null,source_ref:null,rationale:"Provision the source repository."}}});
  return {result,continuity,gate,capabilities:projectConsoleRuntimeCapabilities(env)};
}
