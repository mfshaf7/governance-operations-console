import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";

import {
  ConsoleRuntimeConfigurationError,
  resolveConsoleModelOperationsConfiguration,
  type ConsoleModelOperationsConfiguration,
} from "../../../console-integration/configuration/console-runtime-configuration.ts";

const maxArtifactBytes = 512 * 1024;
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const revisionPattern = /^[0-9a-f]{40}$/;

export type PlatformModelOperationsArtifacts = Readonly<{
  lifecycleReceipt: Record<string, unknown>;
  mergedReadback: Record<string, unknown>;
  sourceProjection: Record<string, unknown>;
}>;

export class ModelOperationsPlatformError extends Error {
  readonly code: string;
  readonly status = 503;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ModelOperationsPlatformError";
    this.code = code;
  }
}

export async function readPlatformModelOperationsArtifacts(
  options: {
    config?: ConsoleModelOperationsConfiguration;
  } = {},
): Promise<PlatformModelOperationsArtifacts> {
  let config: ConsoleModelOperationsConfiguration;
  try {
    config = options.config ?? resolveConsoleModelOperationsConfiguration();
  } catch (error) {
    const code =
      error instanceof ConsoleRuntimeConfigurationError
        ? error.code
        : "console_model_operations_configuration_invalid";
    throw new ModelOperationsPlatformError(
      "Model Operations Platform evidence is not fully configured.",
      code,
    );
  }
  const [sourceProjection, lifecycleReceipt, mergedReadback] = await Promise.all([
    readPrivateJson(config.sourceProjectionPath),
    readPrivateJson(config.lifecycleReceiptPath),
    readPrivateJson(config.mergedReadbackPath),
  ]);
  assertSourceProjection(sourceProjection);
  assertLifecycleReceipt(lifecycleReceipt);
  assertMergedReadback(mergedReadback, sourceProjection, lifecycleReceipt);
  return { lifecycleReceipt, mergedReadback, sourceProjection };
}

function assertSourceProjection(value: Record<string, unknown>) {
  exactKeys(value, [
    "artifact_type",
    "digest",
    "owner_repo",
    "profiles",
    "schema_version",
    "source",
  ]);
  if (
    value.schema_version !== 1 ||
    value.artifact_type !== "platform-model-profile-source-projection" ||
    value.owner_repo !== "platform-engineering" ||
    !Array.isArray(value.profiles) ||
    !digestPattern.test(text(value.digest)) ||
    canonicalDigest(value, "digest") !== value.digest
  ) invalid("The Platform model-profile source projection is malformed.");
  const source = record(value.source);
  exactKeys(source, [
    "access_plane_digest",
    "registry_digest",
    "runtime_assist_digest",
    "source_version",
  ]);
  if (
    !revisionPattern.test(text(source.source_version)) ||
    ![source.access_plane_digest, source.registry_digest, source.runtime_assist_digest].every(
      (digest) => digestPattern.test(text(digest)),
    )
  ) invalid("The Platform model-profile source coordinates are invalid.");
  const ids = value.profiles.map((entry) => {
    const profile = record(entry);
    exactKeys(profile, [
      "activation",
      "allowed_callers",
      "lifecycle",
      "profile_id",
      "purpose",
      "security_review_ref",
      "selected_environments",
    ]);
    if (
      !new Set(["active", "exception", "retired", "suspended"]).has(text(profile.lifecycle)) ||
      !Array.isArray(profile.allowed_callers) ||
      !Array.isArray(profile.selected_environments) ||
      !isRecord(profile.activation) ||
      !isRecord(profile.security_review_ref)
    ) invalid("A Platform model-profile projection is invalid.");
    return text(profile.profile_id);
  });
  if (new Set(ids).size !== ids.length) invalid("Platform model-profile identities are ambiguous.");
}

function assertLifecycleReceipt(value: Record<string, unknown>) {
  if (
    value.schema_version !== 1 ||
    value.artifact_type !== "platform-model-profile-lifecycle-receipt" ||
    value.actor_id !== "platform-engineering/model-profile-lifecycle" ||
    value.outcome !== "applied" ||
    !digestPattern.test(text(value.digest)) ||
    canonicalDigest(value, "digest") !== value.digest ||
    !Number.isSafeInteger(value.request_revision) ||
    !isRecord(value.result_source)
  ) invalid("The Platform model-profile lifecycle receipt is malformed.");
}

function assertMergedReadback(
  value: Record<string, unknown>,
  sourceProjection: Record<string, unknown>,
  lifecycleReceipt: Record<string, unknown>,
) {
  if (
    value.schema_version !== 1 ||
    value.artifact_type !== "platform-model-profile-merged-readback" ||
    !revisionPattern.test(text(value.source_version)) ||
    !digestPattern.test(text(value.digest)) ||
    canonicalDigest(value, "digest") !== value.digest ||
    canonicalStringify(value.source_projection) !== canonicalStringify(sourceProjection)
  ) invalid("The Platform model-profile merged readback is malformed or stale.");
  const lifecycleRef = record(value.lifecycle_receipt_ref);
  if (lifecycleRef.digest !== lifecycleReceipt.digest) {
    invalid("The Platform merged readback is bound to another lifecycle receipt.");
  }
  const source = record(sourceProjection.source);
  if (source.source_version !== value.source_version) {
    invalid("The Platform source projection is not from the merged readback revision.");
  }
  const fulfillment = record(value.oos_fulfillment);
  const fulfillmentReceipt = record(fulfillment.receipt_ref);
  if (
    fulfillment.state !== "applied" ||
    fulfillment.request_id !== lifecycleReceipt.request_id ||
    fulfillment.expected_revision !== lifecycleReceipt.request_revision ||
    fulfillmentReceipt.digest !== lifecycleReceipt.digest
  ) invalid("The Platform OOS fulfillment readback is incomplete or mismatched.");
}

async function readPrivateJson(path: string) {
  let raw: string;
  try {
    const info = await lstat(path);
    if (
      !info.isFile() ||
      info.isSymbolicLink() ||
      (info.mode & 0o777) !== 0o600 ||
      (typeof process.getuid === "function" && info.uid !== process.getuid()) ||
      info.size <= 0 ||
      info.size > maxArtifactBytes
    ) invalid("A Platform model-profile evidence file is not operator-private.");
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof ModelOperationsPlatformError) throw error;
    throw new ModelOperationsPlatformError(
      "Platform model-profile evidence could not be read safely.",
      "console_model_profile_evidence_invalid",
    );
  }
  try {
    return record(JSON.parse(raw));
  } catch {
    invalid("Platform model-profile evidence is not valid JSON.");
  }
}

function canonicalDigest(value: unknown, omittedField?: string) {
  const normalized = isRecord(value) && omittedField
    ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== omittedField))
    : value;
  return `sha256:${createHash("sha256").update(canonicalStringify(normalized)).digest("hex")}`;
}

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(",")}}`;
  }
  invalid("Platform model-profile evidence contains unsupported data.");
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    invalid("Platform model-profile evidence contains unknown or missing fields.");
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) invalid("Expected a Platform model-profile evidence object.");
  return value;
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value) invalid("Expected Platform evidence text.");
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): never {
  throw new ModelOperationsPlatformError(
    message,
    "console_model_profile_evidence_invalid",
  );
}
