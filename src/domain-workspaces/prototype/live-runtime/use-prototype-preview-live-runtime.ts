"use client";

import { useCallback, useRef, useState } from "react";

import type {
  PrototypeProjectedReceipt,
  PrototypeRecord,
} from "../read-model/prototype-workspace-read-model.ts";
import {
  projectPrototypePreviewOwnerReceipt,
  projectPrototypePreviewProofReceipt,
} from "./prototype-preview-live-projection.ts";
import type {
  PrototypePreviewCommandResponse,
  PrototypePreviewLiveApiError,
  PrototypePreviewOwnerProjection,
  PrototypePreviewOwnerProof,
} from "./prototype-preview-live-types.ts";

type RuntimeMode = "disconnected" | "error" | "live" | "loading";

export class PrototypePreviewClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(value: PrototypePreviewLiveApiError) {
    super(value.error);
    this.name = "PrototypePreviewClientError";
    this.code = value.code;
    this.retryable = value.retryable;
  }
}

export function usePrototypePreviewLiveRuntime() {
  const [modeByRecord, setModeByRecord] = useState<Record<string, RuntimeMode>>({});
  const [projectionByRecord, setProjectionByRecord] = useState<
    Record<string, PrototypePreviewOwnerProjection>
  >({});
  const [proofByRecord, setProofByRecord] = useState<
    Record<string, PrototypePreviewOwnerProof>
  >({});
  const [receiptsByRecord, setReceiptsByRecord] = useState<
    Record<string, PrototypeProjectedReceipt[]>
  >({});
  const identities = useRef(new Map<string, string>());

  const load = useCallback(async (record: PrototypeRecord) => {
    setModeByRecord((current) => ({ ...current, [record.id]: "loading" }));
    try {
      const projection = projectionValue(
        await api(path(record), { cache: "no-store" }),
      );
      setProjectionByRecord((current) => ({ ...current, [record.id]: projection }));
      setModeByRecord((current) => ({ ...current, [record.id]: "live" }));
      return projection;
    } catch (error) {
      const failure = clientError(error);
      setModeByRecord((current) => ({
        ...current,
        [record.id]:
          failure.code === "prototype_preview_live_mode_required"
            ? "disconnected"
            : "error",
      }));
      if (failure.code === "prototype_preview_live_mode_required") return null;
      throw failure;
    }
  }, []);

  const command = useCallback(
    async (record: PrototypeRecord, action: "restart" | "start" | "stop") => {
      const current = projectionByRecord[record.id] ?? (await load(record));
      if (!current) throw missingConfiguration();
      const identityKey = JSON.stringify([
        record.id,
        action,
        current.source_revision,
        current.profile_digest,
        current.instance_id,
        current.runtime_state,
      ]);
      let requestId = identities.current.get(identityKey);
      if (!requestId) {
        requestId = `console-preview:${prototypeSlug(record)}:${action}:${crypto.randomUUID()}`;
        identities.current.set(identityKey, requestId);
      }
      const response = commandResponse(
        await api(`${path(record)}/commands`, {
          body: JSON.stringify({
            action,
            expected: {
              instance_id: current.instance_id,
              profile_digest: current.profile_digest,
              runtime_state: current.runtime_state,
              source_revision: current.source_revision,
            },
            request_id: requestId,
          }),
          method: "POST",
        }),
      );
      setProjectionByRecord((values) => ({ ...values, [record.id]: response.projection }));
      retainReceipt(record.id, projectPrototypePreviewOwnerReceipt(record.id, response.command));
      return response;
    },
    [load, projectionByRecord],
  );

  const prove = useCallback(
    async (record: PrototypeRecord) => {
      const value = proofResponse(
        await api(`${path(record)}/proof`, { cache: "no-store" }),
      );
      setProjectionByRecord((current) => ({ ...current, [record.id]: value.projection }));
      setProofByRecord((current) => ({ ...current, [record.id]: value.proof }));
      retainReceipt(
        record.id,
        projectPrototypePreviewProofReceipt(
          record.id,
          value.proof,
          value.projection.source_revision,
        ),
      );
      return value;
    },
    [],
  );

  function retainReceipt(recordId: string, receipt: PrototypeProjectedReceipt) {
    setReceiptsByRecord((current) => ({
      ...current,
      [recordId]: [
        receipt,
        ...(current[recordId] ?? []).filter((item) => item.id !== receipt.id),
      ].slice(0, 20),
    }));
  }

  return {
    command,
    load,
    modeByRecord,
    projectionByRecord,
    proofByRecord,
    prove,
    receiptsByRecord,
  };
}

function path(record: PrototypeRecord) {
  return `/api/prototypes/${encodeURIComponent(prototypeSlug(record))}/preview-runtime`;
}

function prototypeSlug(record: PrototypeRecord) {
  const slug = record.id.replace(/^prototype[:-]/, "");
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(slug)) {
    throw new PrototypePreviewClientError({
      code: "prototype_preview_identity_invalid",
      error: "Preview Runtime requires a stable Prototype identity.",
      retryable: false,
    });
  }
  return slug;
}

async function api(pathname: string, init: RequestInit) {
  let response: Response;
  try {
    response = await fetch(pathname, {
      ...init,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
    });
  } catch {
    throw new PrototypePreviewClientError({
      code: "prototype_preview_console_unavailable",
      error: "Preview Runtime could not reach the Console adapter.",
      retryable: true,
    });
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw clientError(body);
  return body;
}

function projectionValue(value: unknown) {
  const record = object(value);
  if (
    record.schema_version !== 1 ||
    typeof record.profile_id !== "string" ||
    typeof record.prototype_id !== "string" ||
    typeof record.profile_digest !== "string" ||
    typeof record.source_revision !== "string" ||
    !new Set(["running", "stale", "stopped"]).has(String(record.runtime_state))
  ) {
    throw invalidResponse();
  }
  return record as PrototypePreviewOwnerProjection;
}

function commandResponse(value: unknown) {
  const record = object(value);
  projectionValue(record.projection);
  const command = object(record.command);
  if (command.schema_version !== 1 || !object(command.receipt).receipt_digest) {
    throw invalidResponse();
  }
  return record as PrototypePreviewCommandResponse;
}

function proofResponse(value: unknown) {
  const record = object(value);
  const projection = projectionValue(record.projection);
  const proof = object(record.proof);
  if (proof.schema_version !== 1 || proof.status !== "proven") throw invalidResponse();
  return { projection, proof: proof as PrototypePreviewOwnerProof };
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalidResponse();
  return value as Record<string, unknown>;
}

function invalidResponse() {
  return new PrototypePreviewClientError({
    code: "prototype_preview_response_invalid",
    error: "Preview Runtime returned an invalid owner projection.",
    retryable: false,
  });
}

function clientError(value: unknown) {
  if (value instanceof PrototypePreviewClientError) return value;
  if (
    value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).code === "string" &&
    typeof (value as Record<string, unknown>).error === "string" &&
    typeof (value as Record<string, unknown>).retryable === "boolean"
  ) {
    return new PrototypePreviewClientError(value as PrototypePreviewLiveApiError);
  }
  return invalidResponse();
}

function missingConfiguration() {
  return new PrototypePreviewClientError({
    code: "prototype_preview_live_mode_required",
    error: "Studio Preview Runtime owner integration is not configured.",
    retryable: false,
  });
}
