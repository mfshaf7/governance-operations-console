export {
  ProposalWorkspace,
  getProposalOperationWorkbenchContract,
} from "./presentation/workspace/index.ts";
export type { ProposalWorkspaceProps } from "./presentation/workspace/index.ts";
export { proposalActivitySource } from "./read-model/activity-source.ts";
export { proposalAttentionSource, projectProposalOwnerAttention, projectProposalLifecycleOutcomes } from "./read-model/attention-source.ts";
export { readProposalCollection, proposalCollectionComplete } from "./live-runtime/proposal-collection-read.ts";
