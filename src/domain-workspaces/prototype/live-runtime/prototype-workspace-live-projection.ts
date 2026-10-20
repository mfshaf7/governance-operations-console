import type { PrototypeRecord, PrototypeWorkspaceReadModel, PrototypeBasePlatform, PrototypeSupportProfile, PrototypePreviewNeed, PrototypeSourceHome, PrototypeSupportRow } from "../domain/prototype-types.ts";
import { prototypeSupportRowsFromInputs } from "../domain/support/prototype-support-profile-model.ts";
import { prototypeLandingDraftKey, type PrototypeLandingDraft } from "../work-model/workflows/landing/prototype-landing-model.ts";
import { assertPrototypeLandingResult } from "./prototype-landing-live-contract.ts";
import type { PrototypeLandingLiveProjection } from "./prototype-landing-live-types.ts";
import { projectPrototypeLanding } from "./prototype-landing-live-projection.ts";
import { assertPrototypeMaturityResult, prototypeMaturityInputKey } from "./prototype-maturity-live-contract.ts";
import type { PrototypeMaturityInput, PrototypeMaturityLiveProjection, PrototypeMaturityResult } from "./prototype-maturity-live-types.ts";
import { projectPrototypeMaturity } from "./prototype-maturity-live-projection.ts";
import { assertPrototypeClosureResult } from "./prototype-closure-live-contract.ts";
import type { PrototypeClosureResult } from "./prototype-closure-live-types.ts";
import { assertPrototypeDeliveryPacket } from "./prototype-delivery-live-contract.ts";
import type { PrototypeDeliveryPacketProjection } from "../domain/prototype-delivery.ts";

export type PrototypeWorkspaceLiveProjection = {
  sourceRevision: string;
  readModel: PrototypeWorkspaceReadModel;
  landing: Record<string, PrototypeLandingLiveProjection>;
  maturity: Record<string, PrototypeMaturityLiveProjection>;
  closure: Record<string, PrototypeClosureResult>;
};

// Builds UI records only from canonical owner facts and durable OOS progress.
// Empty setup values are visibly unaccepted Landing defaults, not source proof.
export function projectCanonicalPrototypeWorkspace(value: unknown, observedAt: string, sourceRevision?: string): PrototypeWorkspaceLiveProjection {
  const source = object(value), registry = object(source.registry), documents = object(source.documents), workflows = object(source.workflows);
  if (source.schema_version !== 1 || source.workflow_id !== "prototype-records" || !/^[0-9a-f]{40}$/.test(String(source.authority_revision))) invalid();
  const revision = String(source.authority_revision);
  const records = new Map<string, PrototypeRecord>();
  const canonicalLifecycle = new Map<string, PrototypeRecord["lifecycle"]>();
  const deliveryPacketRefs = new Map<string, string>();
  for (const entry of list(source.captures)) {
    const capture = object(entry), packet = object(capture.entry_packet), suggestions = object(packet.suggestions), proposal = object(capture.proposal);
    const slug = slugOf(capture.prototype_id);
    if (records.has(slug)) invalid();
    if (capture.record_ref !== `record://prototype-captures/${slug}` || capture.artifact_type !== "proposal-routed-prototype-capture" || capture.landing_state !== "captured" || capture.lifecycle !== "exploring") invalid();
    const base = baseRecord(slug, text(suggestions.name), "", revision);
    base.ingress = "proposal-routed"; base.origin = "Canonical Proposal capture";
    base.sourceRef = String(capture.record_ref); base.sourcePath = String(capture.record_ref);
    base.linkedRecords = [{ label: String(proposal.proposal_id), level: "proposal", role: "proposal-source", ref: text(proposal.record_ref), system: "workspace-proposals", tone: "info" }];
    records.set(slug, base);
  }
  for (const entry of list(registry.prototypes)) {
    const item = object(entry); const slug = slugOf(`prototype:${text(item.id)}`);
    if (canonicalLifecycle.has(slug)) invalid();
    const base = records.get(slug) ?? baseRecord(slug, text(item.name), typeof item.objective === "string" ? item.objective : "", revision);
    base.name = text(item.name); base.owner = typeof item.owner === "string" ? item.owner : "Workspace Prototype Studio";
    if (typeof item.objective === "string") base.summary = item.objective;
    base.lifecycle = choice(item.lifecycle, ["exploring", "candidate", "baseline-approved", "graduating", "graduated", "retired"]);
    base.dataMode = choice(item.data_mode, ["mock", "synthetic", "real-readonly", "real-mutable"]);
    base.mutationBoundary = choice(item.mutation_boundary, ["none", "prototype-local", "read-only", "external-sandbox", "real-system"]);
    base.visibilityTier = choice(item.visibility_tier, ["private-internal", "operator-review", "client-review", "public-demo"]);
    base.sourceRef = `record://prototypes/${slug}`;
    const paths = item.paths ? object(item.paths) : {};
    base.sourcePath = typeof paths.source === "string" ? paths.source : typeof paths.brief === "string" ? paths.brief : "Owner record has no source path";
    if (typeof paths.design_profile === "string") {
      const path = paths.design_profile;
      if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*\.md$/.test(path) || path.split("/").some(part => !part || part === "." || part === "..")) invalid();
      const ref = `repo://workspace-prototype-studio/${path}`;
      base.evidence = [...base.evidence, { id: ref, label: "Owner design profile", status: "Owner-declared reference", tone: "info", detail: "Canonical registry reference; exact committed file resolution is required at maturity readiness. This is not Preview or application behavior proof." }];
      base.baseline = { ...base.baseline, evidenceRefs: [...base.baseline.evidenceRefs, ref] };
    }
    base.linkedRecords = list(item.linked_records ?? []).map((linked) => { const row = object(linked); return {
      label: text(row.label), level: text(row.level), role: text(row.role), ref: text(row.ref), system: text(row.system), tone: "info" as const,
      ...(typeof row.parent_ref === "string" ? { parentRef: row.parent_ref } : {}),
    }; });
    if (typeof item.candidate_record_ref === "string") {
      const ref = item.candidate_record_ref;
      if (!new RegExp(`^record://prototype-maturity/${slug}/candidate(?:-[0-9a-f]{12})?$`).test(ref)) invalid();
      base.baseline = { ...base.baseline, evidenceRefs: [...base.baseline.evidenceRefs, ref] };
      base.evidence = [...base.evidence, { id: ref, label: "Active Candidate record", status: "Owner-declared reference", tone: "info", detail: "Canonical active cycle reference; exact committed record validation remains owned by WGCF." }];
    }
    const landingRecord = documents[`records/prototype-landings/${slug}/record.json`];
    if (landingRecord) {
      const landed = object(landingRecord), setup = object(landed.setup), custody = object(landed.source);
      if (landed.id !== `prototype:${slug}` || landed.next_action !== "candidate-promotion") invalid();
      const draft = landingDraft(base, setup, { name: landed.name, objective: landed.objective }, custody.posture);
      base.landing = { ...base.landing, basePlatform: draft.basePlatform, sourceHome: draft.sourceHome, supportProfile: draft.supportProfile, supportRows: draft.supportRows, previewNeed: draft.previewNeed, state: "landed" };
      base.sourcePath = text(custody.ref);
      base.sourceEvidence = { authority: "workspace-prototype-studio", posture: choice(custody.posture, ["create-studio-source", "use-existing-studio-source", "reference-dedicated-owner-source", "reference-shared-owner-source", "import-to-studio"]), revision, originDigest: null, importedContentDigest: null };
    }
    if (typeof item.delivery_packet_ref === "string") deliveryPacketRefs.set(slug, item.delivery_packet_ref);
    canonicalLifecycle.set(slug, base.lifecycle); records.set(slug, base);
  }
  const landing: PrototypeWorkspaceLiveProjection["landing"] = {};
  const maturity: PrototypeWorkspaceLiveProjection["maturity"] = {};
  const closure: PrototypeWorkspaceLiveProjection["closure"] = {};
  for (const entry of ordered(list(workflows.landing))) {
    const result = assertPrototypeLandingResult(entry), slug = slugOf(result.prototype_id), base = records.get(slug);
    if (!base) continue;
    const draft = landingDraft(base, object(result.request.setup), object(result.request.prototype), object(result.request.source_plan).posture);
    const projection = { recordId: base.id, draft, draftKey: prototypeLandingDraftKey(draft), result };
    landing[base.id] = projection;
    records.set(slug, projectPrototypeLanding({ record: base, projection }));
  }
  for (const entry of ordered(list(workflows.maturity))) {
    const result = assertPrototypeMaturityResult(entry), slug = slugOf(result.prototype_id), base = records.get(slug);
    if (!base) continue;
    const input = maturityInput(result), projection = { recordId: base.id, input, inputKey: prototypeMaturityInputKey(input), result };
    maturity[base.id] = projection;
    // Restore the reviewed owner draft without calling it a completed promotion.
    const draftBase = input.transition === "candidate-promotion" ? { ...base, candidate: { ...base.candidate, ...input.input, decision: base.candidate.decision } } : base;
    records.set(slug, projectPrototypeMaturity({ record: draftBase, projection }));
  }
  for (const entry of ordered(list(workflows.closure))) {
    const result = assertPrototypeClosureResult(entry, text(object(entry).request_id)), slug = slugOf(`prototype:${result.prototype_id}`), base = records.get(slug);
    if (base) closure[base.id] = result;
  }
  const deliveryPackets: Record<string, PrototypeDeliveryPacketProjection> = {};
  for (const [slug, base] of records) {
    const lifecycle = canonicalLifecycle.get(slug);
    if (lifecycle) base.lifecycle = lifecycle;
    // Canonical setup is already landed before historical workflows are
    // replayed. Do not retain its capture action or rerun a local transition
    // merely to reconstruct navigation after a cold read.
    const pendingMaturity = maturity[base.id]?.result;
    if (["exploring", "candidate", "baseline-approved"].includes(base.lifecycle) && pendingMaturity &&
      ["accepted", "evaluating", "decision-required", "preparing", "review-required", "cancelling"].includes(pendingMaturity.status)) {
      // Source merge and the owner's final acknowledgement are separate facts.
      // Keep the existing resume surface reachable until that request finishes.
      const candidate = pendingMaturity.transition === "candidate-promotion";
      base.currentMove = { id: pendingMaturity.transition, actionLabel: candidate ? "Open Candidate Promotion" : "Open Baseline Promotion", label: "Continue owner promotion", detail: "The retained owner request is still pending. Inspect its progress and complete its receipt/readback before moving on.", tone: "info" };
    } else if (base.lifecycle === "exploring" && base.landing.state === "landed" && base.currentMove.id === "landing") {
      base.currentMove = { id: "candidate-promotion", actionLabel: "Open Candidate Promotion", label: "Prepare candidate promotion", detail: "Canonical Studio Landing setup is accepted. Continue Candidate Promotion; no new Landing submission is required.", tone: "info" };
    } else if (base.lifecycle === "candidate" && ["landing", "candidate-promotion"].includes(base.currentMove.id)) {
      base.currentMove = base.landing.previewNeed === "none" || base.preview.proofState === "proof-ready"
        ? { id: "baseline-promotion", actionLabel: "Open Baseline Promotion", label: "Review baseline evidence", detail: "Canonical Studio lifecycle is Candidate; inspect the separately owned baseline evidence.", tone: "info" }
        : { id: "preview-proof", actionLabel: "Open Preview Runtime", label: "Inspect preview evidence", detail: "Canonical Studio lifecycle is Candidate. Preview proof is not inferred from Landing or promotion.", tone: "info" };
    } else if (base.lifecycle === "baseline-approved" && ["landing", "candidate-promotion", "baseline-promotion", "preview-proof"].includes(base.currentMove.id)) {
      base.currentMove = { id: "movement-request", actionLabel: "Open Movement Request", label: "Prepare owner-backed Delivery handoff", detail: "Canonical Studio lifecycle is Baseline approved; Delivery and custody retain their own gates.", tone: "info" };
    }
    if (base.lifecycle === "graduated" || base.lifecycle === "retired") base.currentMove = { id: "archive", label: "Inspect retained source", actionLabel: "Open History", detail: "Canonical Studio lifecycle is terminal; mutation requires the owner's explicit reopen route.", tone: "muted" };
    else if (base.lifecycle === "graduating") base.currentMove = { id: "closeout-retirement", label: "Inspect source graduation", actionLabel: "Open Closeout", detail: "Continue the owner-backed graduation and custody handoff.", tone: "info" };
    const packetRef = deliveryPacketRefs.get(slug);
    if (packetRef) {
      if (!/^record:\/\/delivery-packets\/[a-z0-9-]+$/.test(packetRef)) invalid();
      const packet = assertPrototypeDeliveryPacket(documents[`records/${packetRef.slice("record://".length)}.json`]);
      if (packet.packet_ref !== packetRef || packet.content.source.prototype_id !== slug || packet.content.source.record_ref !== `record://prototypes/${slug}`) invalid();
      deliveryPackets[base.id] = { authority: "workspace-prototype-studio", packet };
    }
  }
  return { sourceRevision: sourceRevision ?? revision, readModel: { records: [...records.values()], deliveryPacketsByPrototypeId: deliveryPackets,
    source: { lastRead: observedAt, project: "Workspace Prototype Studio", recordSystem: "Canonical Studio records and OOS progress", registry: `main@${revision}`, mutationGateway: "OOS owner workflows" } }, landing, maturity, closure };
}

function baseRecord(slug: string, name: string, objective: string, revision: string): PrototypeRecord {
  const id = `prototype-${slug}`;
  const supportRows = prototypeSupportRowsFromInputs({ dataMode: "synthetic", mutationBoundary: "none", visibilityTier: "private-internal", previewNeed: "static-review", sourceHome: "new-prototype-folder", supportProfile: "custom-support", sourceContext: "" }).map((row) => ({ ...row, state: "unknown" as const, summary: "Awaiting operator Landing acceptance", detail: "The canonical capture does not yet contain an accepted setup decision.", tone: "warn" as const }));
  return {
    id, name, summary: objective, owner: "Workspace Prototype Studio", origin: "Canonical Studio register", lifecycle: "exploring", ingress: "existing-source",
    sourceRef: `record://prototypes/${slug}`, sourcePath: "Not yet landed", projectionVersion: revision, projectionFreshness: "Current canonical owner snapshot; unset setup fields still require Landing acceptance",
    dataMode: "synthetic", mutationBoundary: "none", visibilityTier: "private-internal", tone: "info", receipts: [], evidence: [], linkedRecords: [],
    currentMove: { id: "landing", actionLabel: "Open Landing", label: "Complete Landing setup", detail: "The owner capture exists. Review and accept its still-unset implementation and support choices.", tone: "warn" },
    landing: { state: "captured", basePlatform: "custom-unassigned", sourceHome: "new-prototype-folder", previewNeed: "static-review", supportProfile: "custom-support", supportRows, setupItems: [], validationPlan: [], requiredEvidence: [], securityTriggers: [], blockedItems: [], firstRequiredMove: "candidate-promotion", lastLandingReceiptRef: null },
    candidate: { audience: { kind: "unassigned", label: "" }, decision: null, objective, proof: { criterion: "", method: "unassigned" }, scope: { included: [], excluded: [] }, state: "not-started", lastReceiptRef: null },
    baseline: { acceptedSummary: "", excludedSummary: "", baselineTitle: "", baselineStatement: "", evidenceDisposition: "", issueDisposition: "", evidenceRefs: [], missingItems: ["Owner Landing and promotion evidence"], openIssueRefs: [], lastPacketReceiptRef: null, state: "not-started" },
    preview: { address: "Not observed", command: "", healthcheckPath: "/", launchAdapter: "unassigned", port: "Not reserved", profileRef: "", profileSource: "Read the Preview owner", profileState: "no-profile", proofState: "not-started", runtimeState: "unknown", workingDirectory: "Not yet landed", lastCheckLogRef: null, lastCheckedAt: null, lastProofRef: null },
    openIssues: [], lastMovementReceiptRef: null,
    movementRequest: { gateSnapshot: [], lastMovementReceiptRef: null, movementType: "baseline", requestReason: "Owner maturity and movement evidence have not yet been projected.", state: "not-prepared", targetHome: "Workspace Delivery ART", targetLane: "dev-integration", targetOwner: "operator-orchestration-service" },
  };
}

function landingDraft(base: PrototypeRecord, setup: Record<string, unknown>, prototype: Record<string, unknown>, posture: unknown): PrototypeLandingDraft {
  const support = mapped(setup.support_profile, { simple: "simple-prototype", interactive: "interactive-prototype", custom: "custom-support" });
  const preview = mapped(setup.preview_mode, { static: "static-review" });
  const dataMode = choice(setup.data_mode, ["mock", "synthetic", "real-readonly", "real-mutable"]);
  const mutationBoundary = choice(mapped(setup.mutation_boundary, { "local-only": "prototype-local", sandbox: "external-sandbox", "real-system-blocked": "real-system" }), ["none", "prototype-local", "read-only", "external-sandbox", "real-system"]);
  const visibilityTier = choice(setup.visibility === "private" ? "private-internal" : setup.visibility, ["private-internal", "operator-review", "client-review", "public-demo"]);
  const supportProfile = choice(support, ["simple-prototype", "interactive-prototype", "custom-support", "existing-source-review", "external-dependency", "local-runtime"]) as PrototypeSupportProfile;
  const knownPlatforms = ["container-compose", "custom-unassigned", "docs-only", "existing-source", "fastapi", "flask", "nextjs-app", "node-express", "static-site", "vite-react"];
  const basePlatform = (knownPlatforms.includes(String(setup.scaffold_profile)) ? setup.scaffold_profile : "custom-unassigned") as PrototypeBasePlatform;
  const previewNeed = choice(preview, ["none", "static-review", "local-dev-server", "local-backend-stub", "prototype-devint", "future-dev-integration"]) as PrototypePreviewNeed;
  const sourceHome: PrototypeSourceHome = posture === "reference-dedicated-owner-source" ? "existing-source" : posture === "reference-shared-owner-source" ? "app-folder" : "new-prototype-folder";
  const defaults = prototypeSupportRowsFromInputs({ dataMode, mutationBoundary, visibilityTier, previewNeed, sourceHome, supportProfile, sourceContext: base.sourceRef });
  const supportRows = list(setup.support_rows).map((entry): PrototypeSupportRow => {
    const item = object(entry), pattern = defaults.find((row) => row.id === item.dimension);
    if (!pattern) invalid();
    const state = choice(item.state, ["unknown", "needed", "not-needed", "ready", "blocked"]);
    return { ...pattern, state, detail: text(item.detail), summary: text(item.detail), tone: state === "blocked" ? "danger" : state === "ready" || state === "not-needed" ? "ok" : "warn" };
  });
  return { name: text(prototype.name), summary: text(prototype.objective), owner: base.owner, dataMode, mutationBoundary, visibilityTier, supportProfile, basePlatform, previewNeed, sourceHome, supportRows };
}

function maturityInput(result: PrototypeMaturityResult): PrototypeMaturityInput {
  const values = result.request.inputs.editable_values;
  const decision = result.decision?.decision ?? result.receipt?.decision;
  if (result.transition === "baseline-promotion") return { transition: "baseline-promotion", input: {
    baselineStatement: text(values["baseline-statement"]), baselineTitle: text(values["baseline-title"]),
    decision: choice(decision ?? "approve-baseline", ["approve-baseline", "block-baseline", "route-closeout"]), evidenceDisposition: text(values["missing-evidence-disposition"]), issueDisposition: text(values["issue-and-risk-disposition"]),
  } };
  const audience = /^(.*) \(([^()]*)\)$/.exec(text(values["target-user"]));
  const proof = /^(.*) \(([^()]*)\)$/.exec(text(values["expected-proof"]));
  return { transition: "candidate-promotion", input: {
    audience: { label: audience?.[1] ?? text(values["target-user"]), kind: audience ? choice(audience[2], ["client-reviewer", "external-user", "internal-user", "self", "unassigned"]) : "unassigned" },
    decision: choice(decision ?? "promote-candidate", ["promote-candidate", "block-promotion", "route-closeout"]), objective: text(values["prototype-objective"]),
    proof: { criterion: proof?.[1] ?? text(values["expected-proof"]), method: proof ? choice(proof[2], ["demonstration", "operator-review", "technical-validation", "unassigned", "user-feedback"]) : "unassigned" },
    scope: { included: list(values["accepted-scope"]).map(text), excluded: list(values["excluded-scope"]).map(text) },
  } };
}

function invalid(): never { throw new Error("Canonical Prototype records or retained owner progress are malformed."); }
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) invalid(); return value as Record<string, unknown>; }
function list(value: unknown): unknown[] { if (!Array.isArray(value) || value.length > 1536) invalid(); return value; }
function text(value: unknown): string { if (typeof value !== "string" || !value.trim()) invalid(); return value; }
function slugOf(value: unknown) { const match = /^prototype:([a-z0-9][a-z0-9._-]*)$/.exec(text(value)); if (!match) invalid(); return match[1]; }
function choice<const T extends string>(value: unknown, choices: readonly T[]): T { if (typeof value !== "string" || !choices.includes(value as T)) invalid(); return value as T; }
function mapped(value: unknown, mapping: Record<string, string>) { return mapping[String(value)] ?? value; }
function ordered(values: unknown[]) { return [...values].sort((a, b) => {
  const left = object(a), right = object(b), leftTime = object(list(left.history)[0]).at, rightTime = object(list(right.history)[0]).at;
  return String(leftTime).localeCompare(String(rightTime)) || String(left.request_id).localeCompare(String(right.request_id));
}); }

export function prototypeOwnerProgressIsNewer(candidate: { request_id: string; revision: number; history: readonly { at: string }[] }, current?: { request_id: string; revision: number; history: readonly { at: string }[] }) {
  if (!current) return true;
  if (candidate.request_id === current.request_id) return candidate.revision > current.revision;
  return String(candidate.history[0]?.at).localeCompare(String(current.history[0]?.at)) > 0;
}
