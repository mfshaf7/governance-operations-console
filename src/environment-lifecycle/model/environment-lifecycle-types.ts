export const ENVIRONMENT_LIFECYCLE_SCHEMA_VERSION = "1" as const;

export type EnvironmentLifecycleSchemaVersion =
  typeof ENVIRONMENT_LIFECYCLE_SCHEMA_VERSION;

export type EnvironmentLifecycleProvenance =
  | "authority-snapshot"
  | "prototype-local"
  | "synthetic-scenario";

export type EnvironmentLifecycleSource = Readonly<{
  observedAt: string;
  provenance: EnvironmentLifecycleProvenance;
  ref: string;
  source: string;
  version: string;
}>;

export type EnvironmentLifecycleNextMove = Readonly<{
  actionId: string;
  label: string;
  ownerRef: string;
  reason: string;
}>;

export function assertEnvironmentLifecycleSource(
  source: EnvironmentLifecycleSource,
): void {
  if (
    !source.ref.trim() ||
    !source.source.trim() ||
    !source.version.trim() ||
    !source.observedAt.trim() ||
    Number.isNaN(Date.parse(source.observedAt))
  ) {
    throw new Error(
      "Environment Lifecycle source identity and observation time must be complete.",
    );
  }
}

export function assertEnvironmentLifecycleNextMove(
  nextMove: EnvironmentLifecycleNextMove | null,
): void {
  if (
    nextMove &&
    (!nextMove.actionId.trim() ||
      !nextMove.label.trim() ||
      !nextMove.ownerRef.trim() ||
      !nextMove.reason.trim())
  ) {
    throw new Error(
      "Environment Lifecycle next move must identify its action, label, owner, and reason.",
    );
  }
}
