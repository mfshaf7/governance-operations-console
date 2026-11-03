import type { RepositoryCustodyWorkflowResult } from "../repository/live-runtime/repository-custody-live-types.ts";

export function repositoryCreationProposalId(result: RepositoryCustodyWorkflowResult): string | null {
  if (result.request.action !== "provision-new") return null;
  return /^repo-request:\/\/proposal\/(idea-[1-9][0-9]*)$/.exec(result.request.correlation.correlation_id)?.[1] ?? null;
}
export function repositoryCreationForProposal(result: RepositoryCustodyWorkflowResult, proposalId: string): boolean {
  return repositoryCreationProposalId(result) === proposalId;
}

export function repositoryAttachmentProposalId(result: RepositoryCustodyWorkflowResult): string | null {
  if (!["provision-new","link-existing"].includes(result.request.action)) return null;
  return /^repo-request:\/\/proposal\/(idea-[1-9][0-9]*)$/.exec(result.request.correlation.correlation_id)?.[1] ?? null;
}
export function repositoryFulfilmentForProposal(result: RepositoryCustodyWorkflowResult, proposalId: string) {
  return repositoryAttachmentProposalId(result) === proposalId;
}
