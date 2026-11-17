import type { MembershipProjection } from "../../../live-runtime/membership-contract.ts";

// Explicit disconnected preview only. These records never replace a live read.
export function membershipPreview(): MembershipProjection {
  return { schema_version: 1, project_id: 1, project_identifier: "workspace-delivery-art", project_name: "Delivery preview", page: 1, page_size: 25, total: 2,
    roles: [{id:1,name:"Reader",can_assign_work:false,manages_members:false}, {id:2,name:"Member",can_assign_work:true,manages_members:false}, {id:3,name:"Project admin",can_assign_work:true,manages_members:true}],
    members: [{id:100,name:"Alex Morgan",kind:"user",membership_id:10,role_ids:[2],role_names:["Member"],version:"sha256:"+"a".repeat(64),protected:false,restriction:null},
      {id:101,name:"Installation operator",kind:"user",membership_id:11,role_ids:[3],role_names:["Project admin"],version:"sha256:"+"b".repeat(64),protected:true,restriction:"Installation operator and service access is protected."}],
    candidates: [{id:102,name:"Casey Taylor",kind:"user"}], candidate_total:1, recent_outcomes:[] };
}
