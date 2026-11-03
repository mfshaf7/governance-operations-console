import { assertRepositoryCustodyWorkflowResult } from "./repository-custody-live-contract.ts";
import type { RepositoryCustodyWorkflowResult } from "./repository-custody-live-types.ts";

export class RepositoryCustodyReadError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) { super(message); this.retryable = retryable; }
}

export async function readRepositoryCustodyRegister(
  fetchImpl: typeof fetch = fetch,
): Promise<RepositoryCustodyWorkflowResult[]> {
  const records: RepositoryCustodyWorkflowResult[] = [];
  const identities = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < 10; page += 1) {
    let response: Response;
    try {
      response = await fetchImpl(
        `/api/repositories/custody/requests${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
        { cache: "no-store" },
      );
    } catch { throw new RepositoryCustodyReadError("Repository history could not be reached.", true); }
    const value: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const failure = value && typeof value === "object" ? value as { code?: string; retryable?: boolean } : null;
      throw new RepositoryCustodyReadError("Canonical Repository request records are unavailable or invalid.",
        failure?.retryable === true || (!failure?.code && [408,429,502,503,504].includes(response.status)));
    }
    if (
      !response.ok || typeof value !== "object" || value === null ||
      !("mode" in value) || value.mode !== "live" ||
      !("status" in value) || value.status !== "current" ||
      !("schema_version" in value) || value.schema_version !== 1 ||
      !("records" in value) || !Array.isArray(value.records) || value.records.length > 25 ||
      !("next_cursor" in value) ||
      (value.next_cursor !== null &&
        (typeof value.next_cursor !== "string" || !/^[a-f0-9]{64}$/.test(value.next_cursor)))
    ) {
      throw new RepositoryCustodyReadError("Canonical Repository request records are unavailable or invalid.", false);
    }
    for (const entry of value.records) {
      const record = assertRepositoryCustodyWorkflowResult(entry);
      if (identities.has(record.request.request_id)) {
        throw new Error("Canonical Repository request identities conflict across pages.");
      }
      identities.add(record.request.request_id);
      records.push(record);
    }
    if (value.next_cursor === null) return records;
    if (cursors.has(value.next_cursor)) {
      throw new Error("Canonical Repository pagination did not advance.");
    }
    cursor = value.next_cursor;
    cursors.add(cursor);
  }
  throw new Error("Canonical Repository readback exceeded the bounded register size.");
}
