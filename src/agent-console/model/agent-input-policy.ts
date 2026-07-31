export const maxOperatorPromptChars = 2_000;

export type AgentInputInspection =
  | {
      error: string;
      ok: false;
      status: 400 | 422;
    }
  | {
      message: string;
      ok: true;
    };

export function hasSecretLikeMaterial(value: string) {
  return [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\b(?:api[_-]?key|token|secret|password|passwd|bearer)\b\s*[:=]/i,
    /\b(?:sk|xox[baprs]|gh[pousr])_[A-Za-z0-9_-]{16,}\b/,
    /\bhvs\.[A-Za-z0-9_-]{16,}\b/,
    /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/,
  ].some((pattern) => pattern.test(value));
}

export function inspectAgentInput(value: unknown): AgentInputInspection {
  const message = typeof value === "string" ? value.trim() : "";

  if (!message) {
    return {
      error: "message is required",
      ok: false,
      status: 400,
    };
  }

  if (message.length > maxOperatorPromptChars) {
    return {
      error: `message exceeds ${maxOperatorPromptChars} character prototype limit`,
      ok: false,
      status: 400,
    };
  }

  if (hasSecretLikeMaterial(message)) {
    return {
      error:
        "secret-like material detected; this prototype blocks raw projection into the local model",
      ok: false,
      status: 422,
    };
  }

  return {
    message,
    ok: true,
  };
}
