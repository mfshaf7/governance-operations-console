import {buildRepositoryCustodyRequest} from "../../src/domain-workspaces/repository/server/repository-custody-oos-client.ts";
import {custodyResult} from "./repository-custody-result.mjs";
export function attachmentFixture(intent){
 const digest=`sha256:${"a".repeat(64)}`;
 const config={operatorId:"operator:synthetic",credentialBindingRef:{uri:"https://binding.test/custody",digest},policyProfileRef:{uri:"https://policy.test/custody",digest}};
 return custodyResult(buildRepositoryCustodyRequest(intent,config));
}
