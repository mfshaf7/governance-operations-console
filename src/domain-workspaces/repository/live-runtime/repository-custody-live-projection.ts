import type { RepositoryWorkspaceRecord } from "../domain/repository-types.ts";
import type { RepositoryCustodyWorkflowResult } from "./repository-custody-live-types.ts";

export function projectRepositoryCustodyResults(
  records: readonly RepositoryWorkspaceRecord[],
  resultsByRepositoryId: Readonly<
    Record<string, RepositoryCustodyWorkflowResult>
  >,
): RepositoryWorkspaceRecord[] {
  return records.map((record) => {
    const result = resultsByRepositoryId[record.id];
    if (
      result?.status !== "succeeded" ||
      !record.custody ||
      !record.providerIdentity ||
      result.request.target.provider !== record.providerIdentity.provider ||
      result.request.target.provider_repository_id !==
        record.providerIdentity.repositoryId ||
      result.request.requested_custody.workspace_owner_ref !==
        record.custody.workspaceOwnerRef ||
      result.receipt.custody.after !== "linked"
    ) {
      return record;
    }
    return {
      ...record,
      custody: {
        ...record.custody,
        state: "linked" as const,
      },
      nextAction:
        "Review the authoritative custody receipt and use separate downstream actions when required.",
    };
  });
}
