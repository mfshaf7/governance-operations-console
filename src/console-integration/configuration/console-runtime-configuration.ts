import { isAbsolute } from "node:path";

export const CONSOLE_RUNTIME_CAPABILITY_SCHEMA_VERSION = 1 as const;

export type ConsoleRuntimeCapabilityId =
  | "delivery-catalog"
  | "delivery-change-control"
  | "delivery-closeout"
  | "delivery-refinement"
  | "delivery-work-design"
  | "delivery-work-session"
  | "lifecycle-transitions"
  | "proposal"
  | "prototype-closure"
  | "prototype-delivery"
  | "prototype-landing"
  | "prototype-maturity"
  | "repository-custody"
  | "repository-lifecycle"
  | "repository-provisioning"
  | "workspace-intake"
  | "workspace-registry";

export type ConsoleRuntimeCapabilityState =
  | "available"
  | "disconnected"
  | "invalid";

export type ConsoleOosConnection = Readonly<{
  baseUrl: string;
  callerId: string;
  callerSecret: string;
}>;

export type ConsoleWgcfConnection = Readonly<{
  baseUrl: string;
  callerId: string;
  callerSecret: string;
}>;

export type ConsoleOosOperatorConfiguration = ConsoleOosConnection &
  Readonly<{
    operatorHandle?: string;
    operatorId: string;
  }>;

export type ConsoleSessionConfiguration = Readonly<{
  operatorId: string;
  projectionPath: string;
}>;

export type ConsoleRuntimeObservationConfiguration = Readonly<{
  projectionPath: string;
}>;

export type ConsoleArtifactReference = Readonly<{
  digest: string;
  uri: string;
}>;

export type ConsoleArtifactReferenceNames = Readonly<{
  digestName: string;
  label: string;
  uriName: string;
}>;

export type ConsoleRuntimeCapability = Readonly<{
  id: ConsoleRuntimeCapabilityId;
  label: string;
  mutation: Readonly<{
    reasonCode: string | null;
    state: ConsoleRuntimeCapabilityState;
  }>;
  owner: "operator-orchestration-service";
  source: Readonly<{
    reasonCode: string | null;
    state: ConsoleRuntimeCapabilityState;
  }>;
}>;

export type ConsoleRuntimeCapabilityProjection = Readonly<{
  artifactType: "console-runtime-capability-projection";
  capabilities: readonly ConsoleRuntimeCapability[];
  generatedAt: string;
  mode: "disconnected-preview" | "invalid" | "live";
  schemaVersion: typeof CONSOLE_RUNTIME_CAPABILITY_SCHEMA_VERSION;
}>;

export class ConsoleRuntimeConfigurationError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ConsoleRuntimeConfigurationError";
    this.code = code;
  }
}

const defaultCallerId = "governance-operations-console";
const digestPattern = /^sha256:[a-f0-9]{64}$/;

const capabilityDefinitions: readonly Readonly<{
  id: ConsoleRuntimeCapabilityId;
  label: string;
  mutationArtifactReferences?: readonly ConsoleArtifactReferenceNames[];
}>[] = [
  { id: "proposal", label: "Proposal" },
  { id: "prototype-landing", label: "Prototype Landing" },
  { id: "prototype-maturity", label: "Prototype Maturity" },
  { id: "prototype-closure", label: "Prototype Closure" },
  { id: "prototype-delivery", label: "Prototype Delivery" },
  { id: "delivery-work-design", label: "Delivery Work Design" },
  { id: "delivery-refinement", label: "Delivery Refinement" },
  { id: "delivery-catalog", label: "Delivery Catalog" },
  { id: "delivery-work-session", label: "Delivery Work Session" },
  { id: "delivery-change-control", label: "Delivery Change Control" },
  { id: "delivery-closeout", label: "Delivery Closeout" },
  { id: "lifecycle-transitions", label: "Lifecycle Transitions" },
  {
    id: "repository-custody",
    label: "Repository Custody",
    mutationArtifactReferences: [
      artifactNames(
        "REPOSITORY_CUSTODY_POLICY_PROFILE",
        "repository custody policy profile",
      ),
      artifactNames(
        "REPOSITORY_CUSTODY_CREDENTIAL_BINDING",
        "repository custody credential binding",
      ),
    ],
  },
  {
    id: "repository-provisioning",
    label: "Repository Provisioning",
    mutationArtifactReferences: [
      artifactNames(
        "REPOSITORY_CUSTODY_POLICY_PROFILE",
        "repository custody policy profile",
      ),
      artifactNames(
        "REPOSITORY_PROVISIONING_CREDENTIAL_BINDING",
        "repository provisioning credential binding",
      ),
    ],
  },
  {
    id: "repository-lifecycle",
    label: "Repository Lifecycle",
    mutationArtifactReferences: [
      artifactNames(
        "REPOSITORY_LIFECYCLE_POLICY_PROFILE",
        "repository lifecycle policy profile",
      ),
      artifactNames(
        "REPOSITORY_LIFECYCLE_PROVIDER_CREDENTIAL_BINDING",
        "repository lifecycle provider credential binding",
      ),
    ],
  },
  { id: "workspace-intake", label: "Workspace Intake" },
  { id: "workspace-registry", label: "Workspace Registry" },
];

export function consoleOosModeSelected(
  env: NodeJS.ProcessEnv = process.env,
) {
  return Boolean(env.OOS_BASE_URL?.trim() || env.OOS_CALLER_SECRET?.trim());
}

export function resolveConsoleOosConnection(
  env: NodeJS.ProcessEnv = process.env,
): ConsoleOosConnection {
  const baseUrl = env.OOS_BASE_URL?.trim();
  const callerSecret = env.OOS_CALLER_SECRET?.trim();
  if (!baseUrl || !callerSecret) {
    throw new ConsoleRuntimeConfigurationError(
      "The Console live integration requires its OOS endpoint and caller secret.",
      "console_oos_configuration_incomplete",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new ConsoleRuntimeConfigurationError(
      "The Console OOS endpoint is invalid.",
      "console_oos_url_invalid",
    );
  }
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) {
    throw new ConsoleRuntimeConfigurationError(
      "The Console OOS endpoint must use HTTP or HTTPS.",
      "console_oos_url_invalid",
    );
  }

  return {
    baseUrl: parsed.toString().replace(/\/$/, ""),
    callerId: env.OOS_CALLER_ID?.trim() || defaultCallerId,
    callerSecret,
  };
}

export function consoleWgcfModeSelected(
  env: NodeJS.ProcessEnv = process.env,
) {
  return Boolean(env.WGCF_BASE_URL?.trim() || env.WGCF_CALLER_SECRET?.trim());
}

export function resolveConsoleWgcfConnection(
  env: NodeJS.ProcessEnv = process.env,
): ConsoleWgcfConnection {
  const baseUrl = env.WGCF_BASE_URL?.trim();
  const callerSecret = env.WGCF_CALLER_SECRET?.trim();
  if (!baseUrl || !callerSecret) {
    throw new ConsoleRuntimeConfigurationError(
      "The Console live integration requires its WGCF endpoint and caller secret.",
      "console_wgcf_configuration_incomplete",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new ConsoleRuntimeConfigurationError(
      "The Console WGCF endpoint is invalid.",
      "console_wgcf_url_invalid",
    );
  }
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) {
    throw new ConsoleRuntimeConfigurationError(
      "The Console WGCF endpoint must use HTTP or HTTPS.",
      "console_wgcf_url_invalid",
    );
  }

  return {
    baseUrl: parsed.toString().replace(/\/$/, ""),
    callerId: env.WGCF_CALLER_ID?.trim() || defaultCallerId,
    callerSecret,
  };
}

export function resolveConsoleOosOperatorConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): ConsoleOosOperatorConfiguration {
  const connection = resolveConsoleOosConnection(env);
  const operatorId = resolveConsoleOperatorBinding(env);
  return {
    ...connection,
    operatorHandle: env.GOVERNANCE_CONSOLE_OPERATOR_HANDLE?.trim() || undefined,
    operatorId,
  };
}

export function resolveConsoleSessionConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): ConsoleSessionConfiguration {
  return {
    operatorId: resolveConsoleOperatorBinding(env),
    projectionPath: resolveConsoleSessionProjectionPath(env),
  };
}

export function consoleRuntimeObservationModeSelected(
  env: NodeJS.ProcessEnv = process.env,
) {
  return Boolean(
    env.GOVERNANCE_CONSOLE_RUNTIME_OBSERVATION_PATH?.trim(),
  );
}

export function resolveConsoleRuntimeObservationConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): ConsoleRuntimeObservationConfiguration {
  const projectionPath =
    env.GOVERNANCE_CONSOLE_RUNTIME_OBSERVATION_PATH?.trim();
  if (!projectionPath || !isAbsolute(projectionPath)) {
    throw new ConsoleRuntimeConfigurationError(
      "The Platform runtime observation projection is not configured.",
      "console_runtime_observation_projection_unavailable",
    );
  }
  return { projectionPath };
}

export function resolveConsoleOperatorBinding(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const operatorId = env.GOVERNANCE_CONSOLE_OPERATOR_ID?.trim();
  if (!operatorId) {
    throw new ConsoleRuntimeConfigurationError(
      "The Console operator binding is unavailable.",
      "console_operator_binding_unavailable",
    );
  }
  return operatorId;
}

export function resolveConsoleSessionProjectionPath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const projectionPath =
    env.GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH?.trim();
  if (!projectionPath || !isAbsolute(projectionPath)) {
    throw new ConsoleRuntimeConfigurationError(
      "The Platform session projection is not configured.",
      "console_session_projection_unavailable",
    );
  }
  return projectionPath;
}

export function resolveConsoleArtifactReference(
  env: NodeJS.ProcessEnv,
  names: ConsoleArtifactReferenceNames,
): ConsoleArtifactReference {
  const digest = env[names.digestName]?.trim();
  const uri = env[names.uriName]?.trim();
  if (!digest || !digestPattern.test(digest) || !uri) {
    throw new ConsoleRuntimeConfigurationError(
      `The Console live integration requires its ${names.label} reference.`,
      "console_authority_reference_unavailable",
    );
  }
  try {
    new URL(uri);
  } catch {
    throw new ConsoleRuntimeConfigurationError(
      `The Console ${names.label} URI is invalid.`,
      "console_authority_reference_invalid",
    );
  }
  return { digest, uri };
}

export function projectConsoleRuntimeCapabilities(
  env: NodeJS.ProcessEnv = process.env,
  now = new Date(),
): ConsoleRuntimeCapabilityProjection {
  const source = projectSourceState(env);
  const mutation = projectMutationState(env, source);
  const capabilities = capabilityDefinitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    mutation: projectCapabilityMutationState(
      env,
      mutation,
      definition.mutationArtifactReferences ?? [],
    ),
    owner: "operator-orchestration-service" as const,
    source,
  }));
  const states = capabilities.flatMap((capability) => [
    capability.source.state,
    capability.mutation.state,
  ]);

  return {
    artifactType: "console-runtime-capability-projection",
    capabilities,
    generatedAt: now.toISOString(),
    mode:
      source.state === "invalid"
        ? "invalid"
        : states.every((state) => state === "disconnected")
          ? "disconnected-preview"
          : "live",
    schemaVersion: CONSOLE_RUNTIME_CAPABILITY_SCHEMA_VERSION,
  };
}

function projectSourceState(env: NodeJS.ProcessEnv) {
  if (!consoleOosModeSelected(env)) {
    return {
      reasonCode: "console_oos_not_selected",
      state: "disconnected" as const,
    };
  }
  try {
    resolveConsoleOosConnection(env);
    return { reasonCode: null, state: "available" as const };
  } catch (error) {
    return {
      reasonCode: configurationErrorCode(error),
      state: "invalid" as const,
    };
  }
}

function projectMutationState(
  env: NodeJS.ProcessEnv,
  source: Readonly<{
    reasonCode: string | null;
    state: ConsoleRuntimeCapabilityState;
  }>,
) {
  if (source.state !== "available") return source;
  try {
    resolveConsoleSessionConfiguration(env);
    return { reasonCode: null, state: "available" as const };
  } catch (error) {
    return {
      reasonCode: configurationErrorCode(error),
      state: "invalid" as const,
    };
  }
}

function projectCapabilityMutationState(
  env: NodeJS.ProcessEnv,
  mutation: Readonly<{
    reasonCode: string | null;
    state: ConsoleRuntimeCapabilityState;
  }>,
  references: readonly ConsoleArtifactReferenceNames[],
) {
  if (mutation.state !== "available") return mutation;
  for (const reference of references) {
    try {
      resolveConsoleArtifactReference(env, reference);
    } catch (error) {
      return {
        reasonCode: configurationErrorCode(error),
        state: "invalid" as const,
      };
    }
  }
  return mutation;
}

function configurationErrorCode(error: unknown) {
  return error instanceof ConsoleRuntimeConfigurationError
    ? error.code
    : "console_configuration_invalid";
}

function artifactNames(
  prefix: string,
  label: string,
): ConsoleArtifactReferenceNames {
  return {
    digestName: `${prefix}_DIGEST`,
    label,
    uriName: `${prefix}_URI`,
  };
}
