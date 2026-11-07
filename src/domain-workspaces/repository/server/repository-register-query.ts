import type {RepositoryWorkspaceRecord} from "../domain/repository-types.ts";
import {assertRepositoryRegistrationLookup} from "../../../workspace-registry/workspace-repository-status.ts";
import {ownerQueryFetch} from "../../../console-integration/server/owner-query-fetch.ts";
import {scanRegisterPage} from "../../../console-integration/server/scan-register-page.ts";
import {readWorkspaceContinuity} from "../../../workspace-continuity/server/workspace-continuity-wgcf-client.ts";
import {readRepositoryRegistrationStatus} from "../../../workspace-registry/server/workspace-registry-oos-client.ts";
import {projectRepositoryCustodyResults,projectRepositoryProvisioningResults,repositoryProvisionedRecordId} from "../live-runtime/repository-custody-live-projection.ts";
import {projectRepositoryCurrentInventory} from "../live-runtime/repository-inventory-live-projection.ts";
import {repositoryMatchesSelection,type RepositoryRegisterSelection} from "../read-model/repository-register-selection.ts";
import {listRepositoryCustodyResults,RepositoryCustodyOosError} from "./repository-custody-oos-client.ts";

export async function readRepositoryRegister(query:URLSearchParams,callerSignal?:AbortSignal){
  const owner=ownerQueryFetch(callerSignal);
  if([...query.keys()].some(key=>!["q","status","account","cursor"].includes(key)||query.getAll(key).length!==1))throw invalid();
  const selection:RepositoryRegisterSelection={query:(query.get("q")??"").trim().toLowerCase(),status:query.get("status")??"all",account:(query.get("account")??"all").toLowerCase()};
  if(selection.query.length>128||!["all","admitted","ready","blocked","retired"].includes(selection.status)||!/^all$|^[a-z0-9][a-z0-9-]{0,99}$/.test(selection.account))throw invalid();
  const inventory=await readWorkspaceContinuity({fetchImpl:owner.fetchImpl});
  const page=await scanRegisterPage<RepositoryWorkspaceRecord>({signal:owner.signal,selection,cursor:query.get("cursor"),identity:row=>row.id,
    readPage:async cursor=>{
      const source=await listRepositoryCustodyResults(cursor,{view:"register",fetchImpl:owner.fetchImpl});
      const names=[...new Set(source.records.map(row=>row.request.requested_custody.workspace_owner_ref).filter((ref):ref is string=>Boolean(ref?.startsWith("repo:"))).map(ref=>ref.slice(5)))].sort();
      const registrations=names.length?assertRepositoryRegistrationLookup(await readRepositoryRegistrationStatus(names,{fetchImpl:owner.fetchImpl}),names):undefined;
      const results=Object.fromEntries(source.records.map(row=>[row.request.request_id,row]));
      const provisioned=projectRepositoryProvisioningResults([],results);
      const records=projectRepositoryCustodyResults(provisioned,Object.fromEntries(source.records.map(row=>[repositoryProvisionedRecordId(row)!,row])));
      return {records:projectRepositoryCurrentInventory(records,inventory,registrations),next_cursor:source.next_cursor};
    },matches:row=>repositoryMatchesSelection(row,selection)});
  return {mode:"live",status:"current",error:null,records:page.records,page:{selection,next_cursor:page.next_cursor,total:null}};
}
function invalid(){return new RepositoryCustodyOosError("Select a valid repository search and page.","repository_register_selection_invalid",400);}
