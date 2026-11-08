import type { PlatformOperationRecord } from "../live-runtime/platform-operation-types.ts";
import {
  assertSourceOperationIntent,
  assertSourceOperationReceipt,
  sourceOperationIntentFromReceipt,
} from "../live-runtime/source-authorization-contract.ts";

// Status/access are observations, not workflows whose terminal failure blocks
// delivery. Their original outcome and retry controls stay in operation history.
export const platformOperationHistoryWindow = 200;

export function platformOperationCollectionComplete(operations: readonly unknown[], historyPage?: unknown): boolean {
  if (historyPage !== null && historyPage !== undefined) {
    if (typeof historyPage !== "object" || Array.isArray(historyPage)) return false;
    const page = historyPage as { total?: unknown; next_cursor?: unknown };
    return typeof page.total === "number" && Number.isSafeInteger(page.total) && page.total >= 0 &&
      page.next_cursor === null && operations.length >= page.total;
  }
  return operations.length < platformOperationHistoryWindow;
}

const diagnosticActions = new Set(["dev-integration.status", "dev-integration.access"]);

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function revokedIntent(operation: PlatformOperationRecord): string | null {
  if (operation.state !== "succeeded" || operation.command.action !== "agent-source.revoke") return null;
  const receipt = operation.provider_operation?.receipt;
  if (receipt?.outcome !== "succeeded" || receipt.effect !== "verified") return null;
  try {
    const intent = assertSourceOperationIntent(operation.command.input.source_intent);
    const credential = assertSourceOperationReceipt(receipt.source_credential);
    if (credential.action !== "agent-source.revoke" || credential.outcome !== "revoked" ||
        credential.command_id !== operation.command.command_id) return null;
    const identity = canonical(intent);
    // Compare every bound intent field, not just a profile, repo, timestamp or
    // intent id. A different successful request never resolves this one.
    return identity === canonical(sourceOperationIntentFromReceipt(credential)) ? identity : null;
  } catch { return null; }
}

export function platformOperationsNeedingRecovery(
  operations: readonly PlatformOperationRecord[],
): PlatformOperationRecord[] {
  const revoked = new Set(operations.map(revokedIntent).filter((value): value is string => value !== null));
  return operations.filter(operation => {
    if (operation.state === "succeeded" || operation.state === "cancelled") return false;
    if (operation.state !== "failed") return true;
    if (diagnosticActions.has(operation.command.action)) return false;
    if (!["agent-source.issue", "agent-source.renew", "agent-source.revoke"].includes(operation.command.action)) return true;
    try {
      return !revoked.has(canonical(assertSourceOperationIntent(operation.command.input.source_intent)));
    } catch { return true; }
  });
}
