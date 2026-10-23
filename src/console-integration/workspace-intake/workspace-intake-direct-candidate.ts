import type { WorkspaceIntakeCandidate, WorkspaceIntakeRequestedRecord, WorkspaceIntakeRequestPage } from "./workspace-intake-live-types.ts";

export type DirectIntakeKind = "product" | "component";
export type DirectIntakeDraft = Readonly<{
  notes: string; evidence: string; platformOwner: string; runtimeOwner: string;
  securityOwner: string; sourceOwners: string; endpoint: string;
  ownerRepo: string; componentClass: string; product: string;
  validationPosture: string; graphRole: string; catalogRefs: string; validationNotes: string;
}>;
export const emptyDirectIntakeDraft: DirectIntakeDraft = {
  notes: "", evidence: "", platformOwner: "", runtimeOwner: "", securityOwner: "",
  sourceOwners: "", endpoint: "", ownerRepo: "", componentClass: "", product: "",
  validationPosture: "", graphRole: "", catalogRefs: "", validationNotes: "",
};
export function directIntakeTarget(kind: string, name: string) {
  if (!["product", "component"].includes(kind) || !/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
    throw new Error("Select product or component and enter its exact canonical key.");
  }
  return { kind: kind as DirectIntakeKind, name };
}

export function completedDirectIntakeCandidate(page: WorkspaceIntakeRequestPage, requestId: string): WorkspaceIntakeCandidate {
  const entry = page.records.find(record => record.request_id === requestId);
  const source = entry?.candidate;
  if (page.source_class !== "direct" || page.custody_request_id !== null || !["product", "component"].includes(page.target.kind) ||
      page.pending_request_count !== 0 || !entry || entry.status !== "succeeded" ||
      !source || source.source.class !== "direct" || source.target.kind !== page.target.kind ||
      source.target.name !== page.target.name || source.target.record_id !== page.target.record_id) {
    throw new Error("Select a completed direct candidate after reading its exact journal with no pending requests.");
  }
  return { label: source.target.name, target: { kind: source.target.kind, name: source.target.name },
    source: { ...source.source }, requested_record: structuredClone(source.requested_record), evidence_refs: [...source.evidence_refs] };
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
  if (!draft.validationPosture.trim() || !draft.graphRole.trim() || !draft.validationNotes.trim()) {
    throw new Error("Describe the validation posture, WGCF graph role and owner validation evidence before Inventory promotion.");
  }
  const validation = { posture: draft.validationPosture.trim(), wgcf_graph_role: draft.graphRole.trim(),
    catalog_refs: [...new Set(draft.catalogRefs.split(",").map(value => value.trim()).filter(Boolean))], notes: draft.validationNotes.trim() };
  let requested: WorkspaceIntakeRequestedRecord;
  if (target.kind === "product") {
    const sources = [...new Set(draft.sourceOwners.split(",").map(value => value.trim()).filter(Boolean))];
    if (!sources.length || !draft.endpoint.trim()) throw new Error("Provide source owners and the intended endpoint.");
    requested = { kind: "product", notes, platform_owner: owner(draft.platformOwner),
      runtime_owner: owner(draft.runtimeOwner), security_owner: owner(draft.securityOwner),
      source_owners: sources.map(owner), intended_endpoint: draft.endpoint.trim(), validation_behavior: validation };
  } else {
    if (!draft.componentClass.trim()) throw new Error("Provide the component class.");
    const product = draft.product.trim();
    if (product && !activeProducts.includes(product)) throw new Error("The optional product must identify an active product.");
    requested = { kind: "component", notes, owner_repo: owner(draft.ownerRepo),
      security_owner: owner(draft.securityOwner), component_class: draft.componentClass.trim(), product: product || null, validation_behavior: validation };
  }
  // This labels operator-authored metadata; it grants no source-owner authority.
  const bytes = new TextEncoder().encode(JSON.stringify({ target, requested_record: requested }));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const digest = `sha256:${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("")}`;
  const ref = `console://workspace-intake/direct/${target.kind}/${target.name}`;
  return { target, requested_record: requested, label: target.name,
    source: { class: "direct", ref, digest }, evidence_refs: [ref, ...refs] };
}
