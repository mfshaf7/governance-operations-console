"use client";

import { useCallback, useRef, useState } from "react";

import type {
  PrototypeRecord,
  PrototypeSourceHome,
} from "../read-model/prototype-workspace-read-model.ts";
import type { PrototypeLandingDraft } from "../work-model/workflows/landing/prototype-landing-model.ts";
import {
  assertPrototypeLandingPreparation,
  assertPrototypeLandingResult,
  prototypeLandingIngress,
} from "./prototype-landing-live-contract.ts";
import type {
  PrototypeLandingCanonicalSupportProfile,
  PrototypeLandingLiveApiError,
  PrototypeLandingLiveProjection,
  PrototypeLandingLiveRunResult,
  PrototypeLandingPreparation,
  PrototypeLandingRunInput,
  PrototypeLandingSourceIntent,
  PrototypeLandingSourcePosture,
  PrototypeLandingSubmissionIntent,
} from "./prototype-landing-live-types.ts";

const missingConfigurationCode = "prototype_landing_live_mode_required";

type RequestIdentity = Readonly<{
  acceptedAt: string;
  requestId: string;
}>;

export class PrototypeLandingClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(value: PrototypeLandingLiveApiError) {
    super(value.error);
    this.code = value.code;
    this.retryable = value.retryable;
  }
}

export function prototypeLandingAllowsLocalFallback(error: unknown) {
  return (
    error instanceof PrototypeLandingClientError &&
    error.code === missingConfigurationCode
  );
}

export function usePrototypeLandingLiveRuntime() {
  const [projectionsByRecordId, setProjectionsByRecordId] = useState<
    Readonly<Record<string, PrototypeLandingLiveProjection>>
  >({});
  const identities = useRef(new Map<string, RequestIdentity>());
  const sequence = useRef(0);

  const retain = useCallback(
    (
      input: PrototypeLandingRunInput,
      result: ReturnType<typeof assertPrototypeLandingResult>,
    ): PrototypeLandingLiveRunResult => {
      setProjectionsByRecordId((current) => ({
        ...current,
        [input.record.id]: {
          draft: input.draft,
          draftKey: input.draftKey,
          recordId: input.record.id,
          result,
        },
      }));
      return { draftKey: input.draftKey, mode: "live", result };
    },
    [],
  );

  const run = useCallback(
    async (input: PrototypeLandingRunInput) => {
      const current = projectionsByRecordId[input.record.id];
      if (current && current.draftKey === input.draftKey) {
        if (terminal(current.result.status)) {
          return retain(input, current.result);
        }
        return retain(
          input,
          await commandRequest(current.result.request_id, "continue"),
        );
      }

      const identityKey = `${input.record.id}\n${input.draftKey}`;
      let identity = identities.current.get(identityKey);
      if (!identity) {
        sequence.current += 1;
        const acceptedAt = new Date().toISOString();
        identity = {
          acceptedAt,
          requestId: `prototype-landing-request:${prototypeSlug(input.record)}:${Date.now()}${sequence.current}`,
        };
        identities.current.set(identityKey, identity);
      }
      const prototypeId = `prototype:${prototypeSlug(input.record)}`;
      const preparation = await prepare(prototypeId);
      const result = await submit(
        prototypeLandingSubmissionIntent(input, identity, preparation),
      );
      retain(input, result);
      if (terminal(result.status)) return retain(input, result);
      return retain(input, await commandRequest(result.request_id, "continue"));
    },
    [projectionsByRecordId, retain],
  );

  const read = useCallback(
    async (input: PrototypeLandingRunInput, requestId: string) =>
      retain(input, await readRequest(requestId)),
    [retain],
  );

  const cancel = useCallback(
    async (input: PrototypeLandingRunInput, requestId: string) =>
      retain(input, await commandRequest(requestId, "cancel")),
    [retain],
  );

  return { cancel, projectionsByRecordId, read, run };
}

export function prototypeLandingSubmissionIntent(
  input: PrototypeLandingRunInput,
  identity: RequestIdentity,
  preparation: PrototypeLandingPreparation,
): PrototypeLandingSubmissionIntent {
  const prototypeId = `prototype:${prototypeSlug(input.record)}`;
  const ingress = prototypeLandingIngress(input.record.ingress);
  return {
    accepted_at: identity.acceptedAt,
    draft: input.draft,
    ingress_class: ingress,
    prototype_id: prototypeId,
    request_id: identity.requestId,
    reviewed_preparation: preparation,
    source: prototypeLandingSourceIntent(input.record),
    suggestions: {
      name: input.record.name || null,
      objective: input.record.summary || null,
      support_profile: supportProfile(input.record.landing.supportProfile),
    },
  };
}

export function prototypeLandingSourceIntent(
  record: PrototypeRecord,
): PrototypeLandingSourceIntent {
  const evidence = record.sourceEvidence;
  const posture = evidence?.posture ?? sourcePosture(record.landing.sourceHome);
  const intent = {
    authority: evidence?.authority ?? ingressAuthority(record),
    imported_content_digest: evidence?.importedContentDigest ?? null,
    origin_digest: evidence?.originDigest ?? null,
    posture,
    ref: record.sourceRef,
    revision: evidence?.revision ?? exactRevision(record),
  } satisfies PrototypeLandingSourceIntent;

  if (posture === "import-to-studio") {
    if (
      !intent.ref.startsWith("import://staged/") ||
      !intent.origin_digest ||
      !intent.imported_content_digest
    ) {
      throw new Error(
        "Imported Landing requires a staged import ref and both source digests.",
      );
    }
  } else if (
    posture !== "create-studio-source" &&
    !intent.revision
  ) {
    throw new Error(
      "Existing-source Landing requires an immutable source revision.",
    );
  }
  return intent;
}

function sourcePosture(sourceHome: PrototypeSourceHome): PrototypeLandingSourcePosture {
  switch (sourceHome) {
    case "new-prototype-folder":
    case "docs-only":
      return "create-studio-source";
    case "existing-source":
      return "reference-dedicated-owner-source";
    case "future-owner-repo":
      return "reference-dedicated-owner-source";
    case "app-folder":
    case "console-domain-module":
      return "reference-shared-owner-source";
  }
}

function ingressAuthority(record: PrototypeRecord) {
  switch (record.ingress) {
    case "local-entry":
      return "operator";
    case "proposal-routed":
      return "workspace-proposals";
    case "existing-source":
      return "source-owner";
    case "imported":
      return "import-provider";
  }
}

function exactRevision(record: PrototypeRecord) {
  return [record.projectionVersion, record.sourceRef, record.sourcePath]
    .map((value) => value.match(/(?:^|[^0-9a-f])([0-9a-f]{40})(?:$|[^0-9a-f])/i)?.[1])
    .find(Boolean) ?? null;
}

function supportProfile(value: string): PrototypeLandingCanonicalSupportProfile {
  const mapped = {
    "custom-support": "custom",
    "interactive-prototype": "interactive",
    "simple-prototype": "simple",
  }[value] ?? value;
  return mapped as PrototypeLandingCanonicalSupportProfile;
}

function prototypeSlug(record: PrototypeRecord) {
  const slug = record.id
    .replace(/^prototype[:-]/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("Prototype Landing requires a stable Prototype id.");
  return slug;
}

function terminal(status: string) {
  return new Set(["cancelled", "rejected", "requires-action", "succeeded"]).has(
    status,
  );
}

async function prepare(prototypeId: string) {
  return assertPrototypeLandingPreparation(
    await api("/api/prototypes/landings/preparations", {
      body: JSON.stringify({ prototype_id: prototypeId }),
      method: "POST",
    }),
  );
}

async function submit(intent: PrototypeLandingSubmissionIntent) {
  return assertPrototypeLandingResult(
    await api("/api/prototypes/landings/requests", {
      body: JSON.stringify(intent),
      method: "POST",
    }),
    intent.request_id,
  );
}

async function readRequest(requestId: string) {
  return assertPrototypeLandingResult(
    await api(
      `/api/prototypes/landings/requests/${encodeURIComponent(requestId)}`,
      { cache: "no-store" },
    ),
    requestId,
  );
}

async function commandRequest(requestId: string, action: "cancel" | "continue") {
  return assertPrototypeLandingResult(
    await api(
      `/api/prototypes/landings/requests/${encodeURIComponent(requestId)}/${action}`,
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
    return new PrototypeLandingClientError(
      value as PrototypeLandingLiveApiError,
    );
  }
  return new PrototypeLandingClientError({
    code: "prototype_landing_adapter_failed",
    error: "Prototype Landing adapter failed.",
    retryable: false,
  });
}
