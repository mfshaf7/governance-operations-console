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

export const guard = {
  id: "model-operations/projection-boundary",
  run() {
    const failures = [];

    for (const requiredPath of [
      profileFixture,
      profileSelectors,
      requestCapability,
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
      'actionSemantic: "unavailable"',
      'availability: "planned"',
      'backendOwner: "platform-engineering"',
      'workflowOwner: "operator-orchestration-service"',
      '"request schema"',
      '"command and receipt contract"',
      '"source-version reconciliation"',
      '"projection refresh"',
      '"rollback behavior"',
    ]);
    assertOmits(failures, requestCapability, [
      'actionSemantic: "submit"',
      'availability: "available"',
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
