"use client";

import { useEffect, useRef, useState } from "react";
import { browserOperationTabStorage } from "../../operation-runtime/browser-draft-store.ts";

export type DeliveryCommandReference = {
  kind: "work-session" | "change-control";
  target: string;
  commandId: string;
};
export type DeliveryPublication = { url: string; head_commit: string };

type Outcome =
  | { state: "pending" | "unconfirmed" | "failed"; rebuildRevision?: string; publication?: DeliveryPublication }
  | { state: "completed"; result: unknown };

const storagePrefix = "console.delivery.command.";
const pollIntervalMs = 5000;

export class DeliveryCommandUnconfirmed extends Error {
  constructor() {
    super("The Console is checking the original operation. Its outcome is still unconfirmed.");
  }
}

function validReference(value: unknown): value is DeliveryCommandReference {
  if (!value || typeof value !== "object") return false;
  const ref = value as DeliveryCommandReference;
  if (typeof ref.commandId !== "string" || ref.commandId.length > 200 || typeof ref.target !== "string") return false;
  return ref.kind === "work-session"
    ? /^[1-9][0-9]*$/.test(ref.target) && /^work-session-command:[A-Za-z0-9._:-]+$/.test(ref.commandId)
    : ref.kind === "change-control" && /^delivery-[1-9][0-9]*$/.test(ref.target) && /^delivery-change-command:[A-Za-z0-9._:-]+$/.test(ref.commandId);
}

function readReference(scope: string) {
  try {
    const value: unknown = JSON.parse(browserOperationTabStorage()?.getItem(storagePrefix + scope) ?? "null");
    return validReference(value) ? value : null;
  } catch {
    return null;
  }
}

function removeReference(scope: string, ref: DeliveryCommandReference) {
  if (readReference(scope)?.commandId === ref.commandId) browserOperationTabStorage()?.removeItem(storagePrefix + scope);
}

async function readOutcome(ref: DeliveryCommandReference): Promise<Outcome> {
  const response = await fetch(
    `/api/delivery/execution/${ref.target}/${ref.kind}/commands/${encodeURIComponent(ref.commandId)}`,
    { cache: "no-store" },
  );
  if (!response.ok) throw new DeliveryCommandUnconfirmed();
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("state" in body)) throw new DeliveryCommandUnconfirmed();
  const state = body.state;
  if (state === "completed" && "result" in body) return { state, result: body.result };
  if (state === "pending" || state === "unconfirmed" || state === "failed") {
    const rebuildRevision = state === "pending" && ref.kind === "work-session" && "rebuildRevision" in body &&
      typeof body.rebuildRevision === "string" && Number.isFinite(Date.parse(body.rebuildRevision)) ? body.rebuildRevision : undefined;
    const publication = state === "pending" && ref.kind === "work-session" && "publication" in body
      ? validPublication(body.publication) : undefined;
    return { state, rebuildRevision, publication };
  }
  throw new DeliveryCommandUnconfirmed();
}

function validPublication(value: unknown): DeliveryPublication | undefined {
  if (!value || typeof value !== "object" || !("url" in value) || !("head_commit" in value) ||
      typeof value.url !== "string" || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/[1-9][0-9]*$/.test(value.url) ||
      typeof value.head_commit !== "string" || !/^[a-f0-9]{40}$/.test(value.head_commit)) return;
  return { url: value.url, head_commit: value.head_commit };
}

function delay() {
  return new Promise<void>(resolve => setTimeout(resolve, pollIntervalMs));
}

export async function submitTrackedDeliveryCommand<T>({
  scope, reference, send, accept, reject, onChecking, onPublication, resume = false,
}: {
  scope: string;
  reference: DeliveryCommandReference;
  send: () => Promise<Response>;
  accept: (body: unknown, recovered: boolean) => T;
  reject: (body: unknown, status: number) => Error;
  onChecking?: () => void;
  onPublication?: (publication: DeliveryPublication) => void;
  resume?: boolean;
}): Promise<T> {
  const prior = readReference(scope);
  if (prior && (!resume || prior.commandId !== reference.commandId || prior.kind !== reference.kind || prior.target !== reference.target)) {
    throw new DeliveryCommandUnconfirmed();
  }
  try {
    const storage = browserOperationTabStorage();
    if (!storage) throw new Error("Browser tab storage unavailable.");
    storage.setItem(storagePrefix + scope, JSON.stringify(reference));
  } catch {
    throw new Error("The Console couldn’t keep this operation reference in the current browser tab. Allow tab storage and try again.");
  }
  let response: Response | null = null;
  let body: unknown;
  let observing = Boolean(onPublication);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const checkPublication = async () => {
    const outcome = await readOutcome(reference).catch(() => null);
    if (!observing) return;
    if (outcome?.state === "pending" && outcome.publication) onPublication?.(outcome.publication);
    else timer = setTimeout(checkPublication, pollIntervalMs);
  };
  if (observing) timer = setTimeout(checkPublication, pollIntervalMs);
  try {
    response = await send();
    body = await response.json();
  } catch {
    // A dropped response leaves the exact owner command available for reconciliation.
  } finally {
    observing = false;
    clearTimeout(timer);
  }
  if (response?.ok && body !== undefined) {
    try {
      const result = accept(body, false);
      removeReference(scope, reference);
      return result;
    } catch {
      // Do not acknowledge a response that did not satisfy the result contract.
    }
  }
  const code = typeof body === "object" && body !== null && "code" in body ? body.code : null;
  if (response && !response.ok && response.status < 500 && ![408, 429].includes(response.status) &&
      code !== "delivery_art_work_session_command_outcome_unknown" && code !== "delivery_change_reconciliation_required" &&
      !(resume && code === "delivery_art_work_session_locked")) {
    removeReference(scope, reference);
    throw reject(body, response.status);
  }

  onChecking?.();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const outcome = await readOutcome(reference).catch(() => null);
    if (outcome?.state === "pending" && outcome.publication) onPublication?.(outcome.publication);
    if (outcome?.state === "completed") {
      const result = accept(outcome.result, true);
      removeReference(scope, reference);
      return result;
    }
    if (outcome?.state === "failed") {
      removeReference(scope, reference);
      throw reject({ error: "Delivery reported a problem with the original operation. Review the current state before trying again." }, 409);
    }
    if (outcome?.state === "pending" && outcome.rebuildRevision) throw new DeliveryCommandUnconfirmed();
    await delay();
  }
  throw new DeliveryCommandUnconfirmed();
}

export function useDeliveryCommandRecovery(
  scope: string | null, busy: boolean, onRecovered: (result: unknown) => boolean,
  onRebuild?: (pending: { reference: DeliveryCommandReference; revision: string } | null) => void,
  onPublication?: (publication: DeliveryPublication) => void,
) {
  const [status, setStatus] = useState<"idle" | "checking" | "completed" | "failed">("idle");
  const resultHandler = useRef(onRecovered);
  resultHandler.current = onRecovered;
  const rebuildHandler = useRef(onRebuild);
  rebuildHandler.current = onRebuild;
  const publicationHandler = useRef(onPublication);
  publicationHandler.current = onPublication;
  useEffect(() => setStatus("idle"), [scope]);

  useEffect(() => {
    rebuildHandler.current?.(null);
    if (busy) {
      setStatus("idle");
      return;
    }
    if (!scope) return;
    const reference = readReference(scope);
    if (!reference) return;
    let current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setStatus("checking");
    async function check() {
      if (!scope || !reference || !current) return;
      try {
        const outcome = await readOutcome(reference);
        if (!current) return;
        rebuildHandler.current?.(outcome.state === "pending" && outcome.rebuildRevision
          ? { reference, revision: outcome.rebuildRevision } : null);
        if (outcome.state === "pending" && outcome.publication) publicationHandler.current?.(outcome.publication);
        if (outcome.state === "completed") {
          const applied = resultHandler.current(outcome.result);
          removeReference(scope, reference);
          setStatus(applied ? "completed" : "failed");
          return;
        }
        if (outcome.state === "failed") {
          removeReference(scope, reference);
          setStatus("failed");
          return;
        }
      } catch {
        // Temporary read failures do not determine the owner action's outcome.
      }
      if (current) timer = setTimeout(check, pollIntervalMs);
    }
    void check();
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [scope, busy]);

  return status;
}
