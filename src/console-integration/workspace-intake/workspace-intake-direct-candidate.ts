import type { WorkspaceIntakeCandidate, WorkspaceIntakeRequestedRecord } from "./workspace-intake-live-types.ts";

export type DirectIntakeKind = "product" | "component";
export type DirectIntakeDraft = Readonly<{
  notes: string; evidence: string; platformOwner: string; runtimeOwner: string;
  securityOwner: string; sourceOwners: string; endpoint: string;
  ownerRepo: string; componentClass: string; product: string;
}>;
export const emptyDirectIntakeDraft: DirectIntakeDraft = {
  notes: "", evidence: "", platformOwner: "", runtimeOwner: "", securityOwner: "",
  sourceOwners: "", endpoint: "", ownerRepo: "", componentClass: "", product: "",
};
export function directIntakeTarget(kind: string, name: string) {
  if (!["product", "component"].includes(kind) || !/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
    throw new Error("Select product or component and enter its exact canonical key.");
  }
  return { kind: kind as DirectIntakeKind, name };
}
export async function directWorkspaceIntakeCandidate(target: { kind: DirectIntakeKind; name: string },
  draft: DirectIntakeDraft, activeOwners: readonly string[], activeProducts: readonly string[]): Promise<WorkspaceIntakeCandidate> {
  directIntakeTarget(target.kind, target.name);
  const owner = (value: string) => {
    const key = value.trim();
    if (!activeOwners.includes(key)) throw new Error(`Choose an active owner repository: ${key || "owner missing"}.`);
    return key;
  };
  const refs = [...new Set(draft.evidence.split(/\n/).map(value => value.trim()).filter(Boolean))];
  if (!draft.notes.trim() || !refs.length) throw new Error("Describe the purpose and boundary, with at least one contextual evidence reference.");
  const notes = `${draft.notes.trim()}\n\nOperator-provided context (not source-owner attestation):\n${refs.join("\n")}`;
  let requested: WorkspaceIntakeRequestedRecord;
  if (target.kind === "product") {
    const sources = [...new Set(draft.sourceOwners.split(",").map(value => value.trim()).filter(Boolean))];
    if (!sources.length || !draft.endpoint.trim()) throw new Error("Provide source owners and the intended endpoint.");
    requested = { kind: "product", notes, platform_owner: owner(draft.platformOwner),
      runtime_owner: owner(draft.runtimeOwner), security_owner: owner(draft.securityOwner),
      source_owners: sources.map(owner), intended_endpoint: draft.endpoint.trim() };
  } else {
    if (!draft.componentClass.trim()) throw new Error("Provide the component class.");
    const product = draft.product.trim();
    if (product && !activeProducts.includes(product)) throw new Error("The optional product must identify an active product.");
    requested = { kind: "component", notes, owner_repo: owner(draft.ownerRepo),
      security_owner: owner(draft.securityOwner), component_class: draft.componentClass.trim(), product: product || null };
  }
  // This labels operator-authored metadata; it grants no source-owner authority.
  const bytes = new TextEncoder().encode(JSON.stringify({ target, requested_record: requested }));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const digest = `sha256:${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("")}`;
  const ref = `console://workspace-intake/direct/${target.kind}/${target.name}`;
  return { target, requested_record: requested, label: target.name,
    source: { class: "direct", ref, digest }, evidence_refs: [ref, ...refs] };
}
