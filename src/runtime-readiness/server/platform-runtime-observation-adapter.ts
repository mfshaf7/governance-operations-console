import { lstat, readFile } from "node:fs/promises";

import {
  ConsoleRuntimeConfigurationError,
  resolveConsoleRuntimeObservationConfiguration,
} from "../../console-integration/configuration/console-runtime-configuration.ts";
import type {
  RuntimeComponentObservation,
  RuntimeComponentProjection,
  Tone,
} from "../model/runtime-readiness-model.ts";

const maxProjectionBytes = 128 * 1024;
const sourceReferencePattern = /^platform-runtime-observation:\/\/[a-f0-9]{64}$/;
const workloadReferencePattern = /^kubernetes:\/\//;
const acceptedProjectionCheckpoints = new Map<
  string,
  Readonly<{ observedAt: number; reference: string }>
>();

type RuntimeState = "available" | "degraded" | "unavailable";

type ValidatedRuntimeComponent = Readonly<{
  capabilities: readonly Readonly<{
    id: string;
    posture: "degraded" | "runtime-ready" | "unavailable";
  }>[];
  category: string;
  freshness: "current";
  id: string;
  label: string;
  observedAt: string;
  recovery: Readonly<{
    owner: "platform-engineering";
    runbookRef: string;
  }>;
  runtime: Readonly<{
    desiredReplicas: number;
    readyReplicas: number;
    reasonCode: string | null;
    state: RuntimeState;
  }>;
  sourceRef: string;
}>;

type ValidatedRuntimeProjection = Readonly<{
  components: readonly ValidatedRuntimeComponent[];
  environment: Readonly<{
    lane: "dev-integration";
    profile: string;
  }>;
  schemaVersion: "console-runtime-observations/v1";
  source: Readonly<{
    authority: "platform-engineering";
    mode: "live";
    observedAt: string;
    reference: string;
    validUntil: string;
  }>;
}>;

export class RuntimeObservationError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "RuntimeObservationError";
    this.code = code;
  }
}

export function disconnectedRuntimeComponentProjection(): RuntimeComponentProjection {
  return {
    artifactType: "console-runtime-component-projection",
    components: [],
    mode: "disconnected-preview",
    reasonCode: "console_runtime_observation_not_selected",
    schemaVersion: 1,
    source: {
      authority: "none",
      freshness: "unavailable",
      observedAt: null,
      reference: null,
    },
  };
}

export function unavailableRuntimeComponentProjection(
  code: string,
): RuntimeComponentProjection {
  return {
    artifactType: "console-runtime-component-projection",
    components: [],
    mode: "unavailable",
    reasonCode: code,
    schemaVersion: 1,
    source: {
      authority: "platform-engineering",
      freshness: code === "console_runtime_observation_stale" ? "stale" : "unavailable",
      observedAt: null,
      reference: null,
    },
  };
}

export async function readRuntimeComponentProjection(
  env: NodeJS.ProcessEnv = process.env,
  now = new Date(),
): Promise<RuntimeComponentProjection> {
  let projectionPath: string;
  try {
    projectionPath = resolveConsoleRuntimeObservationConfiguration(env).projectionPath;
  } catch (error) {
    if (!(error instanceof ConsoleRuntimeConfigurationError)) throw error;
    throw new RuntimeObservationError(error.message, error.code);
  }

  let raw: string;
  try {
    const info = await lstat(projectionPath);
    if (!info.isFile() || info.isSymbolicLink()) invalidFile();
    if ((info.mode & 0o777) !== 0o600) invalidFile();
    if (typeof process.getuid === "function" && info.uid !== process.getuid()) {
      invalidFile();
    }
    if (info.size <= 0 || info.size > maxProjectionBytes) invalidFile();
    raw = await readFile(projectionPath, "utf8");
  } catch (error) {
    if (error instanceof RuntimeObservationError) throw error;
    throw new RuntimeObservationError(
      "The Platform runtime observation projection cannot be read safely.",
      "console_runtime_observation_projection_invalid",
    );
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw invalidProjection();
  }

  const projection = assertProjection(value);
  const observedAt = timestamp(projection.source.observedAt);
  const validUntil = timestamp(projection.source.validUntil);
  if (
    observedAt.getTime() > now.getTime() + 30_000 ||
    validUntil.getTime() <= observedAt.getTime() ||
    validUntil.getTime() <= now.getTime()
  ) {
    throw new RuntimeObservationError(
      "The Platform runtime observation projection is stale.",
      "console_runtime_observation_stale",
    );
  }
  rememberProjection(
    projectionPath,
    observedAt.getTime(),
    projection.source.reference,
  );

  return {
    artifactType: "console-runtime-component-projection",
    components: projection.components.map((component) =>
      projectComponent(component, projection),
    ),
    mode: "live",
    reasonCode: null,
    schemaVersion: 1,
    source: {
      authority: "platform-engineering",
      freshness: "current",
      observedAt: projection.source.observedAt,
      reference: projection.source.reference,
    },
  };
}

function projectComponent(
  component: ValidatedRuntimeComponent,
  projection: ValidatedRuntimeProjection,
): RuntimeComponentObservation {
  const toneByState: Record<RuntimeState, Tone> = {
    available: "ok",
    degraded: "warn",
    unavailable: "danger",
  };
  return {
    alertEligible: true,
    environment: projection.environment.lane,
    freshness: "current",
    href: null,
    id: component.id,
    label: component.label,
    observedAt: component.observedAt,
    sourceAuthority: projection.source.authority,
    sourceMode: "source-projected",
    sourceRef: projection.source.reference,
    status: component.runtime.state,
    surface: component.category,
    tone: toneByState[component.runtime.state],
  };
}

function assertProjection(value: unknown): ValidatedRuntimeProjection {
  const root = record(value);
  exactKeys(root, ["components", "environment", "schemaVersion", "source"]);
  if (root.schemaVersion !== "console-runtime-observations/v1") invalidProjection();

  const environment = record(root.environment);
  exactKeys(environment, ["lane", "profile"]);
  if (environment.lane !== "dev-integration") invalidProjection();

  const source = record(root.source);
  exactKeys(source, ["authority", "mode", "observedAt", "reference", "validUntil"]);
  if (
    source.authority !== "platform-engineering" ||
    source.mode !== "live" ||
    !sourceReferencePattern.test(text(source.reference))
  ) invalidProjection();

  if (!Array.isArray(root.components) || root.components.length === 0) {
    invalidProjection();
  }
  const components = root.components.map(assertComponent);
  if (new Set(components.map(({ id }) => id)).size !== components.length) {
    invalidProjection();
  }
  const sourceObservedAt = timestamp(source.observedAt);
  if (
    components.some(
      (component) => timestamp(component.observedAt).getTime() > sourceObservedAt.getTime(),
    )
  ) invalidProjection();

  return {
    components,
    environment: {
      lane: "dev-integration",
      profile: text(environment.profile),
    },
    schemaVersion: "console-runtime-observations/v1",
    source: {
      authority: "platform-engineering",
      mode: "live",
      observedAt: timestamp(source.observedAt).toISOString(),
      reference: text(source.reference),
      validUntil: timestamp(source.validUntil).toISOString(),
    },
  };
}

function assertComponent(value: unknown): ValidatedRuntimeComponent {
  const component = record(value);
  exactKeys(component, [
    "capabilities",
    "category",
    "freshness",
    "id",
    "label",
    "observedAt",
    "recovery",
    "runtime",
    "sourceRef",
  ]);
  const id = text(component.id);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || component.freshness !== "current") {
    invalidProjection();
  }
  const sourceRef = text(component.sourceRef);
  if (!workloadReferencePattern.test(sourceRef)) invalidProjection();

  const runtime = record(component.runtime);
  exactKeys(runtime, ["desiredReplicas", "readyReplicas", "reasonCode", "state"]);
  const state = oneOf(runtime.state, ["available", "degraded", "unavailable"] as const);
  const desiredReplicas = integer(runtime.desiredReplicas);
  const readyReplicas = integer(runtime.readyReplicas);
  if (desiredReplicas < 0 || readyReplicas < 0 || readyReplicas > desiredReplicas) {
    invalidProjection();
  }
  if (
    (state === "available" && (desiredReplicas === 0 || readyReplicas !== desiredReplicas)) ||
    (state === "degraded" && (readyReplicas === 0 || readyReplicas >= desiredReplicas)) ||
    (state === "unavailable" && readyReplicas !== 0)
  ) invalidProjection();

  const capabilities = array(component.capabilities).map((entry) => {
    const capability = record(entry);
    exactKeys(capability, ["id", "posture"]);
    return {
      id: text(capability.id),
      posture: oneOf(capability.posture, ["runtime-ready", "degraded", "unavailable"] as const),
    };
  });
  if (
    capabilities.length === 0 ||
    new Set(capabilities.map(({ id: capabilityId }) => capabilityId)).size !== capabilities.length
  ) invalidProjection();
  const expectedPosture =
    state === "available" ? "runtime-ready" : state;
  if (capabilities.some(({ posture }) => posture !== expectedPosture)) {
    invalidProjection();
  }

  const recovery = record(component.recovery);
  exactKeys(recovery, ["owner", "runbookRef"]);
  if (recovery.owner !== "platform-engineering") invalidProjection();

  return {
    capabilities,
    category: text(component.category),
    freshness: "current",
    id,
    label: text(component.label),
    observedAt: timestamp(component.observedAt).toISOString(),
    recovery: {
      owner: "platform-engineering",
      runbookRef: text(recovery.runbookRef),
    },
    runtime: {
      desiredReplicas,
      readyReplicas,
      reasonCode: runtime.reasonCode === null ? null : text(runtime.reasonCode),
      state,
    },
    sourceRef,
  };
}

function rememberProjection(
  projectionPath: string,
  observedAt: number,
  reference: string,
) {
  const accepted = acceptedProjectionCheckpoints.get(projectionPath);
  if (accepted && observedAt < accepted.observedAt) {
    throw new RuntimeObservationError(
      "The Platform runtime observation projection is older than the accepted observation.",
      "console_runtime_observation_replayed",
    );
  }
  if (
    accepted &&
    observedAt === accepted.observedAt &&
    reference !== accepted.reference
  ) {
    throw new RuntimeObservationError(
      "The Platform runtime observation projection conflicts with the accepted observation.",
      "console_runtime_observation_conflict",
    );
  }
  acceptedProjectionCheckpoints.set(projectionPath, { observedAt, reference });
  while (acceptedProjectionCheckpoints.size > 16) {
    const oldest = acceptedProjectionCheckpoints.keys().next().value;
    if (oldest === undefined) break;
    acceptedProjectionCheckpoints.delete(oldest);
  }
}

function invalidFile(): never {
  throw new RuntimeObservationError(
    "The Platform runtime observation projection cannot be read safely.",
    "console_runtime_observation_projection_invalid",
  );
}

function invalidProjection(): never {
  throw new RuntimeObservationError(
    "The Platform runtime observation projection is malformed.",
    "console_runtime_observation_projection_invalid",
  );
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidProjection();
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    invalidProjection();
  }
}

function text(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") invalidProjection();
  return value;
}

function timestamp(value: unknown): Date {
  const parsed = new Date(text(value));
  if (Number.isNaN(parsed.getTime())) invalidProjection();
  return parsed;
}

function integer(value: unknown): number {
  if (!Number.isInteger(value)) invalidProjection();
  return value as number;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) invalidProjection();
  return value;
}

function oneOf<const T extends readonly string[]>(value: unknown, options: T): T[number] {
  if (typeof value !== "string" || !options.includes(value)) invalidProjection();
  return value as T[number];
}
