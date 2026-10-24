import { createHash } from "node:crypto";
import {
  resolveConsoleOosOperatorConfiguration,
  type ConsoleOosOperatorConfiguration,
} from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { consoleMutationAttributionHeaders } from "../../../console-integration/identity/server/console-session-authorization.ts";
import {
  assertModelCatalogue, assertModelConfiguration, assertModelRegistry, assertModelRuntimeControl,
  assertModelRuntimeOperation, assertModelRuntimeRequest, modelExact, modelIdentifier, modelRecord,
  ModelRuntimeContractError,
  type ConfigurationSnapshot, type ModelRuntimeOperation, type ModelRuntimePage,
} from "../work-model/model-runtime-contract.ts";

export class ModelRuntimeServiceError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number, message: string) { super(message); this.code = code; this.status = status; }
}
function canonical(value: unknown): string {
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") {
    if (new TextDecoder().decode(new TextEncoder().encode(value)) !== value) throw new ModelRuntimeContractError();
    return JSON.stringify(value);
  }
  if (Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const row = modelRecord(value);
  return "{" + Object.keys(row).sort((a, b) => Buffer.from(a).compare(Buffer.from(b)))
    .map(key => JSON.stringify(key) + ":" + canonical(row[key])).join(",") + "}";
}
export function modelRuntimeDigest(value: unknown, omitted?: string): string {
  const copy = structuredClone(value);
  if (omitted) delete modelRecord(copy)[omitted];
  return "sha256:" + createHash("sha256").update(canonical(copy)).digest("hex");
}
function integrity(condition: unknown): asserts condition { if (!condition) throw new ModelRuntimeContractError(); }
function verifyConfiguration(value: ConfigurationSnapshot) {
  integrity(value.digest === modelRuntimeDigest(value.configuration));
  for (const [id, model] of Object.entries(value.configuration.models)) integrity(id === modelRuntimeDigest({ backend_id: model.backend_id, model: model.model }));
  integrity(value.history.some(entry => entry.revision === value.revision && entry.digest === value.digest));
  return value;
}
export type ModelRuntimeClientOptions = {
  config?: ConsoleOosOperatorConfiguration;
  fetchImpl?: typeof fetch;
  attribution?: () => Readonly<Record<string, string>>;
};

export function createModelRuntimeClient(options: ModelRuntimeClientOptions = {}) {
  const config = options.config ?? resolveConsoleOosOperatorConfiguration();
  async function request(path: string, body?: unknown) {
    let response: Response;
    try {
      response = await (options.fetchImpl ?? fetch)(config.baseUrl.replace(/\/$/, "") + "/v1/model-operations" + path, {
        method: body === undefined ? "GET" : "POST", cache: "no-store",
        headers: {
          ...(options.attribution ?? consoleMutationAttributionHeaders)(),
          "Content-Type": "application/json", Accept: "application/json",
          "x-oos-caller-id": config.callerId, "x-oos-caller-secret": config.callerSecret,
          "x-oos-operator-id": config.operatorId,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      if (error instanceof ModelRuntimeServiceError) throw error;
      // Includes lost acknowledgements: the browser retains its original
      // request identity and checks it instead of submitting a replacement.
      throw new ModelRuntimeServiceError("model_operations_owner_unavailable", 502, "The model owner could not confirm this operation. Check the original request.");
    }
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      const reader = response.body?.getReader();
      if (!reader) throw new ModelRuntimeContractError();
      for (;;) {
        const item = await reader.read(); if (item.done) break;
        size += item.value.byteLength;
        if (size > 1_048_576) { await reader.cancel(); throw new ModelRuntimeContractError(); }
        chunks.push(item.value);
      }
      const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!response.ok) {
        const row = modelRecord(value);
        const code = typeof row.code === "string" ? row.code : row.error;
        throw new ModelRuntimeServiceError(
          typeof code === "string" && /^[A-Za-z0-9_-]{1,120}$/.test(code) ? code : "model_operations_owner_rejected",
          response.status === 404 && path === "/registry" ? 503 : response.status,
          response.status === 404 && path === "/registry" ? "Runtime model controls have not been commissioned." : "The model owner rejected or could not confirm this request. Refresh its current state.",
        );
      }
      return value;
    } catch (error) {
      if (error instanceof ModelRuntimeServiceError) throw error;
      throw new ModelRuntimeServiceError("model_operations_owner_evidence_invalid", 502, "The model owner returned incomplete or conflicting evidence.");
    }
  }
  function verifyOperation(value: unknown, requestId?: string) {
    const op = assertModelRuntimeOperation(value, requestId);
    const original = "oos-model:" + modelRuntimeDigest({ caller: config.callerId, request: op.request_id }).slice(7) + ":" + op.attempt;
    integrity(op.owner_command_id === original || op.request.action === "account.login.start" && op.owner_command_id === original + ":cancel");
    if (op.owner_receipt) {
      const receipt = op.owner_receipt;
      integrity(!op.request.action.startsWith("account.") && receipt.actor === config.operatorId &&
        receipt.receipt_digest === modelRuntimeDigest(receipt, "receipt_digest") &&
        receipt.command_digest === modelRuntimeDigest({ actor: config.operatorId, command: {
          command_id: op.owner_command_id, expected_revision: op.request.expected_configuration_revision,
          action: op.request.action, input: op.request.input,
        } }));
    }
    if (op.applied_configuration) {
      verifyConfiguration(op.applied_configuration);
      integrity(op.owner_receipt?.revision === op.applied_configuration.revision && op.owner_receipt.configuration_digest === op.applied_configuration.digest);
    }
    if (op.account_login) {
      const login = op.account_login;
      const loginId = op.request.action === "account.login.cancel" ? op.request.input.login_command_id : original;
      integrity(op.request.action.startsWith("account.") && login.command_id === loginId && login.actor === config.operatorId &&
        (op.request.action !== "account.login.start" || login.backend_id === op.request.input.backend_id) &&
        login.request_digest === modelRuntimeDigest({ command_id: login.command_id, backend_id: login.backend_id, actor: config.operatorId }));
    }
    return op;
  }
  async function checked<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch (error) {
      if (error instanceof ModelRuntimeContractError) throw new ModelRuntimeServiceError("model_operations_owner_evidence_invalid", 502, error.message);
      throw error;
    }
  }
  return {
    registry: () => checked(async () => {
      const value = assertModelRegistry(await request("/registry")); verifyConfiguration(value.configuration);
      for (const backend of value.backends) integrity(backend.registered === Object.hasOwn(value.configuration.configuration.backends, backend.backend_id));
      for (const id of Object.keys(value.configuration.configuration.backends)) integrity(value.backends.some(backend => backend.backend_id === id));
      return value;
    }),
    catalogue: (backendId: string, model: string | null = null) => checked(async () => {
      const query = new URLSearchParams({ backend_id: backendId }); if (model !== null) query.set("model", model);
      const value = assertModelCatalogue(await request("/catalogue?" + query), backendId);
      if (model !== null) integrity(value.models.every(item => item.model === model));
      return value;
    }),
    list: (cursor: string | null = null) => checked(async (): Promise<ModelRuntimePage> => {
      if (cursor !== null && !modelIdentifier(cursor)) throw new ModelRuntimeContractError();
      const query = new URLSearchParams({ limit: "100" }); if (cursor) query.set("cursor", cursor);
      const row = modelExact(await request("/requests?" + query), ["requests", "next_cursor"]);
      integrity(Array.isArray(row.requests) && row.requests.length <= 100 && (row.next_cursor === null || modelIdentifier(row.next_cursor)));
      const requests = row.requests.map(item => verifyOperation(item));
      integrity(new Set(requests.map(item => item.request_id)).size === requests.length);
      return { requests, next_cursor: row.next_cursor as string | null };
    }),
    get: (id: string) => checked(async () => {
      if (!modelIdentifier(id)) throw new ModelRuntimeContractError();
      return verifyOperation(await request("/requests/" + encodeURIComponent(id)), id);
    }),
    submit: (input: unknown) => {
      const intent = assertModelRuntimeRequest(input);
      return checked(async () => {
        const op = verifyOperation(await request("/requests", intent), intent.request_id);
        integrity(modelRuntimeDigest(op.request) === modelRuntimeDigest(intent));
        return op;
      });
    },
    control: (id: string, input: unknown) => {
      if (!modelIdentifier(id)) throw new ModelRuntimeContractError();
      const control = assertModelRuntimeControl(input);
      return checked(async () => verifyOperation(await request("/requests/" + encodeURIComponent(id) + "/controls", control), id));
    },
  };
}
