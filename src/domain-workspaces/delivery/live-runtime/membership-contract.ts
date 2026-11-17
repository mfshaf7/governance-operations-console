export type MembershipPrincipal = { id: number; name: string; kind: "user" | "group" | "placeholder" };
export type ProjectMember = MembershipPrincipal & { membership_id: number; role_ids: number[]; role_names: string[]; version: string; protected: boolean; restriction: string | null };
export type MembershipRole = { id: number; name: string; can_assign_work: boolean; manages_members: boolean };
export type MembershipCommand = { request_id: string; operation: "add" | "change" | "remove"; principal_id: number; membership_id: number | null; role_ids: number[]; expected_version: string | null };
export type MembershipOutcome = { schema_version: 1; status: "applied"; request_id: string; caller_id: string; operator_id: string; operation: MembershipCommand["operation"]; project_id: number; project_identifier: "workspace-delivery-art";
  principal: MembershipPrincipal; before: ProjectMember | null; after: ProjectMember | null; applied_at: string; replayed: boolean; request_digest: string; receipt: { ref: string; digest: string } };
export type MembershipProjection = { schema_version: 1; project_id: number; project_identifier: "workspace-delivery-art"; project_name: string; members: ProjectMember[]; total: number; page: number; page_size: number;
  candidates: MembershipPrincipal[]; candidate_total: number; roles: MembershipRole[]; recent_outcomes: MembershipOutcome[] };
const record = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === "object" && !Array.isArray(v));
const id = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0;
const text = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 512;
const principal = (v: unknown) => record(v) && id(v.id) && text(v.name) && ["user", "group", "placeholder"].includes(String(v.kind));
const member = (v: unknown) => record(v) && principal(v) && id(v.membership_id) && Array.isArray(v.role_ids) && v.role_ids.every(id) &&
  Array.isArray(v.role_names) && v.role_names.every(text) && /^sha256:[a-f0-9]{64}$/.test(String(v.version)) && typeof v.protected === "boolean" && (v.restriction === null || text(v.restriction));
export function assertMembershipOutcome(value: unknown): MembershipOutcome {
  if (!record(value) || value.schema_version !== 1 || value.project_identifier !== "workspace-delivery-art" || value.status !== "applied" || !text(value.request_id) || !text(value.caller_id) || !text(value.operator_id) ||
    !["add", "change", "remove"].includes(String(value.operation)) || !id(value.project_id) || !principal(value.principal) ||
    !(value.before === null || member(value.before)) || !(value.after === null || member(value.after)) ||
    !Number.isFinite(Date.parse(String(value.applied_at))) || typeof value.replayed !== "boolean" ||
    !record(value.receipt) || !/^openproject:\/\/delivery-memberships\/receipts\/[a-f0-9]{64}$/.test(String(value.receipt.ref)) ||
    !/^sha256:[a-f0-9]{64}$/.test(String(value.receipt.digest))) throw new Error("The project membership outcome is incomplete. Recover the original decision before trying a replacement.");
  return value as MembershipOutcome;
}
export function assertMembershipProjection(value: unknown): MembershipProjection {
  if (!record(value) || value.schema_version !== 1 || value.project_identifier !== "workspace-delivery-art" || !id(value.project_id) || !text(value.project_name) || !Array.isArray(value.members) || !value.members.every(member) ||
    value.members.length > 100 || !Array.isArray(value.candidates) || value.candidates.length > 100 || !value.candidates.every(principal) ||
    !Number.isSafeInteger(value.total) || Number(value.total) < 0 || !Number.isSafeInteger(value.candidate_total) || Number(value.candidate_total) < 0 || !id(value.page) ||
    ![25,50,100].includes(Number(value.page_size)) || !Array.isArray(value.roles) || !value.roles.every(role => record(role) && id(role.id) && text(role.name) &&
      typeof role.can_assign_work === "boolean" && typeof role.manages_members === "boolean") || !Array.isArray(value.recent_outcomes) || value.recent_outcomes.length > 10) throw new Error("Current project members could not be read safely.");
  value.recent_outcomes.forEach(assertMembershipOutcome);
  return value as MembershipProjection;
}
