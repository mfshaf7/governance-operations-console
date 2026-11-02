import { assertDevIntegrationProfile, type DevIntegrationProfile } from "../model/dev-integration-profile.ts";
import type { DevIntegrationProfileRequest } from "../model/dev-integration-profile-request.ts";
import type { DevIntegrationRequestOptions } from "../model/dev-integration-request-options.ts";

export type ProfileRequestIntent = Omit<DevIntegrationProfileRequest, "requestedAt" | "requestedBy">;
export type ProfileRequestRecord = Readonly<{
  schema_version: 1; workflow_id: "dev-integration-profile-request"; request_id: string;
  request: ProfileRequestIntent; expected_source_version: string; intent_digest: string; operator_id: string;
  state: "recorded";
  created_at: string; updated_at: string; request_ref: string; readback: "current";
  receipt: { request_ref:string;request_id:string;intent_digest:string;operator_id:string;recorded_at:string;outcome:"request-recorded";digest:string };
  admission: {state:"not-checked"|"unavailable"|"not-registered"|"registered"|"different-request";
    lifecycle:DevIntegrationProfile["lifecycle"]|null;source_version:string|null;observed_at:string|null;profile_ref:string|null};
  next_action: { code: string; owner: string; reason: string };
}>;
export type OwnerProfile = Readonly<{
  profile_id: string; owner_repo: string; lifecycle: DevIntegrationProfile["lifecycle"];
  lane_class: DevIntegrationProfile["laneClass"]; purpose: string | null;
  participating_repos: string[]; dependencies: string[]; request_record_ref: string | null;
  runtime: { platform: string | null; state_model: "persistent" | "disposable" | null;
    observation: { state: DevIntegrationProfile["runtime"]["observation"]["state"]; observed_at: string | null; source_ref: string | null } };
  expected_writes: { classification: DevIntegrationProfile["expectedWrites"]["classification"]; targets: string[] } | null;
  persistence: Record<string, string | null> | null; security_owner: string | null;
  security_triggers: DevIntegrationProfile["securityTriggers"] | null; admission_refs: string[];
  source: { ref: string; registry_revision: string; owner_revision: string | null };
  stage_handoff: { owner_repo: string | null; governed_surface: string | null;
    required_checks: { id: string; label: string }[]; result: "unknown"; check_results: [];
    smoke_summary_ref: string | null; session_manifest_ref: string | null; promotion_report_ref: string | null };
  gaps: string[];
}>;
export type OwnerProfileProjection = Readonly<{
  schema_version: 1; source_version: string; observed_at: string;
  owner_versions: Record<string, string | null>; profiles: OwnerProfile[];
  request_options: { owner_repos: string[]; lane_classes: DevIntegrationProfile["laneClass"][];
    runtime_platforms: string[]; state_models: ("persistent" | "disposable")[] };
  page: { offset: number; limit: number; total: number; next_offset: number | null };
}>;

function invalid(): never { throw new Error("The profile workflow returned an invalid bounded response."); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function exact(value: unknown, keys: string[]) {
  const row = object(value);
  if (Object.keys(row).length !== keys.length || keys.some(key => !(key in row))) invalid();
  return row;
}
const text = (value: unknown) => typeof value === "string" && value.trim().length > 0 && value.length <= 4096;
const nullableText = (value: unknown) => value === null || text(value);
const strings = (value: unknown) => Array.isArray(value) && value.length <= 128 && value.every(text);

export function assertOwnerProfileProjection(value: unknown): OwnerProfileProjection {
  const row = exact(value, ["schema_version", "source_version", "observed_at", "owner_versions", "profiles", "request_options", "page"]);
  if (row.schema_version !== 1 || !/^registry:[a-f0-9]{40}$/.test(String(row.source_version)) ||
      !Number.isFinite(Date.parse(String(row.observed_at))) || !Array.isArray(row.profiles) || row.profiles.length > 25) invalid();
  if (Object.entries(object(row.owner_versions)).some(([owner,revision]) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(owner) || (revision !== null && !/^[a-f0-9]{40}$/.test(String(revision))))) invalid();
  const choices = exact(row.request_options, ["owner_repos", "lane_classes", "runtime_platforms", "state_models"]);
  if (Object.values(choices).some(value => !strings(value))) invalid();
  if ((choices.lane_classes as string[]).some(value => !["prototype-devint","integration-devint","governed-devint"].includes(value)) ||
      (choices.state_models as string[]).some(value => !["disposable","persistent"].includes(value))) invalid();
  const page = exact(row.page, ["offset", "limit", "total", "next_offset"]);
  if (![page.offset, page.limit, page.total].every(value => Number.isSafeInteger(value) && Number(value) >= 0) || Number(page.limit) < 1 || Number(page.limit) > 25 ||
      (page.next_offset !== null && (!Number.isSafeInteger(page.next_offset) || Number(page.next_offset) <= Number(page.offset)))) invalid();
  for (const value of row.profiles) {
    const p = exact(value, ["profile_id", "owner_repo", "lifecycle", "lane_class", "purpose", "participating_repos", "dependencies", "request_record_ref",
      "runtime", "expected_writes", "persistence", "security_owner", "security_triggers", "admission_refs", "source", "stage_handoff", "gaps"]);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(p.profile_id)) || !text(p.owner_repo) || !nullableText(p.purpose) || !nullableText(p.request_record_ref) || !nullableText(p.security_owner)) invalid();
    if (!["active","proposed","build-admitted","suspended","retired"].includes(String(p.lifecycle)) || !["prototype-devint","integration-devint","governed-devint"].includes(String(p.lane_class))) invalid();
    for (const key of ["participating_repos", "dependencies", "admission_refs", "gaps"]) if (!strings(p[key])) invalid();
    if (p.security_triggers !== null && !strings(p.security_triggers)) invalid();
    const runtime = exact(p.runtime, ["platform", "state_model", "observation"]);
    if (!nullableText(runtime.platform) || ![null, "disposable", "persistent"].includes(runtime.state_model as null | string)) invalid();
    const observation = exact(runtime.observation, ["state", "observed_at", "source_ref"]);
    if (!["unknown", "running", "stopped", "starting", "stopping", "failed", "degraded", "unavailable"].includes(String(observation.state)) ||
        !nullableText(observation.source_ref) || (observation.observed_at !== null && !Number.isFinite(Date.parse(String(observation.observed_at))))) invalid();
    if (observation.state !== "unknown" && (!observation.observed_at || !observation.source_ref)) invalid();
    if (p.expected_writes !== null) { const writes = exact(p.expected_writes, ["classification", "targets"]); if (!["none", "prototype-local", "canonical-backend", "external-sandbox"].includes(String(writes.classification)) || !strings(writes.targets)) invalid(); }
    if (p.persistence !== null) { const persistence = exact(p.persistence, ["justification", "retained_data_scope", "suspend_resume_semantics", "storage_size_or_class", "reset_semantics", "cutover_plan"]); if (!Object.values(persistence).every(nullableText)) invalid(); }
    const source = exact(p.source, ["ref", "registry_revision", "owner_revision"]);
    if (!text(source.ref) || !/^[a-f0-9]{40}$/.test(String(source.registry_revision)) || (source.owner_revision !== null && !/^[a-f0-9]{40}$/.test(String(source.owner_revision)))) invalid();
    const handoff = exact(p.stage_handoff, ["owner_repo", "governed_surface", "required_checks", "result", "check_results", "smoke_summary_ref", "session_manifest_ref", "promotion_report_ref"]);
    if (handoff.result !== "unknown" || !Array.isArray(handoff.required_checks) || handoff.required_checks.length > 128 || !Array.isArray(handoff.check_results) || handoff.check_results.length) invalid();
    for (const check of handoff.required_checks) { const item = exact(check, ["id", "label"]); if (!text(item.id) || !text(item.label)) invalid(); }
    for (const key of ["owner_repo", "governed_surface", "smoke_summary_ref", "session_manifest_ref", "promotion_report_ref"]) if (!nullableText(handoff[key])) invalid();
  }
  const typed = value as OwnerProfileProjection;
  typed.profiles.forEach(profile => toDevIntegrationProfile(profile, typed));
  return typed;
}

export function toDevIntegrationProfile(p: OwnerProfile, projection: OwnerProfileProjection): DevIntegrationProfile {
  const observation = p.runtime.observation;
  const profile: DevIntegrationProfile = {
    profileId: p.profile_id, ownerRepo: p.owner_repo, lifecycle: p.lifecycle, laneClass: p.lane_class,
    purpose: p.purpose ?? "Purpose not recorded", participatingRepos: p.participating_repos, dependencies: p.dependencies,
    requestRecordRef: p.request_record_ref ?? "Not recorded", runtime: { platform: p.runtime.platform ?? "Not recorded",
      stateModel: p.runtime.state_model ?? "unknown", observation: { state: observation.state !== "unknown" && Math.abs(Date.now() - Date.parse(observation.observed_at ?? "")) > 120000 ? "unknown" : observation.state,
        observedAt: observation.observed_at, sourceRef: observation.source_ref } },
    expectedWrites: p.expected_writes ?? { classification: "unknown", targets: [] },
    persistence: null, declaredPersistence: p.persistence,
    securityOwner: p.security_owner ?? "Not recorded", securityTriggers: p.security_triggers ?? [], admissionRefs: p.admission_refs,
    supportGaps: ["persistence", ...(!p.expected_writes ? ["expected-writes"] : []), ...(p.security_triggers === null ? ["security-triggers"] : [])],
    actions: [], nextMove: null,
    source: { provenance: "authority-snapshot", ref: p.source.ref, source: "Workspace Governance and profile owner",
      version: `${projection.source_version}:${p.source.owner_revision ?? "owner-unavailable"}`, observedAt: projection.observed_at },
    stageHandoff: { ownerRepo: p.stage_handoff.owner_repo ?? "Not recorded", governedSurface: p.stage_handoff.governed_surface ?? "Not recorded",
      result: "unknown", requiredChecks: p.stage_handoff.required_checks.map(check => ({ id: check.id, label: check.label, description: "Owner-declared check; a current per-check outcome is not recorded." })),
      checkResults: [], sessionManifestRef: p.stage_handoff.session_manifest_ref, smokeSummaryRef: p.stage_handoff.smoke_summary_ref,
      promotionReportRef: p.stage_handoff.promotion_report_ref },
  };
  assertDevIntegrationProfile(profile);
  return profile;
}

export function requestOptionsFromOwner(projection: OwnerProfileProjection): DevIntegrationRequestOptions {
  const options = projection.request_options;
  return { ownerRepos: options.owner_repos, participatingRepos: options.owner_repos, dependencyRefs: options.owner_repos,
    laneClasses: options.lane_classes.map(value => ({ value, label: value === "governed-devint" ? "Governed dev integration" : value === "integration-devint" ? "Integration dev environment" : "Prototype dev environment" })),
    runtimePlatforms: options.runtime_platforms, runtimeStateModels: options.state_models.map(value => ({ value, label: value === "persistent" ? "Persistent" : "Disposable" })),
    expectedWriteClasses: [{ value: "none", label: "No writes" }, { value: "prototype-local", label: "Prototype local" }, { value: "external-sandbox", label: "External sandbox" }, { value: "canonical-backend", label: "Canonical backend" }],
    securityTriggers: [{ value: "identity", label: "Identity" }, { value: "secrets", label: "Secrets" }, { value: "runtime-privilege", label: "Runtime privilege" }, { value: "ai-review", label: "AI review" }] };
}

export function assertProfileRequestRecord(value: unknown): ProfileRequestRecord {
  const record = exact(value, ["schema_version", "workflow_id", "request_id", "request", "expected_source_version", "intent_digest", "operator_id", "state", "created_at", "updated_at", "request_ref", "receipt", "admission", "readback", "next_action"]);
  if (record.schema_version !== 1 || record.workflow_id !== "dev-integration-profile-request" || !/^devint-request:[A-Za-z0-9._:-]+$/.test(String(record.request_id)) ||
      record.state !== "recorded" || record.readback !== "current" ||
      !text(record.operator_id) || !/^registry:[a-f0-9]{40}$/.test(String(record.expected_source_version)) || !/^sha256:[a-f0-9]{64}$/.test(String(record.intent_digest)) ||
      !Number.isFinite(Date.parse(String(record.created_at))) || !Number.isFinite(Date.parse(String(record.updated_at)))) invalid();
  const request = exact(record.request, ["profileId", "ownerRepo", "purpose", "laneClass", "participatingRepos", "runtimePlatform", "runtimeStateModel", "dependencies", "expectedWrites", "securityTriggers", "persistence", "replacesProfileId"]);
  if (!text(request.profileId) || !text(request.ownerRepo) || !text(request.purpose) || !strings(request.participatingRepos) || !strings(request.dependencies) || !strings(request.securityTriggers)) invalid();
  if (!text(request.runtimePlatform) || !["disposable","persistent"].includes(String(request.runtimeStateModel)) ||
      !["prototype-devint","integration-devint","governed-devint"].includes(String(request.laneClass)) ||
      !(request.participatingRepos as string[]).includes(String(request.ownerRepo)) || !nullableText(request.replacesProfileId) ||
      (request.securityTriggers as string[]).some(value => !["identity","secrets","runtime-privilege","ai-review"].includes(value))) invalid();
  const writes = exact(request.expectedWrites,["classification","targets"]);
  if (!["none","prototype-local","canonical-backend","external-sandbox"].includes(String(writes.classification)) || !strings(writes.targets) ||
      (writes.classification === "none") !== ((writes.targets as string[]).length === 0)) invalid();
  if (request.runtimeStateModel === "disposable" && request.persistence !== null) invalid();
  if (request.runtimeStateModel === "persistent") {
    const persistence = exact(request.persistence,["justification","retainedDataScope","suspendResumeSemantics","storageRequirement","destructiveResetSemantics","cutoverPlan","sharedSmokeMutationMode","disposableCompanionProfileId"]);
    if (![persistence.justification,persistence.retainedDataScope,persistence.suspendResumeSemantics,persistence.storageRequirement,persistence.destructiveResetSemantics].every(text) ||
      typeof persistence.cutoverPlan !== "string" || persistence.sharedSmokeMutationMode !== "read-only" || !nullableText(persistence.disposableCompanionProfileId)) invalid();
  }
  const next = exact(record.next_action, ["code", "owner", "reason"]); if (!Object.values(next).every(text)) invalid();
  if (record.request_ref !== `oos://dev-integration/requests/${record.request_id}`) invalid();
  const receipt = exact(record.receipt, ["request_ref","request_id","intent_digest","operator_id","recorded_at","outcome","digest"]);
  if (receipt.request_ref !== record.request_ref || receipt.request_id !== record.request_id || receipt.intent_digest !== record.intent_digest ||
    receipt.operator_id !== record.operator_id || receipt.recorded_at !== record.created_at || receipt.outcome !== "request-recorded" || !/^sha256:[a-f0-9]{64}$/.test(String(receipt.digest))) invalid();
  const admission = exact(record.admission,["state","lifecycle","source_version","observed_at","profile_ref"]);
  if (!["not-checked","unavailable","not-registered","registered","different-request"].includes(String(admission.state)) ||
    (admission.lifecycle !== null && !["active","proposed","build-admitted","suspended","retired"].includes(String(admission.lifecycle))) ||
    !nullableText(admission.source_version) || !nullableText(admission.profile_ref) ||
    (admission.observed_at !== null && !Number.isFinite(Date.parse(String(admission.observed_at))))) invalid();
  if (admission.state === "registered" && (!admission.lifecycle || !admission.source_version || !admission.observed_at || admission.profile_ref !== `profile:${request.profileId}`)) invalid();
  return value as ProfileRequestRecord;
}
