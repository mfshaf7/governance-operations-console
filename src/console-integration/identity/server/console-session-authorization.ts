import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";

import { NextResponse } from "next/server.js";

import type { OperatorIdentitySnapshot } from "../../../console-shell/identity/operator-identity-model";

const maxProjectionBytes = 32 * 1024;
const noStoreHeaders = { "Cache-Control": "no-store" };

type ConsoleMutationContext = Readonly<{
  authorities: readonly string[];
  canonicalOwner: "operator-orchestration-service";
  correlationId: string;
  expiresAt: string;
  principalReference: string;
  roles: readonly string[];
  sessionReference: string;
  sourceReference: string;
}>;

type MutationAuthorizationOptions = Readonly<{
  canonicalOwner?: "operator-orchestration-service";
  requiredAuthority?: string;
  requiredRole?: string;
}>;

const mutationContext = new AsyncLocalStorage<ConsoleMutationContext>();

export class ConsoleSessionAuthorizationError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function authorizeConsoleMutation(
  request: Request,
  operation: () => Promise<Response>,
  options: MutationAuthorizationOptions = {},
) {
  let context: ConsoleMutationContext;
  try {
    const snapshot = await readVerifiedConsoleSession();
    const requiredRole = options.requiredRole ?? "Operator";
    const requiredAuthority = options.requiredAuthority ?? "Workspace owner";
    if (!snapshot.access.roles.includes(requiredRole)) {
      throw new ConsoleSessionAuthorizationError(
        `The verified Console session does not carry the ${requiredRole} role.`,
        "console_session_role_required",
        403,
      );
    }
    if (!snapshot.access.authorities.includes(requiredAuthority)) {
      throw new ConsoleSessionAuthorizationError(
        `The verified Console session does not carry ${requiredAuthority} authority.`,
        "console_session_authority_required",
        403,
      );
    }

    const configuredOperator = process.env.GOVERNANCE_CONSOLE_OPERATOR_ID?.trim();
    if (!configuredOperator) {
      throw new ConsoleSessionAuthorizationError(
        "The Console operator binding is unavailable.",
        "console_operator_binding_unavailable",
        503,
      );
    }
    if (configuredOperator !== snapshot.principal.reference) {
      throw new ConsoleSessionAuthorizationError(
        "The Console operator binding conflicts with the verified session.",
        "console_operator_binding_conflict",
        403,
      );
    }

    context = {
      authorities: snapshot.access.authorities,
      canonicalOwner:
        options.canonicalOwner ?? "operator-orchestration-service",
      correlationId: randomUUID(),
      expiresAt: snapshot.session.expiresAt!,
      principalReference: snapshot.principal.reference,
      roles: snapshot.access.roles,
      sessionReference: snapshot.session.reference!,
      sourceReference: snapshot.source.reference,
    };

  } catch (error) {
    const known =
      error instanceof ConsoleSessionAuthorizationError
        ? error
        : new ConsoleSessionAuthorizationError(
            "The verified Console session is unavailable.",
            "console_session_unavailable",
            401,
          );
    return NextResponse.json(
      {
        code: known.code,
        error: known.message,
        requestPath: new URL(request.url).pathname,
        status: "denied",
      },
      { headers: noStoreHeaders, status: known.status },
    );
  }

  return mutationContext.run(context, operation);
}

export function consoleMutationAttributionHeaders(): Record<string, string> {
  const context = mutationContext.getStore();
  if (!context) return {};

  return {
    "x-console-authorities": JSON.stringify(context.authorities),
    "x-console-canonical-owner": context.canonicalOwner,
    "x-console-correlation-id": context.correlationId,
    "x-console-principal-ref": context.principalReference,
    "x-console-roles": JSON.stringify(context.roles),
    "x-console-session-expires-at": context.expiresAt,
    "x-console-session-ref": context.sessionReference,
    "x-console-source-ref": context.sourceReference,
  };
}

export async function readVerifiedConsoleSession(
  env: NodeJS.ProcessEnv = process.env,
  now = new Date(),
): Promise<OperatorIdentitySnapshot> {
  const projectionPath = env.GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH?.trim();
  if (!projectionPath || !isAbsolute(projectionPath)) {
    throw new ConsoleSessionAuthorizationError(
      "The Platform session projection is not configured.",
      "console_session_projection_unavailable",
      401,
    );
  }

  let info;
  let raw;
  try {
    info = await lstat(projectionPath);
    if (!info.isFile() || info.isSymbolicLink()) {
      throw new Error("projection is not a regular file");
    }
    if ((info.mode & 0o777) !== 0o600) {
      throw new Error("projection permissions are not private");
    }
    if (typeof process.getuid === "function" && info.uid !== process.getuid()) {
      throw new Error("projection owner does not match the Console process");
    }
    if (info.size <= 0 || info.size > maxProjectionBytes) {
      throw new Error("projection size is invalid");
    }
    raw = await readFile(projectionPath, "utf8");
  } catch {
    throw new ConsoleSessionAuthorizationError(
      "The Platform session projection cannot be read safely.",
      "console_session_projection_invalid",
      401,
    );
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new ConsoleSessionAuthorizationError(
      "The Platform session projection is malformed.",
      "console_session_projection_invalid",
      401,
    );
  }

  const snapshot = assertProjection(value);
  const authenticatedAt = timestamp(snapshot.session.authenticatedAt);
  const expiresAt = timestamp(snapshot.session.expiresAt);
  const observedAt = timestamp(snapshot.source.observedAt);
  if (
    authenticatedAt.getTime() > observedAt.getTime() ||
    observedAt.getTime() > now.getTime() + 30_000 ||
    expiresAt.getTime() <= now.getTime()
  ) {
    throw new ConsoleSessionAuthorizationError(
      "The Platform session projection is stale or expired.",
      "console_session_projection_stale",
      401,
    );
  }
  return snapshot;
}

function assertProjection(value: unknown): OperatorIdentitySnapshot {
  const root = record(value, "projection");
  exactKeys(root, ["access", "principal", "schemaVersion", "session", "source"]);
  if (root.schemaVersion !== "console-operator-identity/v1") invalid();

  const access = record(root.access, "access");
  exactKeys(access, ["authorities", "environment", "roles"]);
  if (access.environment !== "Dev integration") invalid();
  const roles = textList(access.roles);
  const authorities = textList(access.authorities);

  const principal = record(root.principal, "principal");
  exactKeys(principal, ["displayName", "kind", "reference"]);
  if (principal.kind !== "human") invalid();

  const session = record(root.session, "session");
  exactKeys(session, [
    "authenticatedAt",
    "authenticationState",
    "expiresAt",
    "mode",
    "reference",
  ]);
  if (
    session.authenticationState !== "authenticated" ||
    !text(session.reference).startsWith("platform-session://")
  ) invalid();

  const source = record(root.source, "source");
  exactKeys(source, ["authority", "freshness", "mode", "observedAt", "reference"]);
  if (
    source.authority !== "platform-engineering" ||
    source.freshness !== "current" ||
    source.mode !== "live" ||
    !text(source.reference).startsWith("platform-session-source://")
  ) invalid();

  const snapshot: OperatorIdentitySnapshot = {
    access: {
      authorities,
      environment: text(access.environment),
      roles,
    },
    principal: {
      displayName: text(principal.displayName),
      kind: "human",
      reference: text(principal.reference),
    },
    schemaVersion: "console-operator-identity/v1",
    session: {
      authenticatedAt: text(session.authenticatedAt),
      authenticationState: "authenticated",
      expiresAt: text(session.expiresAt),
      mode: text(session.mode),
      reference: text(session.reference),
    },
    source: {
      authority: "platform-engineering",
      freshness: "current",
      mode: "live",
      observedAt: text(source.observedAt),
      reference: text(source.reference),
    },
  };
  timestamp(snapshot.session.authenticatedAt);
  timestamp(snapshot.session.expiresAt);
  timestamp(snapshot.source.observedAt);
  return snapshot;
}

function record(value: unknown, _label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  if (
    Object.keys(value).sort().join("\u0000") !==
    [...expected].sort().join("\u0000")
  ) invalid();
}

function text(value: unknown) {
  if (typeof value !== "string" || !value.trim()) invalid();
  return value;
}

function textList(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) invalid();
  const items = value.map(text);
  if (new Set(items).size !== items.length) invalid();
  return items;
}

function timestamp(value: unknown) {
  const parsed = new Date(text(value));
  if (Number.isNaN(parsed.getTime())) invalid();
  return parsed;
}

function invalid(): never {
  throw new ConsoleSessionAuthorizationError(
    "The Platform session projection does not match the accepted contract.",
    "console_session_projection_invalid",
    401,
  );
}
