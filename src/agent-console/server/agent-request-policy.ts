import type {
  AgentContextCandidate,
  AgentContextCandidateTone,
  AgentContextSourceMode,
} from "../../console-shell/context/agent-context-candidate";
import type { AgentInteractionMode } from "../model/agent-context-policy.ts";
import { hasSecretLikeMaterial, inspectAgentInput } from "../model/agent-input-policy.ts";

const maxCandidateStringChars = 600;
const maxCandidateListItems = 8;
const maxCandidateListItemChars = 300;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const candidateKeys = new Set([
  "boundary", "displayTone", "freshness", "id", "observedAt", "projectedAt",
  "refs", "safeActions", "schemaVersion", "scope", "signals", "sourceAuthority",
  "sourceMode", "status", "summary", "surfaceKind", "title",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIsoTimestamp(value: string) {
  return !Number.isNaN(Date.parse(value));
}

function parseRequiredString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    return { error: `context candidate ${key} must be a non-empty string` } as const;
  }
  if (value.length > maxCandidateStringChars) {
    return { error: `context candidate ${key} exceeds ${maxCandidateStringChars} characters` } as const;
  }
  return value;
}

function parseStringList(record: Record<string, unknown>, key: "refs" | "safeActions" | "signals") {
  const value = record[key];
  if (!Array.isArray(value) || value.length > maxCandidateListItems) {
    return { error: `context candidate ${key} must contain at most ${maxCandidateListItems} entries` } as const;
  }
  if (value.some((item) => typeof item !== "string" || !item.trim() || item.length > maxCandidateListItemChars)) {
    return { error: `context candidate ${key} entries must be non-empty strings no longer than ${maxCandidateListItemChars} characters` } as const;
  }
  return value as string[];
}

function parseSourceMode(value: unknown): AgentContextSourceMode | { error: string } {
  if (value === "live" || value === "source-projected" || value === "synthetic" || value === "unavailable") return value;
  return { error: "context candidate sourceMode is invalid" };
}

function parseDisplayTone(value: unknown): AgentContextCandidateTone | undefined | { error: string } {
  if (value === undefined) return undefined;
  if (value === "danger" || value === "info" || value === "muted" || value === "ok" || value === "stale" || value === "warn") return value;
  return { error: "context candidate displayTone is invalid" };
}

export function parseAgentContextCandidate(value: unknown): AgentContextCandidate | null | { error: string } {
  if (value === null) return null;
  if (!isRecord(value)) return { error: "context candidate must be an object or null" };
  const unknownKey = Object.keys(value).find((key) => !candidateKeys.has(key));
  if (unknownKey) return { error: `context candidate contains unsupported field ${unknownKey}` };
  if (value.schemaVersion !== 1) return { error: "context candidate schemaVersion must be 1" };

  const boundary = parseRequiredString(value, "boundary");
  const freshness = parseRequiredString(value, "freshness");
  const id = parseRequiredString(value, "id");
  const projectedAt = parseRequiredString(value, "projectedAt");
  const sourceAuthority = parseRequiredString(value, "sourceAuthority");
  const summary = parseRequiredString(value, "summary");
  const surfaceKind = parseRequiredString(value, "surfaceKind");
  const title = parseRequiredString(value, "title");
  const refs = parseStringList(value, "refs");
  const safeActions = parseStringList(value, "safeActions");
  const signals = parseStringList(value, "signals");
  const sourceMode = parseSourceMode(value.sourceMode);
  const displayTone = parseDisplayTone(value.displayTone);
  for (const parsed of [boundary, freshness, id, projectedAt, sourceAuthority, summary, surfaceKind, title, refs, safeActions, signals, sourceMode, displayTone]) {
    if (parsed && typeof parsed === "object" && "error" in parsed) return parsed;
  }
  if (value.scope !== "page" && value.scope !== "workspace") return { error: "context candidate scope must be page or workspace" };
  if (value.observedAt !== null && (typeof value.observedAt !== "string" || !isIsoTimestamp(value.observedAt))) {
    return { error: "context candidate observedAt must be an ISO timestamp or null" };
  }
  if (typeof projectedAt !== "string" || !isIsoTimestamp(projectedAt)) return { error: "context candidate projectedAt must be an ISO timestamp" };
  if (value.status !== undefined && (typeof value.status !== "string" || value.status.length > maxCandidateStringChars)) {
    return { error: `context candidate status must be a string no longer than ${maxCandidateStringChars} characters` };
  }

  const candidate: AgentContextCandidate = {
    boundary: boundary as string,
    displayTone: displayTone as AgentContextCandidateTone | undefined,
    freshness: freshness as string,
    id: id as string,
    observedAt: value.observedAt as string | null,
    projectedAt,
    refs: refs as string[],
    safeActions: safeActions as string[],
    schemaVersion: 1,
    scope: value.scope,
    signals: signals as string[],
    sourceAuthority: sourceAuthority as string,
    sourceMode: sourceMode as AgentContextSourceMode,
    status: value.status as string | undefined,
    summary: summary as string,
    surfaceKind: surfaceKind as string,
    title: title as string,
  };
  if (hasSecretLikeMaterial(JSON.stringify(candidate))) {
    return { error: "secret-like material detected in context candidate; governed projection was denied" };
  }
  return candidate;
}

function parseInteractionMode(value: unknown): "focused" | "workspace" | { error: string } {
  if (value === "focused" || value === "workspace") return value;
  return { error: "governed Agent Console mode must be focused or workspace" };
}

export function parseAgentContextRequest(value: unknown):
  | { candidate: AgentContextCandidate; mode: "focused" | "workspace" }
  | { error: string } {
  if (!isRecord(value)) return { error: "context request is required" };
  const unknownKey = Object.keys(value).find((key) => key !== "candidate" && key !== "mode");
  if (unknownKey) return { error: `context request contains unsupported field ${unknownKey}` };
  const mode = parseInteractionMode(value.mode);
  if (typeof mode === "object") return mode;
  const candidate = parseAgentContextCandidate(value.candidate ?? null);
  if (!candidate) return { error: "governed Agent Console invocation requires a visible context candidate" };
  if ("error" in candidate) return candidate;
  if (candidate.sourceMode === "unavailable") return { error: "unavailable context cannot enter governed projection" };
  if ((mode === "focused" && candidate.scope !== "page") || (mode === "workspace" && candidate.scope !== "workspace")) {
    return { error: `${mode} mode does not match the ${candidate.scope} context candidate` };
  }
  return { candidate, mode };
}

function parseSession(value: unknown) {
  if (!isRecord(value)) return { error: "browser session binding is required" } as const;
  const unknownKey = Object.keys(value).find((key) => key !== "nonce" && key !== "openedAt");
  if (unknownKey) return { error: `browser session binding contains unsupported field ${unknownKey}` } as const;
  if (typeof value.nonce !== "string" || !uuidPattern.test(value.nonce)) return { error: "browser session nonce is invalid" } as const;
  if (typeof value.openedAt !== "string" || !isIsoTimestamp(value.openedAt)) return { error: "browser session openedAt must be an ISO timestamp" } as const;
  return { nonce: value.nonce, openedAt: value.openedAt };
}

export type GovernedAgentRequest = Readonly<{
  candidate: AgentContextCandidate;
  invocationNonce: string;
  message: string;
  mode: Extract<AgentInteractionMode, "focused" | "workspace">;
  session: Readonly<{ nonce: string; openedAt: string }>;
}>;

export type AgentRequestValidation =
  | { error: string; ok: false; status: 400 | 422 }
  | ({ ok: true } & GovernedAgentRequest);

export function validateAgentSessionCloseRequest(value: unknown):
  | { error: string; ok: false; status: 400 | 422 }
  | { mode: "focused" | "workspace"; ok: true; session: GovernedAgentRequest["session"] } {
  if (!isRecord(value)) return { error: "session close request is required", ok: false, status: 400 };
  const unknownKey = Object.keys(value).find((key) => key !== "mode" && key !== "session");
  if (unknownKey) return { error: `session close request contains unsupported field ${unknownKey}`, ok: false, status: 422 };
  const mode = parseInteractionMode(value.mode);
  if (typeof mode === "object") return { error: mode.error, ok: false, status: 422 };
  const session = parseSession(value.session);
  if ("error" in session && session.error) return { error: session.error, ok: false, status: 422 };
  return { mode, ok: true, session };
}

export function validateAgentRequest(body: unknown): AgentRequestValidation {
  const request = isRecord(body) ? body : null;
  if (!request) return { error: "request body is required", ok: false, status: 400 };
  const allowed = new Set(["context", "invocationNonce", "message", "session"]);
  const unknownKey = Object.keys(request).find((key) => !allowed.has(key));
  if (unknownKey) return { error: `request contains unsupported field ${unknownKey}`, ok: false, status: 422 };
  const input = inspectAgentInput(request.message);
  if (!input.ok) return input;
  const context = parseAgentContextRequest(request.context);
  if ("error" in context) return { error: context.error, ok: false, status: 422 };
  const session = parseSession(request.session);
  if ("error" in session && session.error) return { error: session.error, ok: false, status: 422 };
  if (typeof request.invocationNonce !== "string" || !uuidPattern.test(request.invocationNonce)) {
    return { error: "invocation nonce is invalid", ok: false, status: 422 };
  }
  return { candidate: context.candidate, invocationNonce: request.invocationNonce, message: input.message, mode: context.mode, ok: true, session };
}
