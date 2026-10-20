import { execFile } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  consolePrototypePreviewModeSelected,
  resolveConsolePrototypePreviewConfiguration,
  type ConsolePrototypePreviewConfiguration,
  ConsoleRuntimeConfigurationError,
} from "../../../console-integration/configuration/console-runtime-configuration.ts";
import {
  assertPrototypePreviewCommandIntent,
  assertPrototypePreviewCommandResult,
  assertPrototypePreviewProjection,
  assertPrototypePreviewProof,
  assertPrototypePreviewSlug,
  PrototypePreviewContractError,
  samePrototypePreviewState,
} from "../live-runtime/prototype-preview-live-contract.ts";
import type {
  PrototypePreviewCommandResponse,
  PrototypePreviewOwnerProjection,
} from "../live-runtime/prototype-preview-live-types.ts";

const timeoutMs = 15_000;
const maxBuffer = 1_048_576;

export type PrototypePreviewOwnerRunner = (
  executable: string,
  args: readonly string[],
  options: Readonly<{ cwd: string; env: NodeJS.ProcessEnv; maxBuffer: number; timeout: number }>,
) => Promise<Readonly<{ stderr: string; stdout: string }>>;

type OwnerOptions = Readonly<{
  config?: ConsolePrototypePreviewConfiguration;
  env?: NodeJS.ProcessEnv;
  runner?: PrototypePreviewOwnerRunner;
}>;

export class PrototypePreviewOwnerError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(message: string, code: string, status: number, retryable = false) {
    super(message);
    this.name = "PrototypePreviewOwnerError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

export function prototypePreviewOwnerConfigured(env = process.env) {
  return consolePrototypePreviewModeSelected(env);
}

export async function readPrototypePreviewOwner(
  prototypeId: string,
  options: OwnerOptions = {},
) {
  const context = ownerContext(prototypeId, options);
  return runProjection(context, "status");
}

export async function provePrototypePreviewOwner(
  prototypeId: string,
  options: OwnerOptions = {},
) {
  const context = ownerContext(prototypeId, options);
  const projection = await runProjection(context, "status");
  if (projection.runtime_state !== "running") {
    throw new PrototypePreviewOwnerError(
      "Preview Runtime proof requires the Studio-owned runtime to be running.",
      "prototype_preview_runtime_not_running",
      409,
    );
  }
  const proofValue = await runJson(context, [
    "proof",
    "--profile",
    context.profilePath,
  ]);
  const proof = ownerContract(() =>
    assertPrototypePreviewProof(proofValue, projection),
  );
  return { projection, proof };
}

export async function commandPrototypePreviewOwner(
  prototypeId: string,
  value: unknown,
  options: OwnerOptions = {},
): Promise<PrototypePreviewCommandResponse> {
  const intent = assertPrototypePreviewCommandIntent(value);
  const context = ownerContext(prototypeId, options);
  const before = await runProjection(context, "status");
  if (!samePrototypePreviewState(before, intent.expected)) {
    throw new PrototypePreviewOwnerError(
      "Studio Preview Runtime changed after review. Refresh before retrying.",
      "prototype_preview_expected_state_stale",
      409,
    );
  }
  const commandValue = await runJson(context, [
      intent.action,
      "--profile",
      context.profilePath,
      "--request-id",
      intent.request_id,
      "--expected-state",
      JSON.stringify(intent.expected),
    ]);
  const command = ownerContract(() =>
    assertPrototypePreviewCommandResult(commandValue, {
      commandState: intent.expected,
      prototypeSlug: context.prototypeSlug,
      requestId: intent.request_id,
      sourceRevision: context.config.sourceRevision,
    }),
  );
  if (command.receipt.action !== intent.action) {
    throw contractFailure("Studio Preview receipt action differs from the reviewed command.");
  }
  const projection = await runProjection(context, "status");
  // Studio removes running process state on stop. Its independently verified
  // stop receipt binds the exact stopped readback without a running receipt.
  const stoppedWithoutRunningReceipt = intent.action === "stop" &&
    projection.runtime_state === "stopped" && projection.latest_receipt === null;
  const exactReceipt = projection.latest_receipt?.ref === `preview-runtime://receipts/${command.receipt.receipt_id}` &&
    projection.latest_receipt.digest === command.receipt.receipt_digest;
  if (
    command.receipt.after_state !== projection.runtime_state ||
    command.receipt.profile_digest !== projection.profile_digest ||
    command.receipt.source_digest !== projection.source_digest ||
    (!stoppedWithoutRunningReceipt && !exactReceipt)
  ) {
    throw contractFailure("Studio Preview command readback is incomplete or conflicting.");
  }
  return { command, projection };
}

type OwnerContext = Readonly<{
  config: ConsolePrototypePreviewConfiguration;
  profilePath: string;
  prototypeSlug: string;
  runner: PrototypePreviewOwnerRunner;
}>;

function ownerContext(prototypeId: string, options: OwnerOptions): OwnerContext {
  const env = options.env ?? process.env;
  if (!options.config && !prototypePreviewOwnerConfigured(env)) {
    throw new PrototypePreviewOwnerError(
      "Studio Preview Runtime owner integration is not configured.",
      "prototype_preview_live_mode_required",
      503,
    );
  }
  let config: ConsolePrototypePreviewConfiguration;
  try {
    config = options.config ?? resolveConsolePrototypePreviewConfiguration(env);
  } catch (error) {
    if (error instanceof ConsoleRuntimeConfigurationError) {
      throw new PrototypePreviewOwnerError(error.message, error.code, 503);
    }
    throw error;
  }
  if (config.recordAuthorityFreshnessRequired) config = currentRecordAuthority(config);
  const prototypeSlug = assertPrototypePreviewSlug(prototypeId);
  return {
    config,
    profilePath: join(
      config.ownerRepoRoot,
      "records",
      "prototype-preview-profiles",
      `${prototypeSlug}.yaml`,
    ),
    prototypeSlug,
    runner: options.runner ?? defaultRunner,
  };
}

function currentRecordAuthority(config: ConsolePrototypePreviewConfiguration): ConsolePrototypePreviewConfiguration {
  try {
    const file = join(config.ownerRepoRoot, ".git", "console-record-authority.json");
    const info = lstatSync(file);
    if (!info.isFile() || info.size > 2048 || info.uid !== process.getuid?.()) throw new Error();
    const value = JSON.parse(readFileSync(file, "utf8"));
    const observed = Date.parse(value.observed_at), expires = Date.parse(value.valid_until), now = Date.now();
    if (value.schema_version !== 1 || value.owner_repo !== "workspace-prototype-studio" ||
      value.trusted_ref !== "refs/remotes/origin/main" || value.reviewed_revision !== config.sourceRevision ||
      !/^[a-f0-9]{40}$/.test(value.record_revision) || !Number.isFinite(observed) || !Number.isFinite(expires) ||
      observed > now + 30000 || expires <= now || expires <= observed || expires - observed > 600000) throw new Error();
    // Platform admits data-only ancestry and preserves this fixed owner command
    // and its schemas. Studio still verifies its actual clean Git source and
    // exact runtime/profile/proof binding; the Console gains no Git authority.
    return { ...config, sourceRevision: value.record_revision };
  } catch {
    throw new PrototypePreviewOwnerError("Studio canonical record snapshot is unavailable or stale. Restore Platform record refresh before continuing.",
      "prototype_preview_record_authority_unavailable", 503, true);
  }
}

async function runProjection(context: OwnerContext, action: "status") {
  const value = await runJson(context, [action, "--profile", context.profilePath]);
  return ownerContract(() =>
    assertPrototypePreviewProjection(value, {
      prototypeSlug: context.prototypeSlug,
      sourceRevision: context.config.sourceRevision,
    }),
  );
}

async function runJson(context: OwnerContext, actionArgs: readonly string[]) {
  const script = join(context.config.ownerRepoRoot, "scripts", "prototype_preview.py");
  try {
    const result = await context.runner(
      "python3",
      [
        script,
        "--repo-root",
        context.config.ownerRepoRoot,
        "--state-root",
        context.config.stateRoot,
        ...actionArgs,
      ],
      {
        cwd: context.config.ownerRepoRoot,
        env: {
          LANG: "C.UTF-8",
          NODE_ENV: process.env.NODE_ENV ?? "production",
          PATH: process.env.PATH,
          PYTHONUNBUFFERED: "1",
        },
        maxBuffer,
        timeout: timeoutMs,
      },
    );
    return JSON.parse(result.stdout) as unknown;
  } catch (error) {
    if (error instanceof PrototypePreviewOwnerError) throw error;
    if (error instanceof PrototypePreviewContractError) throw contractFailure(error.message);
    const failure = error as { code?: string; killed?: boolean; stdout?: string };
    const ownerFailure = parseOwnerFailure(failure.stdout);
    if (ownerFailure) throw ownerFailure;
    throw new PrototypePreviewOwnerError(
      failure.killed
        ? "Studio Preview Runtime owner command timed out."
        : "Studio Preview Runtime owner command failed.",
      failure.killed ? "prototype_preview_owner_timeout" : "prototype_preview_owner_failed",
      502,
      failure.killed === true,
    );
  }
}

function parseOwnerFailure(stdout: string | undefined) {
  if (!stdout) return null;
  try {
    const value = JSON.parse(stdout) as Record<string, unknown>;
    if (value.status !== "rejected" || typeof value.code !== "string") return null;
    return new PrototypePreviewOwnerError(
      typeof value.message === "string" ? value.message : "Studio Preview Runtime rejected the command.",
      value.code,
      new Set([
        "expected_state_stale",
        "runtime_already_running",
        "runtime_not_running",
        "request_replay_conflict",
        "request_replay_stale",
        "stale_runtime_state",
      ]).has(value.code)
        ? 409
        : 422,
    );
  } catch {
    return null;
  }
}

function contractFailure(message: string) {
  return new PrototypePreviewOwnerError(
    message,
    "prototype_preview_owner_contract_invalid",
    502,
  );
}

function ownerContract<Value>(operation: () => Value): Value {
  try {
    return operation();
  } catch (error) {
    if (error instanceof PrototypePreviewContractError) {
      throw contractFailure(error.message);
    }
    throw error;
  }
}

const defaultRunner: PrototypePreviewOwnerRunner = (executable, args, options) =>
  new Promise((resolve, reject) => {
    execFile(executable, [...args], options, (error, stdout, stderr) => {
      if (error) {
        Object.assign(error, { stderr, stdout });
        reject(error);
        return;
      }
      resolve({ stderr, stdout });
    });
  });
