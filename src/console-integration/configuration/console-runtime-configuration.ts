import { isAbsolute, relative } from "node:path";

export const CONSOLE_RUNTIME_CAPABILITY_SCHEMA_VERSION = 1 as const;

export type ConsoleRuntimeCapabilityId =
  | "delivery-catalog"
  | "delivery-change-control"
  | "delivery-closeout"
  | "delivery-refinement"
  | "delivery-work-design"
  | "delivery-work-session"
  | "lifecycle-transitions"
  | "orchestration"
  | "environment-lifecycle"
  | "model-operations"
  | "product-publication"
  | "proposal"
  | "prototype-closure"
  | "prototype-delivery"
  | "prototype-landing"
  | "prototype-maturity"
  | "prototype-preview"
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

export type ConsoleModelOperationsConfiguration = ConsoleOosOperatorConfiguration &
  Readonly<{
    lifecycleReceiptPath: string;
    mergedReadbackPath: string;
    sourceProjectionPath: string;
  }>;

export type ConsolePrototypePreviewConfiguration = Readonly<{
  ownerRepoRoot: string;
  sourceRevision: string;
  stateRoot: string;
  recordAuthorityFreshnessRequired?: boolean;
}>;

export type ConsoleProductPublicationConfiguration =
  ConsoleOosOperatorConfiguration &
    Readonly<{
      authorityRevision: string;
      securityDecision: Readonly<{
        digest: string;
        revision: string;
        uri: string;
      }>;
    }>;

export type ConsoleProductMaintenanceConfiguration =
  ConsoleOosOperatorConfiguration &
    Readonly<{
      authorityRevision: string;
      healthProjectionPath: string;
      healthReceiptPath: string;
      securityDecision: Readonly<{
        digest: string;
        revision: string;
        uri: string;
      }>;
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
  owner: "operator-orchestration-service" | "workspace-prototype-studio";
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
const gitRevisionPattern = /^[a-f0-9]{40}$/;

const capabilityDefinitions: readonly Readonly<{
  id: ConsoleRuntimeCapabilityId;
  label: string;
  mutationArtifactReferences?: readonly ConsoleArtifactReferenceNames[];
  owner?: "operator-orchestration-service" | "workspace-prototype-studio";
  runtime?:
    | "model-operations"
    | "oos"
    | "product-publication"
    | "prototype-preview"
    | "workspace-continuity";
}>[] = [
  { id: "proposal", label: "Proposal" },
  { id: "prototype-landing", label: "Prototype Landing" },
  { id: "prototype-maturity", label: "Prototype Maturity" },
  { id: "prototype-closure", label: "Prototype Closure" },
  { id: "prototype-delivery", label: "Prototype Delivery" },
  {
    id: "prototype-preview",
    label: "Prototype Preview Runtime",
    owner: "workspace-prototype-studio",
    runtime: "prototype-preview",
  },
  { id: "delivery-work-design", label: "Delivery Work Design" },
  { id: "delivery-refinement", label: "Delivery Refinement" },
  { id: "delivery-catalog", label: "Delivery Catalog" },
  { id: "delivery-work-session", label: "Delivery Work Session" },
  { id: "delivery-change-control", label: "Delivery Change Control" },
  { id: "delivery-closeout", label: "Delivery Closeout" },
  { id: "lifecycle-transitions", label: "Lifecycle Transitions" },
  { id: "orchestration", label: "Orchestration" },
  { id: "environment-lifecycle", label: "Environment Lifecycle" },
  {
    id: "model-operations",
    label: "Model Operations",
    runtime: "model-operations",
  },
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
  {
    id: "workspace-registry",
    label: "Workspace Registry",
    runtime: "workspace-continuity",
  },
  {
    id: "product-publication",
    label: "Product Publication",
    runtime: "product-publication",
  },
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

export function consoleModelOperationsModeSelected(
  env: NodeJS.ProcessEnv = process.env,
) {
  return Boolean(
    env.GOVERNANCE_CONSOLE_MODEL_PROFILE_SOURCE_PROJECTION_PATH?.trim() ||
      env.GOVERNANCE_CONSOLE_MODEL_PROFILE_LIFECYCLE_RECEIPT_PATH?.trim() ||
      env.GOVERNANCE_CONSOLE_MODEL_PROFILE_MERGED_READBACK_PATH?.trim(),
  );
}

export function resolveConsoleModelOperationsConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): ConsoleModelOperationsConfiguration {
  return {
    ...resolveConsoleOosOperatorConfiguration(env),
    sourceProjectionPath: absolutePath(
      env.GOVERNANCE_CONSOLE_MODEL_PROFILE_SOURCE_PROJECTION_PATH,
      "console_model_profile_source_projection_unavailable",
      "The Platform model-profile source projection is not configured.",
    ),
    lifecycleReceiptPath: absolutePath(
      env.GOVERNANCE_CONSOLE_MODEL_PROFILE_LIFECYCLE_RECEIPT_PATH,
      "console_model_profile_lifecycle_receipt_unavailable",
      "The Platform model-profile lifecycle receipt is not configured.",
    ),
    mergedReadbackPath: absolutePath(
      env.GOVERNANCE_CONSOLE_MODEL_PROFILE_MERGED_READBACK_PATH,
      "console_model_profile_merged_readback_unavailable",
      "The Platform model-profile merged readback is not configured.",
    ),
  };
}

export function consoleProductPublicationModeSelected(
  env: NodeJS.ProcessEnv = process.env,
) {
  return Boolean(
    env.GOVERNANCE_CONSOLE_PRODUCT_PUBLICATION_AUTHORITY_REVISION?.trim() ||
      env.GOVERNANCE_CONSOLE_PRODUCT_PUBLICATION_SECURITY_DECISION_URI?.trim() ||
      env.GOVERNANCE_CONSOLE_PRODUCT_PUBLICATION_SECURITY_DECISION_DIGEST?.trim() ||
      env.GOVERNANCE_CONSOLE_PRODUCT_PUBLICATION_SECURITY_DECISION_REVISION?.trim(),
  );
}

export function resolveConsoleProductPublicationConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): ConsoleProductPublicationConfiguration {
  const authorityRevision =
    env.GOVERNANCE_CONSOLE_PRODUCT_PUBLICATION_AUTHORITY_REVISION?.trim();
  const securityDecision = resolveConsoleArtifactReference(env, {
    digestName:
      "GOVERNANCE_CONSOLE_PRODUCT_PUBLICATION_SECURITY_DECISION_DIGEST",
    label: "Product Publication Security decision",
    uriName: "GOVERNANCE_CONSOLE_PRODUCT_PUBLICATION_SECURITY_DECISION_URI",
  });
  const securityRevision =
    env.GOVERNANCE_CONSOLE_PRODUCT_PUBLICATION_SECURITY_DECISION_REVISION?.trim();
  if (!authorityRevision || !gitRevisionPattern.test(authorityRevision)) {
    throw new ConsoleRuntimeConfigurationError(
      "The Product Publication authority revision is unavailable or invalid.",
      "console_product_publication_authority_revision_invalid",
    );
  }
  if (!securityRevision || !gitRevisionPattern.test(securityRevision)) {
    throw new ConsoleRuntimeConfigurationError(
      "The Product Publication Security decision revision is unavailable or invalid.",
      "console_product_publication_security_revision_invalid",
    );
  }
  if (!securityDecision.uri.startsWith("security-architecture://product-publication/decisions/")) {
    throw new ConsoleRuntimeConfigurationError(
      "The Product Publication Security decision uses the wrong authority namespace.",
      "console_product_publication_security_decision_invalid",
    );
  }
  return {
    ...resolveConsoleOosOperatorConfiguration(env),
    authorityRevision,
    securityDecision: {
      ...securityDecision,
      revision: securityRevision,
    },
  };
}

export function consoleProductMaintenanceModeSelected(
  env: NodeJS.ProcessEnv = process.env,
) {
  return Boolean(
    env.GOVERNANCE_CONSOLE_PRODUCT_MAINTENANCE_AUTHORITY_REVISION?.trim() ||
      env.GOVERNANCE_CONSOLE_PRODUCT_MAINTENANCE_SECURITY_DECISION_URI?.trim() ||
      env.GOVERNANCE_CONSOLE_PRODUCT_MAINTENANCE_SECURITY_DECISION_DIGEST?.trim() ||
      env.GOVERNANCE_CONSOLE_PRODUCT_MAINTENANCE_SECURITY_DECISION_REVISION?.trim() ||
      env.GOVERNANCE_CONSOLE_PRODUCT_HEALTH_PROJECTION_PATH?.trim() ||
      env.GOVERNANCE_CONSOLE_PRODUCT_HEALTH_RECEIPT_PATH?.trim(),
  );
}

export function resolveConsoleProductMaintenanceConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): ConsoleProductMaintenanceConfiguration {
  const authorityRevision =
    env.GOVERNANCE_CONSOLE_PRODUCT_MAINTENANCE_AUTHORITY_REVISION?.trim();
  const securityDecision = resolveConsoleArtifactReference(env, {
    digestName:
      "GOVERNANCE_CONSOLE_PRODUCT_MAINTENANCE_SECURITY_DECISION_DIGEST",
    label: "Product Maintenance Security decision",
    uriName: "GOVERNANCE_CONSOLE_PRODUCT_MAINTENANCE_SECURITY_DECISION_URI",
  });
  const securityRevision =
    env.GOVERNANCE_CONSOLE_PRODUCT_MAINTENANCE_SECURITY_DECISION_REVISION?.trim();
  if (!authorityRevision || !gitRevisionPattern.test(authorityRevision)) {
    throw new ConsoleRuntimeConfigurationError(
      "The Product Maintenance authority revision is unavailable or invalid.",
      "console_product_maintenance_authority_revision_invalid",
    );
  }
  if (!securityRevision || !gitRevisionPattern.test(securityRevision)) {
    throw new ConsoleRuntimeConfigurationError(
      "The Product Maintenance Security decision revision is unavailable or invalid.",
      "console_product_maintenance_security_revision_invalid",
    );
  }
  if (!securityDecision.uri.startsWith("security-architecture://product-publication/decisions/")) {
    throw new ConsoleRuntimeConfigurationError(
      "The Product Maintenance Security decision uses the wrong authority namespace.",
      "console_product_maintenance_security_decision_invalid",
    );
  }
  return {
    ...resolveConsoleOosOperatorConfiguration(env),
    authorityRevision,
    healthProjectionPath: absolutePath(
      env.GOVERNANCE_CONSOLE_PRODUCT_HEALTH_PROJECTION_PATH,
      "console_product_health_projection_unavailable",
      "The Platform product-health projection is not configured.",
    ),
    healthReceiptPath: absolutePath(
      env.GOVERNANCE_CONSOLE_PRODUCT_HEALTH_RECEIPT_PATH,
      "console_product_health_receipt_unavailable",
      "The Platform product-health receipt is not configured.",
    ),
    securityDecision: {
      ...securityDecision,
      revision: securityRevision,
    },
  };
}

export function consolePrototypePreviewModeSelected(
  env: NodeJS.ProcessEnv = process.env,
) {
  return Boolean(
    env.GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_OWNER_REPO_ROOT?.trim() ||
      env.GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_SOURCE_REVISION?.trim() ||
      env.GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_STATE_ROOT?.trim(),
  );
}

export function resolveConsolePrototypePreviewConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): ConsolePrototypePreviewConfiguration {
  const ownerRepoRoot =
    env.GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_OWNER_REPO_ROOT?.trim();
  const sourceRevision =
    env.GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_SOURCE_REVISION?.trim();
  const stateRoot =
    env.GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_STATE_ROOT?.trim();
  if (
    !ownerRepoRoot ||
    !stateRoot ||
    !isAbsolute(ownerRepoRoot) ||
    !isAbsolute(stateRoot)
  ) {
    throw new ConsoleRuntimeConfigurationError(
      "The Studio Preview Runtime owner and state roots are not fully configured.",
      "console_prototype_preview_configuration_incomplete",
    );
  }
  if (!sourceRevision || !gitRevisionPattern.test(sourceRevision)) {
    throw new ConsoleRuntimeConfigurationError(
      "The Studio Preview Runtime source revision is invalid.",
      "console_prototype_preview_source_revision_invalid",
    );
  }
  const stateRelativeToSource = relative(ownerRepoRoot, stateRoot);
  if (
    stateRelativeToSource === "" ||
    (!stateRelativeToSource.startsWith("..") && !isAbsolute(stateRelativeToSource))
  ) {
    throw new ConsoleRuntimeConfigurationError(
      "The Studio Preview Runtime state root must stay outside owner source.",
      "console_prototype_preview_state_root_invalid",
    );
  }
  return { ownerRepoRoot, sourceRevision, stateRoot,
    ...(env.GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_RECORD_AUTHORITY_FRESHNESS_REQUIRED === "true"
      ? { recordAuthorityFreshnessRequired: true } : {}),
  };
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
  const capabilities = capabilityDefinitions.map((definition) => {
    if (definition.runtime === "prototype-preview") {
      const previewSource = projectPrototypePreviewSourceState(env);
      const previewMutation =
        previewSource.state === "available"
          ? projectMutationState(env, previewSource)
          : previewSource;
      return {
        id: definition.id,
        label: definition.label,
        mutation: previewMutation,
        owner: definition.owner ?? "workspace-prototype-studio",
        source: previewSource,
      };
    }
    if (definition.runtime === "model-operations") {
      const modelOperationsSource = projectModelOperationsSourceState(env);
      return {
        id: definition.id,
        label: definition.label,
        mutation:
          modelOperationsSource.state === "available"
            ? projectMutationState(env, modelOperationsSource)
            : modelOperationsSource,
        owner: definition.owner ?? "operator-orchestration-service",
        source: modelOperationsSource,
      };
    }
    if (definition.runtime === "product-publication") {
      const publicationSource = projectProductPublicationSourceState(env);
      return {
        id: definition.id,
        label: definition.label,
        mutation: publicationSource,
        owner: definition.owner ?? "operator-orchestration-service",
        source: publicationSource,
      };
    }
    if (definition.runtime === "workspace-continuity") {
      const continuitySource = projectWorkspaceContinuitySourceState(env);
      return {
        id: definition.id,
        label: definition.label,
        mutation:
          continuitySource.state === "available"
            ? projectMutationState(env, continuitySource)
            : continuitySource,
        owner: definition.owner ?? "operator-orchestration-service",
        source: continuitySource,
      };
    }
    return {
      id: definition.id,
      label: definition.label,
      mutation: projectCapabilityMutationState(
        env,
        mutation,
        definition.mutationArtifactReferences ?? [],
      ),
      owner: definition.owner ?? "operator-orchestration-service",
      source,
    };
  });
  const states = capabilities.flatMap((capability) => [
    capability.source.state,
    capability.mutation.state,
  ]);

  return {
    artifactType: "console-runtime-capability-projection",
    capabilities,
    generatedAt: now.toISOString(),
    mode: capabilities.some((capability) => capability.source.state === "invalid")
      ? "invalid"
      : states.every((state) => state === "disconnected")
        ? "disconnected-preview"
        : "live",
    schemaVersion: CONSOLE_RUNTIME_CAPABILITY_SCHEMA_VERSION,
  };
}

function projectPrototypePreviewSourceState(env: NodeJS.ProcessEnv) {
  if (!consolePrototypePreviewModeSelected(env)) {
    return {
      reasonCode: "console_prototype_preview_not_selected",
      state: "disconnected" as const,
    };
  }
  try {
    resolveConsolePrototypePreviewConfiguration(env);
    return { reasonCode: null, state: "available" as const };
  } catch (error) {
    return {
      reasonCode: configurationErrorCode(error),
      state: "invalid" as const,
    };
  }
}

function projectModelOperationsSourceState(env: NodeJS.ProcessEnv) {
  if (!consoleModelOperationsModeSelected(env)) {
    return {
      reasonCode: "console_model_operations_not_selected",
      state: "disconnected" as const,
    };
  }
  try {
    resolveConsoleModelOperationsConfiguration(env);
    return { reasonCode: null, state: "available" as const };
  } catch (error) {
    return {
      reasonCode: configurationErrorCode(error),
      state: "invalid" as const,
    };
  }
}

function projectProductPublicationSourceState(env: NodeJS.ProcessEnv) {
  if (!consoleProductPublicationModeSelected(env)) {
    return {
      reasonCode: "console_product_publication_not_selected",
      state: "disconnected" as const,
    };
  }
  try {
    resolveConsoleProductPublicationConfiguration(env);
    return { reasonCode: null, state: "available" as const };
  } catch (error) {
    return {
      reasonCode: configurationErrorCode(error),
      state: "invalid" as const,
    };
  }
}

function projectWorkspaceContinuitySourceState(env: NodeJS.ProcessEnv) {
  const oosSelected = consoleOosModeSelected(env);
  const wgcfSelected = consoleWgcfModeSelected(env);
  if (!oosSelected && !wgcfSelected) {
    return {
      reasonCode: "console_workspace_continuity_not_selected",
      state: "disconnected" as const,
    };
  }
  try {
    resolveConsoleOosConnection(env);
    resolveConsoleWgcfConnection(env);
    return { reasonCode: null, state: "available" as const };
  } catch (error) {
    return {
      reasonCode: configurationErrorCode(error),
      state: "invalid" as const,
    };
  }
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

function absolutePath(
  raw: string | undefined,
  code: string,
  message: string,
) {
  const value = raw?.trim();
  if (!value || !isAbsolute(value)) {
    throw new ConsoleRuntimeConfigurationError(message, code);
  }
  return value;
}
