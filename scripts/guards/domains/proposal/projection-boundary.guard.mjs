import {
  assertAppFile,
  assertIncludes,
  assertOmits,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const root = "src/domain-workspaces/proposal";
const integrationsRoot = "src/domain-workspaces/operation-integrations";
const sourceAssignments = [
  'status: "captured"',
  'status: "done"',
  'status: "parked"',
  'status: "ready-to-route"',
  'status: "waiting-on-repository"',
  'status: "waiting-on-source"',
];

export const guard = {
  id: "proposal/projection-boundary",
  run() {
    const failures = [];
    const effectiveProjection =
      `${root}/local-runtime/proposal-effective-projection.ts`;
    const receiptProjection =
      `${root}/local-runtime/proposal-workflow-receipt-projection.ts`;
    const controller =
      `${root}/presentation/surface/use-proposal-control-controller.ts`;
    const requiredMove =
      `${root}/read-model/proposal-required-move.ts`;
    const attentionSource =
      `${root}/read-model/attention-source.ts`;
    const repositoryIntegration =
      `${integrationsRoot}/proposal-repository-request-projection.ts`;
    const prototypeIntegration =
      `${integrationsRoot}/proposal-prototype-entry-projection.ts`;
    const deliveryIntegration =
      `${integrationsRoot}/proposal-delivery-entry-projection.ts`;
    const workflowIntegration =
      `${integrationsRoot}/proposal-workflow-integration-runtime.ts`;

    for (const path of [
      `${root}/domain/proposal-types.ts`,
      `${root}/read-model/proposal-workspace-read-model.ts`,
      requiredMove,
      attentionSource,
      effectiveProjection,
      receiptProjection,
      controller,
      repositoryIntegration,
      prototypeIntegration,
      deliveryIntegration,
      workflowIntegration,
    ]) {
      assertAppFile(failures, path);
    }

    assertIncludes(failures, effectiveProjection, [
      "projectProposalEffectiveProjection",
      "projectProposalEffectiveRecords",
      "workflowReceiptsByProposal",
      "proposalWorkflowReceiptsForSource",
      "sourceBackendRecordId",
      "sourceRecordVersion",
      "proposalEffectiveRepositoryGateResolution",
      "resolution.proposalId",
      "resolution.sourceVersion",
      "projection.packet.sourceVersion",
      "projection.packet.targetDomain",
      "repositoryGateResolutions",
    ]);
    assertIncludes(failures, controller, [
      "effectiveRepositoryGateResolutions",
      "effectiveProjection.workflowReceiptsByProposal",
      "handoffPacketProjections",
      "projectProposalEffectiveProjection",
      "proposalEffectiveRepositoryGateResolution",
      "proposalWorkspaceSummaryMetrics",
      "submitProposalWorkflowIntegrationCommand",
    ]);
    assertOmits(failures, controller, [
      "handoffCustodyBySourceRecordId",
      "repositoryGateResolutions[selectedProposal.id]",
      "repositoryGateResolutions[hubProposal.id]",
      "syncProposalRepositoryRequestsFromRouteDrafts",
      "recordProposalDeliveryEntryPacketFromHandoff",
      "recordProposalPrototypeEntryPacketFromHandoff",
      "proposalWorkspaceReadModel.summary",
      "receiptsByProposal: proposalRuntimeProjection.workflowReceipts",
      "proposalRuntimeProjection.workflowReceipts[hubProposal.id]",
    ]);
    assertIncludes(failures, receiptProjection, [
      "proposalWorkflowReceiptsForSource",
      "proposalWorkflowReceiptsOldestFirst",
      "left.recordedAt.localeCompare(right.recordedAt)",
      "left.receiptId.localeCompare(right.receiptId)",
    ]);
    assertIncludes(failures, attentionSource, [
      "projectProposalEffectiveProjection",
      "projection.workflowReceiptsByProposal",
      "handoffPacketProjections",
    ]);
    assertOmits(failures, attentionSource, [
      "proposalHandoffCustodyFromPackets",
      "handoffCustodyBySourceRecordId",
    ]);
    assertOmits(failures, requiredMove, [
      "ProposalRepositoryGateResolution",
      "repositoryGateResolution",
    ]);
    assertIncludes(failures, workflowIntegration, [
      "submitProposalWorkflowApplyCommand",
      "recordProposalRepositoryRequestPacketFromDisposition",
      "recordProposalDeliveryEntryPacketFromHandoff",
      "recordProposalPrototypeEntryPacketFromHandoff",
    ]);
    assertOmits(failures, workflowIntegration, [
      "useEffect",
      'from "react"',
    ]);

    for (const path of [
      repositoryIntegration,
      prototypeIntegration,
      deliveryIntegration,
    ]) {
      assertIncludes(failures, path, [
        "createLocalOperationCrossDomainPacket",
        "createLocalOperationPacketCustody",
        'authority: "prototype-local"',
      ]);
    }
    assertOmits(failures, repositoryIntegration, [
      "RepositoryWorkspaceRecord",
      "repositoryRecordFromProposalRequestPacket",
    ]);

    for (const file of walkFiles(root, [".ts", ".tsx"])) {
      const path = relativeAppPath(file);
      if (
        path.startsWith(`${root}/domain/`) ||
        path.startsWith(`${root}/read-model/`) ||
        path === `${root}/local-runtime/proposal-capture-record-factory.ts` ||
        path === `${root}/local-runtime/proposal-effective-projection.ts`
      ) {
        continue;
      }

      const source = readAppFile(path);
      for (const assignment of sourceAssignments) {
        if (source.includes(assignment)) {
          failures.push(
            `${path}: canonical Proposal source status must not be assigned outside the read model`,
          );
        }
      }
    }

    return failures;
  },
};

export default guard;
