import {
  assertAppFile,
  assertIncludes,
  assertOmits,
} from "../../guard-lib.mjs";

const root = "src/domain-workspaces/repository";
const integration =
  "src/domain-workspaces/operation-integrations/proposal-repository-request-projection.ts";

export const guard = {
  id: "repository/projection-boundary",
  run() {
    const failures = [];
    const effectiveProjection =
      `${root}/local-runtime/repository-effective-projection.ts`;
    const ingressRuntime =
      `${root}/local-runtime/ingress/repository-ingress-runtime.ts`;
    const packetProjection =
      `${root}/work-model/ingress/proposal-repository-request-packet.ts`;
    const controller =
      `${root}/presentation/surface/use-repository-control-controller.ts`;
    const runtimeModel =
      `${root}/local-runtime/repository-runtime-model.ts`;
    const runtime =
      `${root}/local-runtime/repository-runtime.ts`;
    const custodyClient =
      `${root}/server/repository-custody-oos-client.ts`;
    const custodyContract =
      `${root}/live-runtime/repository-custody-live-contract.ts`;
    const custodyHook =
      `${root}/live-runtime/use-repository-custody-live-runtime.ts`;
    const custodyProjection =
      `${root}/live-runtime/repository-custody-live-projection.ts`;
    const custodyDialog =
      `${root}/presentation/dialogs/custody/repository-custody-dialog.tsx`;

    for (const path of [
      `${root}/read-model/repository-workspace-read-model.ts`,
      runtime,
      runtimeModel,
      effectiveProjection,
      ingressRuntime,
      packetProjection,
      controller,
      custodyClient,
      custodyContract,
      custodyHook,
      custodyProjection,
      custodyDialog,
      integration,
    ]) {
      assertAppFile(failures, path);
    }

    assertIncludes(failures, controller, [
      "projectRepositoryEffectiveRecordProjections",
      "recordProjectionById",
      "repositorySummaryFromRecords(records)",
      "runtimeProjection: repositoryRuntimeProjection",
      "sourceRecords: repositoryWorkspaceReadModel.records",
    ]);
    assertOmits(failures, controller, [
      "repositoryRuntimeProjection.admissionReceipts",
      "repositoryRuntimeProjection.retirementRequestReceipts",
    ]);
    assertIncludes(failures, effectiveProjection, [
      "projectRepositoryEffectiveRecordProjections",
      "projectRepositoryEffectiveRecords",
      "runtimeProjection.receiptsByRecord",
      "repositoryRecordSourceVersion",
      "receipt.sourceRecordVersion",
      "left.receiptId.localeCompare(right.receiptId)",
    ]);
    assertOmits(failures, effectiveProjection, [
      'admissionState: "admitted"',
      "accepted locally",
      "runtimeProjection.admissionReceipts",
      "runtimeProjection.retirementRequestReceipts",
    ]);
    assertIncludes(failures, runtimeModel, [
      "proposalSourceVersion",
      "sourceRecordVersion",
    ]);
    assertOmits(failures, runtimeModel, [
      "admissionReceipts:",
      "retirementRequestReceipts:",
    ]);
    assertIncludes(failures, runtime, [
      "record.proposalGate.sourceVersion",
      "sourceRecordVersion",
    ]);

    assertIncludes(failures, custodyClient, [
      '"/v1/repository-custody/requests"',
      '"x-oos-caller-id"',
      '"x-oos-caller-secret"',
      "REPOSITORY_CUSTODY_POLICY_PROFILE_DIGEST",
      "REPOSITORY_CUSTODY_CREDENTIAL_BINDING_DIGEST",
      "assertRepositoryCustodyWorkflowResult",
      "assertCanonicalRepositoryCustodyRequest",
      "canonicalStringify(result.request) !== canonicalStringify(request)",
    ]);
    assertOmits(failures, custodyClient, [
      "api.github.com",
      "WGCF_REPOSITORY_CUSTODY_BASE_URL",
    ]);
    assertIncludes(failures, custodyContract, [
      "assertRepositoryCustodyWorkflowResult",
      "readback provider repository identity",
      "receipt provider repository identity",
      "receipt readback digest",
    ]);
    assertIncludes(failures, custodyHook, [
      'fetch("/api/repositories/custody/requests"',
      "assertRepositoryCustodyWorkflowResult",
    ]);
    assertOmits(failures, custodyHook, ["OOS_CALLER_SECRET", "fixtures/"]);
    assertIncludes(failures, custodyProjection, [
      "projectRepositoryCustodyResults",
      'result?.status !== "succeeded"',
      "record.providerIdentity.repositoryId",
      'state: "linked"',
    ]);
    assertIncludes(failures, custodyDialog, [
      "RepositoryCustodyDialog",
      "Link Existing Repository",
      "Back to Register",
    ]);

    assertIncludes(failures, integration, [
      "createLocalOperationCrossDomainPacket",
      "createLocalOperationPacketCustody",
      "ProposalRepositoryRequestPacketProjection",
      'sourceOwner: "proposal-repository-gate"',
    ]);
    assertOmits(failures, integration, [
      "RepositoryWorkspaceRecord",
      "repositoryRecordFromProposalRequestPacket",
    ]);
    assertIncludes(failures, packetProjection, [
      "ProposalRepositoryRequestPacketProjection",
      "assertOperationPacketCustody",
      "matchingProposalRepositoryGateResolution",
      "repositoryRecordFromProposalRequestPacket",
      "resolution.repoRequestRef !== packet.payload.repoRef",
      "resolution.sourceVersion !== packet.sourceVersion",
    ]);
    assertIncludes(failures, ingressRuntime, [
      "getProposalRepositoryRequestPacketProjections",
      "repositoryRecordFromProposalRequestPacket",
      "acknowledgeProposalRepositoryRequestPacket",
      'state: "admitted"',
      'state: "rejected"',
    ]);

    return failures;
  },
};

export default guard;
