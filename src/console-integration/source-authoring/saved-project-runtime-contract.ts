import { sourceExact, sourceId, sourceObject, sourceString } from "./source-editor-contract.ts";

const ownerPhases = ["preparing", "building", "starting", "ready", "failed", "stopped", "stale", "unknown"] as const;
type OwnerPhase = typeof ownerPhases[number];
const phases = new Set<string>(["acknowledged", ...ownerPhases]);

export type SavedProjectObservation = {
  state: OwnerPhase;
  observed_at: string;
  instance_ref?: string;
  owner_receipt_ref?: string;
  log_ref?: string;
  endpoint_ref?: string;
};

export type SavedProjectRun = {
  acknowledgement: { command_id: string; operation_id: string; scope_revision: number; accepted_at: string;
    snapshot: { snapshot_id: string; manifest_digest: string } };
  status: OwnerPhase | "acknowledged";
  source_revision: string;
  source_digest: string;
  configuration_revision: string;
  observation: SavedProjectObservation | null;
  last_observation: SavedProjectObservation | null;
};

export type SavedProjectOverview = {
  project_ref: string;
  setup: { recipe_id: string; configuration_revision: string };
  revision: number;
  records: SavedProjectRun[];
  before: number | null;
};

export type SavedProjectRunIntent = {
  command_id: string;
  expected_revision: number;
  source_revision: string;
  source_digest: string;
  configuration_revision: string;
};

function revision(value: unknown, min = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) throw Error("The runtime revision is invalid.");
  return value;
}

function digest(value: unknown): string {
  const result = sourceString(value, 71);
  if (!/^sha256:[a-f0-9]{64}$/.test(result)) throw Error("The saved source digest is invalid.");
  return result;
}

function timestamp(value: unknown): string {
  const result = sourceString(value, 40);
  if (!Number.isFinite(Date.parse(result))) throw Error("The runtime observation time is invalid.");
  return result;
}

function observation(value: unknown): SavedProjectObservation | null {
  if (value === null) return null;
  const record = sourceObject(value);
  const state = sourceString(record.state);
  if (!(ownerPhases as readonly string[]).includes(state)) throw Error("The runtime observation state is invalid.");
  const result: SavedProjectObservation = { state: state as OwnerPhase, observed_at: timestamp(record.observed_at) };
  for (const field of ["instance_ref", "owner_receipt_ref", "log_ref", "endpoint_ref"] as const) {
    if (record[field] !== undefined) result[field] = sourceString(record[field], 512);
  }
  if (state === "ready" && (!result.instance_ref || !result.owner_receipt_ref)) throw Error("Ready runtime evidence is incomplete.");
  return result;
}

export function readSavedProjectRun(value: unknown): SavedProjectRun {
  const raw = sourceObject(value);
  sourceExact(raw, ["acknowledgement", "configuration_revision", "source_revision", "source_digest",
    "status", "observation", "last_observation"]);
  const acknowledgement = sourceObject(raw.acknowledgement), snapshot = sourceObject(acknowledgement.snapshot);
  sourceExact(acknowledgement, ["command_id", "operation_id", "scope_revision", "accepted_at", "snapshot"]);
  sourceExact(snapshot, ["snapshot_id", "manifest_digest"]);
  const manifestDigest = digest(snapshot.manifest_digest);
  const snapshotId = sourceId(snapshot.snapshot_id);
  const status = sourceString(raw.status);
  if (!phases.has(status) || snapshotId !== `project-source:${manifestDigest.slice(7)}`) throw Error("The runtime acknowledgement is invalid.");
  const currentObservation = observation(raw.observation);
  if (currentObservation && currentObservation.state !== status) throw Error("The runtime observation conflicts with the recorded status.");
  if (status === "ready" && !currentObservation) throw Error("The owner has not confirmed a ready runtime.");
  return {
    acknowledgement: { command_id: sourceId(acknowledgement.command_id), operation_id: sourceId(acknowledgement.operation_id),
      scope_revision: revision(acknowledgement.scope_revision, 1), accepted_at: timestamp(acknowledgement.accepted_at),
      snapshot: { snapshot_id: snapshotId, manifest_digest: manifestDigest } },
    status: status as SavedProjectRun["status"],
    source_revision: sourceString(raw.source_revision), source_digest: digest(raw.source_digest),
    configuration_revision: sourceString(raw.configuration_revision),
    observation: currentObservation, last_observation: observation(raw.last_observation),
  };
}

export function readSavedProjectOverview(value: unknown): SavedProjectOverview {
  const raw = sourceObject(value), setup = sourceObject(raw.setup);
  sourceExact(raw, ["project_ref", "setup", "revision", "records", "before"]);
  sourceExact(setup, ["recipe_id", "configuration_revision"]);
  const currentRevision = revision(raw.revision);
  if (!Array.isArray(raw.records) || raw.records.length > 50) throw Error("The runtime history is invalid.");
  const results = raw.records.map(readSavedProjectRun);
  if (results.some((run, index) => run.acknowledgement.scope_revision > currentRevision ||
      (index > 0 && run.acknowledgement.scope_revision >= results[index - 1].acknowledgement.scope_revision))) {
    throw Error("The runtime history contains an invalid revision order.");
  }
  const before = raw.before === null ? null : revision(raw.before, 1);
  if (before !== null && before > currentRevision) throw Error("The runtime history cursor is invalid.");
  return { project_ref: sourceId(raw.project_ref),
    setup: { recipe_id: sourceId(setup.recipe_id), configuration_revision: sourceString(setup.configuration_revision) },
    revision: currentRevision, records: results, before };
}

export function readSavedProjectRunIntent(value: unknown): SavedProjectRunIntent {
  const raw = sourceObject(value);
  sourceExact(raw, ["command_id", "expected_revision", "source_revision", "source_digest", "configuration_revision"]);
  return { command_id: sourceId(raw.command_id), expected_revision: revision(raw.expected_revision),
    source_revision: sourceString(raw.source_revision), source_digest: digest(raw.source_digest),
    configuration_revision: sourceString(raw.configuration_revision) };
}
