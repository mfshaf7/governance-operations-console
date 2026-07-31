import {
  getProposalRuntimeProjectionSnapshot,
  subscribeProposalRuntimeProjection,
} from "../local-runtime/proposal-runtime.ts";

export const proposalActivitySource = {
  getRuntimeSnapshot: getProposalRuntimeProjectionSnapshot,
  subscribeRuntime: subscribeProposalRuntimeProjection,
} as const;
