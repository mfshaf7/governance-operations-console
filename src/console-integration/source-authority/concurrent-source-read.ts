import { createHash } from "node:crypto";
import type { ConsoleOosConnection } from "../configuration/console-runtime-configuration.ts";
import { consoleMutationAttributionHeaders } from "../identity/server/console-session-authorization.ts";

const reads = new Map<string, Promise<unknown>>();
const transports = new WeakMap<typeof fetch, number>();
let sequence = 0;

// Same-authority concurrent GETs only. Nothing survives a settled request;
// credentials, operator attribution and injected transports cannot share data.
export async function concurrentSourceRead<T>(scope: string, config: ConsoleOosConnection & { operatorId?: string; operatorHandle?: string },
  transport: typeof fetch, read: () => Promise<T>): Promise<T> {
  if (!transports.has(transport)) transports.set(transport, ++sequence);
  const key = createHash("sha256").update(JSON.stringify([scope, config,
    consoleMutationAttributionHeaders(), transports.get(transport)])).digest("hex");
  let pending = reads.get(key) as Promise<T> | undefined;
  if (!pending) {
    if (reads.size >= 32) return read();
    pending = Promise.resolve().then(read);
    reads.set(key, pending);
    void pending.finally(() => { if (reads.get(key) === pending) reads.delete(key); }).catch(() => undefined);
  }
  return structuredClone(await pending);
}
