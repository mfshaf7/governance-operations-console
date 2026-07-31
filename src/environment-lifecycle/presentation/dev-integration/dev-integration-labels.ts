import type {
  DevIntegrationExpectedWriteClass,
  DevIntegrationLaneClass,
  DevIntegrationProfileLifecycle,
  DevIntegrationPromoteCheckState,
  DevIntegrationRuntimeObservationState,
  DevIntegrationRuntimeStateModel,
} from "../../model/dev-integration-profile.ts";
import type { TerasTone } from "@/teras";

export const devIntegrationLaneLabels: Record<
  DevIntegrationLaneClass,
  string
> = {
  "governed-devint": "Governed",
  "integration-devint": "Integration",
  "prototype-devint": "Prototype",
};

export const devIntegrationLifecycleLabels: Record<
  DevIntegrationProfileLifecycle,
  string
> = {
  active: "Active",
  "build-admitted": "Build admitted",
  proposed: "Proposed",
  retired: "Retired",
  suspended: "Suspended",
};

export const devIntegrationLifecycleTones: Record<
  DevIntegrationProfileLifecycle,
  TerasTone
> = {
  active: "ok",
  "build-admitted": "info",
  proposed: "info",
  retired: "muted",
  suspended: "warn",
};

export const devIntegrationRuntimeLabels: Record<
  DevIntegrationRuntimeObservationState,
  string
> = {
  degraded: "Degraded",
  failed: "Failed",
  running: "Running",
  starting: "Starting",
  stopped: "Stopped",
  stopping: "Stopping",
  unavailable: "Unavailable",
  unknown: "Unknown",
};

export const devIntegrationRuntimeTones: Record<
  DevIntegrationRuntimeObservationState,
  TerasTone
> = {
  degraded: "warn",
  failed: "danger",
  running: "ok",
  starting: "info",
  stopped: "muted",
  stopping: "info",
  unavailable: "muted",
  unknown: "stale",
};

export const devIntegrationStateModelLabels: Record<
  DevIntegrationRuntimeStateModel,
  string
> = {
  disposable: "Disposable",
  persistent: "Persistent",
};

export const devIntegrationWriteClassLabels: Record<
  DevIntegrationExpectedWriteClass,
  string
> = {
  "canonical-backend": "Canonical backend",
  "external-sandbox": "External sandbox",
  none: "No writes",
  "prototype-local": "Prototype local",
};

export const devIntegrationPromoteCheckLabels: Record<
  DevIntegrationPromoteCheckState,
  string
> = {
  failed: "Failed",
  "not-ready": "Not ready",
  "not-run": "Not run",
  ready: "Ready",
  running: "Running",
  stale: "Stale",
};

export const devIntegrationPromoteCheckTones: Record<
  DevIntegrationPromoteCheckState,
  TerasTone
> = {
  failed: "danger",
  "not-ready": "warn",
  "not-run": "muted",
  ready: "ok",
  running: "info",
  stale: "stale",
};
