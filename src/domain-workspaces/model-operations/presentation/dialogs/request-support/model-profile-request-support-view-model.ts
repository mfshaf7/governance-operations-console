import type{TerasMetadataItem}from'@/teras';
import type{ModelProfileRequestCapability}from'../../../work-model/profile-requests/model-profile-request-capability.ts';
export function modelProfileRequestMetadata(capability:ModelProfileRequestCapability):TerasMetadataItem[]{return[{label:'Workflow service',value:capability.workflowOwner},{label:'Implementation',value:capability.backendOwner},{label:'Security review',value:capability.securityOwner}];}
export function modelProfileRequestRequirementRows(){return[
 {id:'choices',label:'Your choices',detail:'Choose an existing Console AI Capability, a profile name, operating rules and a reason. The request description and notes are saved for review.'},
 {id:'setup',label:'Prepared by the system',detail:'The registered integration supplies behavior, caller identities and response format. The context service supplies the context reference when you submit.'},
 {id:'missing',label:'Missing workflow setup',detail:'Retry a failed source read. A new Console AI Capability requires implemented integration code and reviewed contracts. Creating a permission profile does not create that code.'},
 {id:'decision',label:'Review and activation',detail:'Submission records a request. Approval, implementation and activation remain separate reviewed actions.'},
];}
