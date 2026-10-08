import {
  assertAppFile,
  assertIncludes,
  assertOmits,
  assertRepoIncludes,
} from "../../guard-lib.mjs";

const modelOperationsRoot = "src/domain-workspaces/model-operations";
const profileFixture = `${modelOperationsRoot}/read-model/fixtures/model-profile-records.fixture.ts`;
const profileSelectors = `${modelOperationsRoot}/read-model/selectors/model-profile-selectors.ts`;
const requestCapability = `${modelOperationsRoot}/work-model/profile-requests/model-profile-request-capability.ts`;
const oosClient = `${modelOperationsRoot}/server/model-operations-oos-client.ts`;
const platformAdapter = `${modelOperationsRoot}/server/model-operations-platform-adapter.ts`;
const operatingProjection = `${modelOperationsRoot}/live-runtime/model-operations-operating-projection.ts`;

export const guard = {
  id: "model-operations/projection-boundary",
  run() {
    const failures = [];

    for (const requiredPath of [
      profileFixture,
      profileSelectors,
      requestCapability,
      oosClient,
      platformAdapter,
      operatingProjection,
      `${modelOperationsRoot}/read-model/model-operations-read-model.ts`,
      `${modelOperationsRoot}/read-model/fixtures/model-operations-workspace.fixture.ts`,
      `${modelOperationsRoot}/read-model/fixtures/model-operations-workspace-status.fixture.ts`,
    ]) {
      assertAppFile(failures, requiredPath);
    }

    assertRepoIncludes(
      failures,
      "docs/product/domain-contracts/model-operations.md",
      [
        "Invocation eligibility is caller-specific.",
        "Local Exception Runtime",
        "fabricate request, activation, audit, history, or receipt truth",
      ],
    );
    assertIncludes(failures, profileFixture, [
      "platform-engineering/security/governed-ai-model-profiles.yaml",
      "platform-engineering/security/governed-ai-access-plane.yaml",
      "platform-engineering/security/governed-ai-runtime-assist-contract.yaml",
      "workspace-governance/contracts/governed-intake-assist.yaml",
      'lifecycle: "suspended"',
      'upstreamModel: "pending-selection"',
      "directProviderAccessAllowed: false",
      "activationAllowed: false",
      "liveConsumptionAllowed: false",
      'status: "blocked"',
    ]);
    assertIncludes(failures, profileSelectors, [
      "modelProfileAvailability",
      'case "active":',
      'case "exception":',
      'case "retired":',
      'case "suspended":',
      'id: "available"',
      'label: "Available"',
      'id: "blocked"',
      'label: "Blocked"',
      'id: "suspended"',
      'label: "Suspended"',
      'id: "exception"',
      'label: "Exception"',
      'id: "retired"',
      'label: "Retired"',
    ]);
    assertIncludes(failures, requestCapability, [
      'actionSemantic: "submit"',
      'availability: "available"',
      'backendOwner: "platform-engineering"',
      'workflowOwner: "operator-orchestration-service"',
      '"OOS owns request and review state"',
      '"Console stores no durable request or profile truth"',
    ]);
    assertIncludes(failures, oosClient, [
      '"x-oos-operator-id"',
      "consoleSourceProjectionHeaders",
      "acceptCurrentConsoleSourceProjection",
      'intent: "create"',
      "profile_id: null",
      "source: null",
    ]);
    assertIncludes(failures, platformAdapter, [
      "readPrivateJson",
      "canonicalDigest(value, \"digest\")",
      'value.owner_repo !== "platform-engineering"',
      'fulfillment.state !== "applied"',
    ]);
    assertIncludes(failures, operatingProjection, [
      'workflow_id: "model-operations-live-projection"',
      'console_mutation_authority: false',
      'request.next_action !== "refresh-authoritative-projections"',
    ]);
    assertOmits(failures, requestCapability, [
      'actionSemantic: "unavailable"',
      'availability: "planned"',
    ]);
    assertOmits(failures, profileFixture, [
      'lifecycle: "active"',
      "directProviderAccessAllowed: true",
      "activationAllowed: true",
      "liveConsumptionAllowed: true",
    ]);

    return failures;
  },
};

export default guard;
