import assert from "node:assert/strict";
import test from "node:test";

import {
  getProposalRepositoryGateResolutions,
  recordProposalRepositoryRequestPacketFromDisposition,
  subscribeProposalRepositoryRequestPacketProjections,
} from "../../src/domain-workspaces/operation-integrations/proposal-repository-request-projection.ts";
import { proposalWorkspaceReadModel } from "../../src/domain-workspaces/proposal/read-model/proposal-workspace-read-model.ts";
import { proposalRouteSelectionDraftFromProposal } from "../../src/domain-workspaces/proposal/work-model/proposal-disposition-model.ts";

test("Proposal repository packet recording is idempotent", () => {
  const proposal = proposalWorkspaceReadModel.proposals.find(
    (candidate) => candidate.id === "PR-839",
  );
  assert.ok(proposal);
  const producerReceipt = {
    receiptId: "proposal-disposition-idempotency",
    recordedAt: "2026-07-10T14:00:00.000Z",
  };
  const routeSelectionDraft =
    proposalRouteSelectionDraftFromProposal(proposal);

  recordProposalRepositoryRequestPacketFromDisposition({
    producerReceipt,
    proposal,
    routeSelectionDraft,
  });

  let emissions = 0;
  const unsubscribe = subscribeProposalRepositoryRequestPacketProjections(() => {
    emissions += 1;
  });
  const before = getProposalRepositoryGateResolutions();

  recordProposalRepositoryRequestPacketFromDisposition({
    producerReceipt,
    proposal,
    routeSelectionDraft,
  });

  const after = getProposalRepositoryGateResolutions();
  unsubscribe();

  assert.equal(after, before);
  assert.equal(emissions, 0);
});
