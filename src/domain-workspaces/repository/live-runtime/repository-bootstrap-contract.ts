export type OwnerBootstrapSummary = {
  requestId: string; ownerRepo: string; state: string; revision: string; sourceRevision: string | null;
  sourceStartDigest: string; sessionId: string | null; sourceIntentRef: string | null; nextAction: string;
  draft: { state: string; digest: string; revision: string } | null;
  sourceDelivery: Record<string, { state: string; command: Record<string, unknown>; pullRequest: { url: string; head_commit: string } | null }>;
  existingCheckout: { state: string; command: Record<string, unknown> } | null;
  cancellation: { state: string; command: Record<string, unknown> } | null;
};
export const ownerBootstrapFiles = ["AGENTS.md", "README.md", "Makefile", ".gitignore", "scripts/validate_owner.py", "tests/test_owner_bootstrap.py",
  "contracts/delivery-art-work-session/evidence-profile.json", "contracts/delivery-art-work-session/evidence-profile.schema.json",
  "contracts/delivery-art-work-session/source-bootstrap.json", ".github/workflows/validate.yaml"];
export function bootstrapObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Owner setup returned malformed evidence.");
  return value as Record<string, unknown>;
}
export function bootstrapClosed(value: unknown, fields: string[]) {
  const item = bootstrapObject(value);
  if (Object.keys(item).sort().join(",") !== [...fields].sort().join(",")) throw new Error("Owner setup contains unauthorized fields.");
  return item;
}
export function bootstrapId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:/@+\-]{0,255}$/.test(value)) throw new Error("Owner setup requires its exact bounded identity.");
  return value;
}
export function bootstrapOwner(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9._-]*$/.test(value)) throw new Error("Select one exact repository owner.");
  return value;
}
export function bootstrapDigest(value: unknown): string {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value)) throw new Error("Owner setup requires exact digest evidence.");
  return value;
}
export function bootstrapTime(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error("Owner setup requires its retained timestamp.");
  return value;
}
export function projectOwnerBootstrap(value: unknown): OwnerBootstrapSummary {
  const item = bootstrapObject(value);
  if (item.schema_version !== 1 || item.workflow_id !== "repository-owner-bootstrap" ||
      item.app_acceptance !== false || item.inventory_admission !== false || item.runtime_activation !== false ||
      !["prepared", "existing-controls-inspected", "source-work", "source-created", "succeeded", "cancelled"].includes(String(item.state))) throw new Error("Owner controls are not app acceptance or admission.");
  const next = bootstrapClosed(item.next_action, ["code", "authority"]);
  if (next.authority !== "operator-orchestration-service") throw new Error("Owner setup authority changed.");
  const draft = item.draft == null ? null : bootstrapObject(item.draft);
  const retainedControl = (value: unknown, cancel = false) => {
    if (value == null) return null;
    const control = bootstrapObject(value), command = bootstrapClosed(control.command, ["schema_version", "command_id", "expected_revision", "requested_at", ...(cancel ? ["reason"] : [])]);
    if (command.schema_version !== 1 || !["pending", "unknown", "succeeded"].includes(String(control.state))) throw new Error("Original owner control is malformed.");
    bootstrapId(command.command_id); bootstrapTime(command.expected_revision); bootstrapTime(command.requested_at);
    if (cancel && (typeof command.reason !== "string" || command.reason.trim().length < 20 || command.reason.length > 4096)) throw new Error("Original owner cancellation reason is invalid.");
    return { state: String(control.state), command };
  };
  const sourceDelivery: OwnerBootstrapSummary["sourceDelivery"] = {};
  for (const [action, value] of Object.entries(item.source_delivery == null ? {} : bootstrapObject(item.source_delivery))) {
    if (!["publish", "review", "merge", "close"].includes(action)) throw new Error("Unexpected owner source control.");
    const control = bootstrapObject(value), command = bootstrapClosed(control.command, ["schema_version", "command_id", "expected_revision", "requested_at", "expected_pull_request"]);
    if (!["pending", "unknown", "succeeded"].includes(String(control.state)) || command.schema_version !== 1 || command.command_id !== control.command_id) throw new Error("Original owner source command changed.");
    bootstrapId(command.command_id); bootstrapTime(command.expected_revision); bootstrapTime(command.requested_at);
    if (command.expected_pull_request !== null) {
      const expected = bootstrapClosed(command.expected_pull_request, ["url", "head_commit"]);
      if (typeof expected.url !== "string" || !/^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+\/pull\/[1-9][0-9]*$/.test(expected.url) || !/^[0-9a-f]{40}$/.test(String(expected.head_commit))) throw new Error("Original owner review scope is malformed.");
    }
    const pr = control.pull_request == null ? null : bootstrapObject(control.pull_request);
    if (pr && (typeof pr.url !== "string" || !/^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+\/pull\/[1-9][0-9]*$/.test(pr.url) || !/^[0-9a-f]{40}$/.test(String(pr.head_commit)))) throw new Error("Owner setup PR identity is malformed.");
    sourceDelivery[action] = { state: String(control.state), command, pullRequest: pr ? { url: String(pr.url), head_commit: String(pr.head_commit) } : null };
  }
  return { requestId: bootstrapId(item.request_id), ownerRepo: bootstrapOwner(item.owner_repo), state: String(item.state), revision: bootstrapTime(item.revision),
    sourceRevision: draft ? bootstrapTime(draft.revision) : null, sourceStartDigest: bootstrapDigest(item.source_start_digest),
    sessionId: item.session_id === null ? null : bootstrapId(item.session_id), sourceIntentRef: item.source_intent_ref === null ? null : bootstrapId(item.source_intent_ref),
    nextAction: bootstrapId(next.code), draft: draft ? { state: bootstrapId(draft.state), digest: bootstrapDigest(draft.digest), revision: bootstrapTime(draft.revision) } : null, sourceDelivery,
    existingCheckout: retainedControl(item.existing_checkout), cancellation: retainedControl(item.cancellation, true) };
}
