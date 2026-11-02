export type NativeReleaseWorkflow = Readonly<{
 schema_version:1; workflow_id:"readiness"|"promotion"|"runtime"; capability_id:string;
 action:"governed-release.execute-step"|"governed-release.change-runtime-lifecycle";
 available:boolean; unavailable_reason:string|null; source_version:string;
 fields:readonly Readonly<{id:string;label:string;description:string;kind:"text"|"select";required:boolean;options:readonly Readonly<{label:string;value:string}>[];default_value:string}>[];
}>;
export type ReleaseWorkflowEvidence = Readonly<{
 schema_version:1;workflow_id:"readiness"|"promotion"|"runtime";phase:string;
 run_id:number|null;run_url:string|null;pull_request_url:string|null;branch:string|null;merge_commit:string|null;desired_state_verified:boolean;
}>;

const WORKFLOWS = new Set(["readiness", "promotion", "runtime"]);
const PHASES = new Set(["prepared", "dispatching", "uncertain", "queued", "awaiting-approval", "in-progress", "awaiting-review", "applied", "no-change", "failed", "cancelled"]);
function fail(): never { throw new Error("The owner release workflow data is invalid."); }
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))) fail();
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 2048, empty = false): asserts value is string {
  if (typeof value !== "string" || (!empty && !value.trim()) || value.length > max) fail();
}

export function assertNativeReleaseWorkflow(value: unknown, workflowId: string, sourceVersion: string): NativeReleaseWorkflow {
  const item = object(value, ["schema_version", "workflow_id", "capability_id", "action", "available", "unavailable_reason", "source_version", "fields"]) as unknown as NativeReleaseWorkflow;
  if (item.schema_version !== 1 || !WORKFLOWS.has(item.workflow_id) || item.workflow_id !== workflowId || item.source_version !== sourceVersion || item.capability_id !== "release.openclaw." + workflowId || item.action !== (workflowId === "runtime" ? "governed-release.change-runtime-lifecycle" : "governed-release.execute-step") || typeof item.available !== "boolean") fail();
  if (item.available ? item.unavailable_reason !== null : typeof item.unavailable_reason !== "string" || !item.unavailable_reason.trim() || item.unavailable_reason.length > 1000) fail();
  if (!Array.isArray(item.fields) || (item.available && item.fields.length < 1) || item.fields.length > 24) fail();
  const ids = new Set();
  for (const raw of item.fields) {
    const field = object(raw, ["id", "label", "description", "kind", "required", "options", "default_value"]) as unknown as NativeReleaseWorkflow["fields"][number];
    text(field.id, 150); text(field.label, 200); text(field.description); text(field.default_value, 2048, true);
    if (!/^[a-z][a-z0-9_:-]*$/.test(field.id) || ids.has(field.id) || typeof field.required !== "boolean" || !["text", "select"].includes(field.kind) || !Array.isArray(field.options) || field.options.length > 8 || (field.kind === "text" ? field.options.length !== 0 : field.options.length === 0)) fail();
    ids.add(field.id);
    const values = new Set();
    for (const raw of field.options) {
      const option = object(raw, ["label", "value"]) as {label: string; value: string}; text(option.label, 200); text(option.value, 200);
      if (values.has(option.value)) fail(); values.add(option.value);
    }
    if (field.kind === "select" && field.default_value && !values.has(field.default_value)) fail();
  }
  return item;
}

export function assertReleaseWorkflowEvidence(value: unknown, action: string): ReleaseWorkflowEvidence {
  const item = object(value, ["schema_version", "workflow_id", "phase", "run_id", "run_url", "pull_request_url", "branch", "merge_commit", "desired_state_verified"]) as unknown as ReleaseWorkflowEvidence;
  if (item.schema_version !== 1 || !WORKFLOWS.has(item.workflow_id) || !PHASES.has(item.phase) || typeof item.desired_state_verified !== "boolean" || item.desired_state_verified !== ["applied", "no-change"].includes(item.phase)) fail();
  if (action !== (item.workflow_id === "runtime" ? "governed-release.change-runtime-lifecycle" : "governed-release.execute-step")) fail();
  if (item.run_id !== null && (!Number.isSafeInteger(item.run_id) || item.run_id < 1)) fail();
  if (item.run_url !== (item.run_id === null ? null : "https://github.com/mfshaf7/platform-engineering/actions/runs/" + item.run_id)) fail();
  if (item.pull_request_url !== null && (typeof item.pull_request_url !== "string" || !/^https:\/\/github\.com\/mfshaf7\/platform-engineering\/pull\/[1-9][0-9]{0,15}$/.test(item.pull_request_url))) fail();
  const prefix = item.workflow_id === "readiness" ? "stage/approve-" : item.workflow_id === "promotion" ? "promote/prod-" : "prod/openclaw-(?:live|traffic-stopped|suspended|quarantined)-";
  if (item.branch !== null && (item.run_id === null || typeof item.branch !== "string" || !new RegExp("^" + prefix + item.run_id + "$" ).test(item.branch))) fail();
  if (item.merge_commit !== null && (typeof item.merge_commit !== "string" || !/^[0-9a-f]{40}$/.test(item.merge_commit))) fail();
  if (item.phase === "applied" && (!item.merge_commit || !item.pull_request_url || !item.branch)) fail();
  if (["queued", "awaiting-approval", "in-progress", "awaiting-review", "applied", "no-change", "cancelled"].includes(item.phase) && item.run_id === null) fail();
  if (item.merge_commit !== null && item.phase !== "applied") fail();
  return item;
}
