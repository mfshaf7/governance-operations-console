import type {RepositoryWorkspaceRecord} from "../domain/repository-types.ts";
export type RepositoryRegisterSelection={query:string;status:string;account:string};
export function repositoryMatchesSelection(record:RepositoryWorkspaceRecord,selection:RepositoryRegisterSelection){
  return (selection.status==="all"||record.admissionState===selection.status)&&
    (selection.account==="all"||record.providerIdentity?.owner.toLowerCase()===selection.account)&&
    (!selection.query||[record.admissionState,record.boundary,record.githubUrl,record.id,record.lastValidation,record.lifecycle,record.name,record.nextAction,record.owner,record.purpose,record.repoClass,record.role,record.routeSource,record.runtimeLane.decision,record.runtimeLane.profileRef,record.runtimeLane.status,record.securityBinding.status].join(" ").toLowerCase().includes(selection.query));
}
