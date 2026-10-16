"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prototypeOwnerProgressIsNewer } from "./prototype-workspace-live-projection.ts";

import type { PrototypeRecord } from "../read-model/prototype-workspace-read-model.ts";
import {
  assertPrototypeMaturityPreparation,
  assertPrototypeMaturityResult,
  assertPrototypeMaturitySubmissionIntent,
  prototypeMaturityInputKey,
} from "./prototype-maturity-live-contract.ts";
import type {
  PrototypeMaturityLiveApiError,
  PrototypeMaturityLiveProjection,
  PrototypeMaturityPreparation,
  PrototypeMaturityResult,
  PrototypeMaturityRunInput,
  PrototypeMaturitySubmissionIntent,
  PrototypeMaturityTransition,
} from "./prototype-maturity-live-types.ts";

const missingConfigurationCode = "prototype_maturity_live_mode_required";
const continuableStatuses = new Set([
  "accepted",
  "cancelling",
  "evaluating",
  "preparing",
  "review-required",
]);

type RequestIdentity = Readonly<{
  acceptedAt: string;
  requestId: string;
}>;

export class PrototypeMaturityClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(value: PrototypeMaturityLiveApiError) {
    super(value.error);
    this.code = value.code;
    this.retryable = value.retryable;
  }
}

export function prototypeMaturityAllowsLocalFallback(error: unknown) {
  return (
    error instanceof PrototypeMaturityClientError &&
    error.code === missingConfigurationCode
  );
}

export { prototypeMaturityInputKey };

const emptySourceProjections: Readonly<Record<string, PrototypeMaturityLiveProjection>> = {};

export function usePrototypeMaturityLiveRuntime(sourceProjections = emptySourceProjections) {
  const [projectionsByRecordId, setProjectionsByRecordId] = useState<
    Readonly<Record<string, PrototypeMaturityLiveProjection>>
  >({});
  const identities = useRef(new Map<string, RequestIdentity>());
  const sequence = useRef(0);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const inFlight = useRef(new Set<string>());
  const withProgress = useCallback(async <T,>(recordId: string, operation: () => Promise<T>) => {
    if (inFlight.current.has(recordId)) throw new Error("A Maturity owner request is already running.");
    inFlight.current.add(recordId);
    setPending((current) => ({ ...current, [recordId]: true }));
    setErrors((current) => ({ ...current, [recordId]: null }));
    try { return await operation(); }
    catch (error) { setErrors((current) => ({ ...current, [recordId]: error instanceof Error ? error.message : "Maturity owner request failed." })); throw error; }
    finally { inFlight.current.delete(recordId); setPending((current) => ({ ...current, [recordId]: false })); }
  }, []);
  useEffect(() => {
    setProjectionsByRecordId((current) => {
      let next = current;
      for (const [id, projection] of Object.entries(sourceProjections)) {
        if (prototypeOwnerProgressIsNewer(projection.result, current[id]?.result)) next = { ...next, [id]: projection };
      }
      return next;
    });
  }, [sourceProjections]);

  const retain = useCallback(
    (input: PrototypeMaturityRunInput, result: PrototypeMaturityResult) => {
      setProjectionsByRecordId((current) => ({
        ...current,
        [input.record.id]: {
          input: input.input,
          inputKey: input.inputKey,
          recordId: input.record.id,
          result,
        },
      }));
      return result;
    },
    [],
  );

  const run = useCallback(
    async (input: PrototypeMaturityRunInput) => {
      const current = projectionsByRecordId[input.record.id];
      const identityKey = `${input.record.id}\n${input.inputKey}`;
      if (current && !terminal(current.result.status) && current.inputKey !== input.inputKey) throw new Error("The current owner request is immutable. Continue it or cancel before changing promotion input.");
      if (current?.inputKey === input.inputKey) {
        if (["cancelled", "rejected", "requires-action"].includes(current.result.status)) identities.current.delete(identityKey);
        else if (terminal(current.result.status)) return retain(input, current.result);
        else return retain(input, await advance(current.result, input));
      }

      let identity = identities.current.get(identityKey);
      if (!identity) {
        sequence.current += 1;
        identity = {
          acceptedAt: new Date().toISOString(),
          requestId: `prototype-maturity-request:${prototypeSlug(input.record)}:${Date.now()}${sequence.current}`,
        };
        identities.current.set(identityKey, identity);
      }
      const preparation = await prepare(
        `prototype:${prototypeSlug(input.record)}`,
        input.input.transition,
      );
      const result = await submit(
        prototypeMaturitySubmissionIntent(input, identity, preparation),
      );
      retain(input, result);
      return retain(input, await advance(result, input));
    },
    [projectionsByRecordId, retain],
  );

  const read = useCallback(
    async (input: PrototypeMaturityRunInput, requestId: string) =>
      retain(input, await readRequest(requestId)),
    [retain],
  );

  const cancel = useCallback(
    async (input: PrototypeMaturityRunInput, requestId: string) =>
      retain(input, await commandRequest(requestId, "cancel")),
    [retain],
  );

  const runWithProgress = useCallback((input: PrototypeMaturityRunInput) => withProgress(input.record.id, () => run(input)), [run, withProgress]);
  const readWithProgress = useCallback((input: PrototypeMaturityRunInput, requestId: string) => withProgress(input.record.id, () => read(input, requestId)), [read, withProgress]);
  const cancelWithProgress = useCallback((input: PrototypeMaturityRunInput, requestId: string) => withProgress(input.record.id, () => cancel(input, requestId)), [cancel, withProgress]);
  return { cancel: cancelWithProgress, errors, pending, projectionsByRecordId, read: readWithProgress, run: runWithProgress };
}

export function prototypeMaturitySubmissionIntent(
  input: PrototypeMaturityRunInput,
  identity: RequestIdentity,
  preparation: PrototypeMaturityPreparation,
): PrototypeMaturitySubmissionIntent {
  const blocker = input.record.openIssues.find(
    (issue) => issue.status === "blocked",
  );
  const decision = input.input.input.decision;
  const evidenceRefs = [
    ...input.record.baseline.evidenceRefs,
    ...input.record.evidence.map((evidence) => evidence.id),
    input.record.candidate.lastReceiptRef,
  ].filter((value): value is string => Boolean(value?.trim()));
  const landingReceipt = input.record.landing.lastLandingReceiptRef;
  if (!landingReceipt) {
    throw new Error("Prototype Maturity requires a landed source receipt.");
  }
  return assertPrototypeMaturitySubmissionIntent({
    accepted_at: identity.acceptedAt,
    input: input.input,
    prototype_id: `prototype:${prototypeSlug(input.record)}`,
    record: {
      accepted_scope: input.record.candidate.scope.included,
      blocker:
        decision === "block-promotion" || decision === "block-baseline"
          ? blocker
            ? {
                issue_ref: prototypeIssueRef(blocker.id),
                owner_ref: blocker.owner,
                required_fix: blocker.requiredFix,
              }
            : null
          : null,
      evidence_refs: Array.from(new Set(evidenceRefs)),
      excluded_scope: input.record.candidate.scope.excluded,
      landing_receipt_ref: landingReceipt,
      owner_ref: input.record.owner,
      source_ref: input.record.sourceRef,
    },
    request_id: identity.requestId,
    reviewed_preparation: preparation,
  });
}

async function advance(
  starting: PrototypeMaturityResult,
  input: PrototypeMaturityRunInput,
) {
  let result = starting;
  if (terminal(result.status)) return result;
  if (continuableStatuses.has(result.status)) {
    result = await commandRequest(result.request_id, "continue");
  }
  if (result.status === "decision-required") {
    const blocker = prototypeMaturitySubmissionIntent(
      input,
      {
        acceptedAt: result.request.requested_at,
        requestId: result.request_id,
      },
      {
        authority_revision: result.request.expected_state.source_revision,
        canonical_authority: {
          branch: "main",
          registry_path: "prototypes.yaml",
          repo: "workspace-prototype-studio",
        },
        canonical_mutation: false,
        expected_state: result.request.expected_state,
        prototype_id: result.prototype_id,
        schema_version: 1,
        transition: result.transition,
        workflow_id: "prototype-maturity",
      },
    ).record.blocker;
    result = await decide(result.request_id, {
      ...(blocker ? { blocker } : {}),
      decision: input.input.input.decision,
    });
  }
  if (result.status === "preparing") {
    result = await commandRequest(result.request_id, "continue");
  }
  return result;
}

function prototypeSlug(record: PrototypeRecord) {
  const slug = record.id
    .replace(/^prototype[:-]/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("Prototype Maturity requires a stable Prototype id.");
  return slug;
}

function prototypeIssueRef(issueId: string) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(issueId)) return issueId;
  return `console://prototype/issues/${encodeURIComponent(issueId)}`;
}

function terminal(status: string) {
  return new Set([
    "blocked",
    "cancelled",
    "rejected",
    "requires-action",
    "routed-closeout",
    "succeeded",
  ]).has(status);
}

async function prepare(
  prototypeId: string,
  transition: PrototypeMaturityTransition,
) {
  return assertPrototypeMaturityPreparation(
    await api("/api/prototypes/maturity/preparations", {
      body: JSON.stringify({ prototype_id: prototypeId, transition }),
      method: "POST",
    }),
  );
}

async function submit(intent: PrototypeMaturitySubmissionIntent) {
  return assertPrototypeMaturityResult(
    await api("/api/prototypes/maturity/requests", {
      body: JSON.stringify(intent),
      method: "POST",
    }),
    intent.request_id,
  );
}

async function readRequest(requestId: string) {
  return assertPrototypeMaturityResult(
    await api(
      `/api/prototypes/maturity/requests/${encodeURIComponent(requestId)}`,
      { cache: "no-store" },
    ),
    requestId,
  );
}

async function decide(requestId: string, value: unknown) {
  return assertPrototypeMaturityResult(
    await api(
      `/api/prototypes/maturity/requests/${encodeURIComponent(requestId)}/decisions`,
      { body: JSON.stringify(value), method: "POST" },
    ),
    requestId,
  );
}

async function commandRequest(requestId: string, action: "cancel" | "continue") {
  return assertPrototypeMaturityResult(
    await api(
      `/api/prototypes/maturity/requests/${encodeURIComponent(requestId)}/${action}`,
      { body: "{}", method: "POST" },
    ),
    requestId,
  );
}

async function api(path: string, init: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw clientError(body);
  return body;
}

function clientError(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).code === "string" &&
    typeof (value as Record<string, unknown>).error === "string" &&
    typeof (value as Record<string, unknown>).retryable === "boolean"
  ) {
    return new PrototypeMaturityClientError(
      value as PrototypeMaturityLiveApiError,
    );
  }
  return new PrototypeMaturityClientError({
    code: "prototype_maturity_adapter_failed",
    error: "Prototype Maturity adapter failed.",
    retryable: false,
  });
}
