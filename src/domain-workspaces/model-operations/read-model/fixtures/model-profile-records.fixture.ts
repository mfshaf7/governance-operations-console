import type { ModelProfileRecord } from "../types/model-operations-types.ts";

const profileRegistrySource = {
  authority: "platform-engineering",
  freshness: "current",
  observedAt: "2026-07-14",
  ref: "platform-engineering/security/governed-ai-model-profiles.yaml",
  schemaVersion: "1",
  sourceVersion: "registry-schema-v1",
} as const;

const accessPlaneSource = {
  authority: "platform-engineering",
  freshness: "current",
  observedAt: "2026-07-14",
  ref: "platform-engineering/security/governed-ai-access-plane.yaml",
  schemaVersion: "1",
  sourceVersion: "access-plane-schema-v1",
} as const;

const runtimeContractSource = {
  authority: "platform-engineering",
  freshness: "current",
  observedAt: "2026-07-14",
  ref: "platform-engineering/security/governed-ai-runtime-assist-contract.yaml",
  schemaVersion: "1",
  sourceVersion: "bounded-runtime-assist-v1",
} as const;

const consumerContractSource = {
  authority: "workspace-governance",
  freshness: "current",
  observedAt: "2026-07-14",
  ref: "workspace-governance/contracts/governed-intake-assist.yaml",
  schemaVersion: "1",
  sourceVersion: "governed-intake-assist-v1",
} as const;

const securityReviewSource = {
  authority: "security-architecture",
  freshness: "current",
  observedAt: "2026-07-14",
  ref: "security-architecture/docs/reviews/platform/2026-04-29-bounded-governed-ai-runtime-assist-activation.md",
  schemaVersion: "1",
  sourceVersion: "bounded-runtime-assist-review",
} as const;

export const modelProfileRecords: ModelProfileRecord[] = [
  {
    accessPlane: {
      activationAllowed: false,
      auditSinkStatus: "devint-local-ledger",
      credentialOwner: "platform-engineering",
      directProviderPassthroughAllowed: false,
      id: "governed-ai-gateway",
      reason:
        "Live profile activation remains blocked until runtime smoke, provider-egress, security, consumer, and rollback evidence are complete.",
      source: accessPlaneSource,
      state: "blocked",
      status: "devint-runtime-defined",
    },
    consumers: [
      {
        allowedDataScope: [
          "repo metadata",
          "top-level manifests",
          "README excerpts",
          "AGENTS excerpts",
          "operator-supplied intake notes",
        ],
        blockers: [
          {
            detail:
              "The registered profile is suspended and the access plane does not allow activation.",
            id: "profile-suspended",
            label: "Profile is suspended",
            owner: "platform-engineering",
            sourceRef: profileRegistrySource.ref,
          },
          {
            detail:
              "The workspace consumer contract explicitly keeps live consumption disabled until every activation gate passes.",
            id: "consumer-not-active",
            label: "Consumer activation is disabled",
            owner: "workspace-governance",
            sourceRef: consumerContractSource.ref,
          },
        ],
        callerId: "workspace-governance/intake-assist",
        callerRepo: "workspace-governance",
        callerWorkflow: "governed-intake-assist",
        eligibility: "suspended",
        environments: ["dev-integration"],
        liveConsumptionAllowed: false,
        outputSchemaRef:
          "workspace-governance/contracts/schemas/intake-ai-suggestion.schema.json",
        owner: "workspace-governance",
        profileId: "intake-classifier-v1",
        purpose: "workspace-intake-assist",
        source: consumerContractSource,
      },
    ],
    latestAudit: {
      eventRef: null,
      observedAt: null,
      source: {
        ...accessPlaneSource,
        freshness: "unknown",
        ref: "governed-ai-gateway/v1/audit/events/latest",
        sourceVersion: "unavailable",
      },
      state: "unknown",
      summary:
        "No ordered profile audit projection is connected to the Console prototype.",
    },
    policy: {
      allowedCallers: ["workspace-governance/intake-assist"],
      allowedDataScope: [
        "repo metadata",
        "top-level manifests",
        "README excerpts",
        "AGENTS excerpts",
        "operator-supplied intake notes",
      ],
      directProviderAccessAllowed: false,
      humanApprovalRequired: true,
      invocationPath: "governed-ai-gateway",
      lifecycle: "suspended",
      outputSchemaRef:
        "workspace-governance/contracts/schemas/intake-ai-suggestion.schema.json",
      profileId: "intake-classifier-v1",
      provider: "internal-ai-gateway",
      purpose: "workspace-intake-assist",
      source: profileRegistrySource,
      upstreamModel: "pending-selection",
    },
    requiredMove: {
      detail:
        "Keep the profile suspended until upstream selection, consumer activation, identity, audit, egress, runtime, rollback, and security evidence are complete.",
      label: "Maintain suspension",
      owner: "platform-engineering",
      state: "suspended",
      tone: "warn",
    },
    runtime: {
      contractId: "bounded-runtime-assist-v1",
      gates: [
        {
          detail:
            "The canonical profile is suspended and has no selected upstream model.",
          id: "profile-active",
          label: "Profile active",
          state: "suspended",
        },
        {
          detail:
            "The gateway runtime shape exists only in dev-integration proof.",
          id: "access-plane-live",
          label: "Access plane live",
          state: "blocked",
        },
        {
          detail:
            "Caller and operator identities are not yet proven in a live consumer flow.",
          id: "identity-boundary-live",
          label: "Identity boundary",
          state: "blocked",
        },
        {
          detail:
            "The local audit ledger exists, but governed retention evidence is incomplete.",
          id: "audit-retention-live",
          label: "Audit retention",
          state: "blocked",
        },
        {
          detail:
            "Consumer-side provider bypass must remain technically blocked.",
          id: "provider-egress-blocked",
          label: "Provider egress blocked",
          state: "blocked",
        },
        {
          detail:
            "A current security delta review must approve the exact activation scope.",
          id: "security-delta-review-current",
          label: "Security review current",
          state: "blocked",
        },
      ],
      provider: "internal-ai-gateway",
      source: runtimeContractSource,
      state: "blocked",
      status: "blocked",
      upstreamModel: "pending-selection",
    },
    security: {
      exceptionRef: null,
      reviewRefs: [
        "security-architecture/docs/reviews/platform/2026-04-18-governed-ai-intake-assist-and-model-profiles.md",
        securityReviewSource.ref,
      ],
      source: securityReviewSource,
      state: "blocked",
      summary:
        "The profile and access-plane design are reviewed, but live activation remains unapproved.",
    },
  },
];
