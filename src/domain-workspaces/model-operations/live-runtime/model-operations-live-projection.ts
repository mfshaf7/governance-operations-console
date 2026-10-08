import { modelOperationsSummaryFromProfiles } from "../read-model/selectors/model-profile-selectors.ts";
import type {
  ModelOperationsReadModel,
  ModelProfileLifecycle,
  ModelProfileRecord,
  ModelProjectionSource,
  ModelReadinessState,
} from "../read-model/types/model-operations-types.ts";

type PlatformArtifacts = Readonly<{
  lifecycleReceipt: Record<string, unknown>;
  mergedReadback: Record<string, unknown>;
  sourceProjection: Record<string, unknown>;
}>;

export function projectLiveModelOperationsReadModel(
  artifacts: PlatformArtifacts,
  observedAt = new Date(),
): ModelOperationsReadModel {
  const projection = artifacts.sourceProjection;
  const source = record(projection.source);
  const sourceVersion = text(source.source_version);
  const sourceModel: ModelProjectionSource = {
    authority: "platform-engineering",
    freshness: "current",
    observedAt: observedAt.toISOString(),
    ref: `platform-model-profile-source://${sourceVersion}`,
    schemaVersion: "1",
    sourceVersion,
  };
  const profiles = array(projection.profiles).map((value) =>
    projectProfile(
      record(value),
      sourceModel,
      artifacts.lifecycleReceipt,
      artifacts.mergedReadback,
    ),
  );
  return {
    localExceptionRuntime: {
      endpoint: "not projected",
      models: [],
      observedAt: null,
      provider: "Local Exception Runtime",
      source: {
        authority: "local runtime",
        freshness: "unknown",
        observedAt: "not observed",
        ref: "local-runtime://disconnected",
        schemaVersion: "1",
        sourceVersion: "unavailable",
      },
      state: "unknown",
    },
    profiles,
    summary: modelOperationsSummaryFromProfiles(profiles),
    workspaceStatus: {
      ariaLabel: "Model Operations workspace status",
      detailDataAttribute: "data-model-operations-status-modal",
      items: [
        {
          detail: "The Console verified the exact Platform source projection and merged source revision.",
          facts: [
            { label: "Owner", value: "platform-engineering" },
            { label: "Revision", value: sourceVersion },
            { label: "Digest", value: text(projection.digest) },
          ],
          id: "registry",
          label: "Registry",
          state: "current",
          tone: "ok",
        },
        {
          detail: "Profile requests are read from OOS and mutations remain server-authenticated.",
          facts: [
            { label: "Workflow", value: "model-profile-request" },
            { label: "Mutation", value: "OOS only" },
            { label: "Registry write", value: "Console denied" },
          ],
          id: "request-path",
          label: "Request Path",
          state: "current",
          tone: "ok",
        },
        {
          detail: "The lifecycle receipt, merged readback, and projected source are digest-bound.",
          facts: [
            { label: "Lifecycle receipt", value: text(artifacts.lifecycleReceipt.digest) },
            { label: "Merged readback", value: text(artifacts.mergedReadback.digest) },
            { label: "Authority", value: "Platform Engineering" },
          ],
          id: "reconciliation",
          label: "Reconciliation",
          state: "current",
          tone: "ok",
        },
      ],
      kicker: "Workspace Status",
      statusLabel: "Current",
      summary: "OOS request state and Platform profile source are connected through exact validated projections.",
      title: "Model Operations is source-projected",
      tone: "ok",
    },
  };
}

export function unavailableModelOperationsReadModel(
  reason: string,
): ModelOperationsReadModel {
  return {
    localExceptionRuntime: {
      endpoint: "not projected",
      models: [],
      observedAt: null,
      provider: "Local Exception Runtime",
      source: {
        authority: "local runtime",
        freshness: "unknown",
        observedAt: "not observed",
        ref: "local-runtime://disconnected",
        schemaVersion: "1",
        sourceVersion: "unavailable",
      },
      state: "unknown",
    },
    profiles: [],
    summary: modelOperationsSummaryFromProfiles([]),
    workspaceStatus: {
      ariaLabel: "Model Operations workspace status",
      detailDataAttribute: "data-model-operations-status-modal",
      items: [
        {
          detail: reason,
          facts: [
            { label: "Source", value: "unavailable" },
            { label: "Fallback", value: "denied" },
          ],
          id: "live-authority",
          label: "Live Authority",
          state: "blocked",
          tone: "danger",
        },
      ],
      kicker: "Workspace Status",
      statusLabel: "Unavailable",
      summary: reason,
      title: "Model Operations authority is unavailable",
      tone: "danger",
    },
  };
}

function projectProfile(
  profile: Record<string, unknown>,
  source: ModelProjectionSource,
  lifecycleReceipt: Record<string, unknown>,
  mergedReadback: Record<string, unknown>,
): ModelProfileRecord {
  const profileId = text(profile.profile_id);
  const lifecycle = oneOf(profile.lifecycle, ["active", "exception", "retired", "suspended"] as const);
  const activation = record(profile.activation);
  const activationAllowed = activation.activation_allowed === true && lifecycle === "active";
  const readiness: ModelReadinessState =
    lifecycle === "suspended"
      ? "suspended"
      : lifecycle === "retired"
        ? "blocked"
        : activationAllowed
          ? "ready"
          : "blocked";
  const callers = stringArray(profile.allowed_callers);
  const selectedEnvironments = stringArray(profile.selected_environments);
  const reviewRef = referenceLabel(record(profile.security_review_ref));
  const receiptMatches = lifecycleReceipt.profile_id === profileId;
  return {
    accessPlane: {
      activationAllowed,
      auditSinkStatus: "not included in bounded source projection",
      credentialOwner: "platform-engineering",
      directProviderPassthroughAllowed: false,
      id: "governed-ai-gateway",
      reason: textOr(activation.reason, `Platform lifecycle is ${lifecycle}.`),
      source,
      state: readiness,
      status: activationAllowed ? "activation-allowed" : "activation-blocked",
    },
    consumers: callers.map((callerId) => ({
      allowedDataScope: [],
      blockers: activationAllowed
        ? []
        : [{
            detail: `Platform lifecycle or activation evidence does not currently permit ${callerId}.`,
            id: "activation-not-allowed",
            label: "Activation is not allowed",
            owner: "platform-engineering",
            sourceRef: source.ref,
          }],
      callerId,
      callerRepo: callerId.split("/")[0] ?? callerId,
      callerWorkflow: callerId.split("/").slice(1).join("/") || callerId,
      eligibility: activationAllowed ? "eligible" : lifecycle === "suspended" ? "suspended" : "blocked",
      environments: selectedEnvironments,
      liveConsumptionAllowed: activationAllowed,
      outputSchemaRef: "Inspect the Platform policy source for the exact output contract.",
      owner: callerId.split("/")[0] ?? callerId,
      profileId,
      purpose: text(profile.purpose),
      source,
    })),
    latestAudit: {
      eventRef: receiptMatches ? `platform-model-profile-lifecycle://${text(lifecycleReceipt.receipt_id)}` : null,
      observedAt: receiptMatches ? text(lifecycleReceipt.recorded_at) : null,
      source,
      state: receiptMatches ? "ready" : "unknown",
      summary: receiptMatches
        ? `Platform lifecycle receipt reconciles through merged readback ${text(mergedReadback.source_version)}.`
        : "No lifecycle receipt in the current bounded projection applies to this profile.",
    },
    policy: {
      allowedCallers: callers,
      allowedDataScope: [],
      directProviderAccessAllowed: false,
      humanApprovalRequired: true,
      invocationPath: "governed-ai-gateway",
      lifecycle: lifecycle as ModelProfileLifecycle,
      outputSchemaRef: "Platform-owned policy source",
      profileId,
      provider: "Platform-controlled",
      purpose: text(profile.purpose),
      source,
      upstreamModel: "Platform-controlled",
    },
    requiredMove: {
      detail: requiredMoveDetail(lifecycle, activationAllowed),
      label: requiredMoveLabel(lifecycle, activationAllowed),
      owner: "platform-engineering",
      state: readiness,
      tone: activationAllowed ? "ok" : lifecycle === "retired" ? "muted" : "warn",
    },
    runtime: {
      contractId: "governed-ai-runtime-assist",
      gates: [
        {
          detail: `Canonical Platform lifecycle is ${lifecycle}.`,
          id: "profile-lifecycle",
          label: "Profile lifecycle",
          state: readiness,
        },
        {
          detail: textOr(activation.reason, "Platform did not project an activation reason."),
          id: "platform-activation",
          label: "Platform activation",
          state: readiness,
        },
      ],
      provider: "Platform-controlled",
      source,
      state: readiness,
      status: activationAllowed ? "ready" : "blocked",
      upstreamModel: "Platform-controlled",
    },
    security: {
      exceptionRef: lifecycle === "exception" ? reviewRef : null,
      reviewRefs: [reviewRef],
      source: { ...source, authority: "security-architecture", ref: reviewRef },
      state: lifecycle === "active" || lifecycle === "exception" ? "ready" : readiness,
      summary: `Platform binds this profile to Security evidence ${reviewRef}.`,
    },
  };
}

function requiredMoveLabel(lifecycle: string, activationAllowed: boolean) {
  if (activationAllowed) return "Monitor governed access";
  if (lifecycle === "retired") return "Keep retired";
  if (lifecycle === "suspended") return "Maintain suspension";
  if (lifecycle === "exception") return "Review exception scope";
  return "Resolve activation gates";
}

function requiredMoveDetail(lifecycle: string, activationAllowed: boolean) {
  if (activationAllowed) return "The Platform projection permits governed access for the registered callers.";
  return `Keep direct invocation denied while the Platform lifecycle is ${lifecycle} and activation is not allowed.`;
}

function referenceLabel(value: Record<string, unknown>) {
  return textOr(value.uri, textOr(value.ref, textOr(value.path, "security-review:unavailable")));
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Platform projection object.");
  return value as Record<string, unknown>;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Invalid Platform projection list.");
  return value;
}

function stringArray(value: unknown) {
  return array(value).map(text);
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value) throw new Error("Invalid Platform projection text.");
  return value;
}

function textOr(value: unknown, fallback: string) {
  return typeof value === "string" && value ? value : fallback;
}

function oneOf<const T extends readonly string[]>(value: unknown, values: T): T[number] {
  if (typeof value !== "string" || !values.includes(value)) throw new Error("Invalid Platform lifecycle.");
  return value as T[number];
}
