export type ConsoleOwnerMode = "disconnected-preview" | "live" | "unavailable";

export type ConsoleOwnerStatus =
  | "current"
  | "loading"
  | "offline"
  | "partial"
  | "unavailable";

export type ConsoleFixtureIsolationDecision = Readonly<{
  actionMode: "disabled" | "durable" | "prototype-local";
  demonstrationSource: "disconnected-preview" | "live-authority" | "none";
  fixtureAllowed: boolean;
  liveAuthorityAllowed: boolean;
  reasonCode: string | null;
}>;

export type ConsoleActionSemantic =
  | "durable-command"
  | "prototype-local-simulation";

/**
 * Selects exactly one truth source. A requested design/dev preview is not an
 * authority signal and therefore is deliberately absent from this input.
 */
export function resolveConsoleFixtureIsolation({
  mode,
  status,
}: {
  mode: ConsoleOwnerMode | null;
  status: ConsoleOwnerStatus;
}): ConsoleFixtureIsolationDecision {
  if (mode === "disconnected-preview" && status === "current") {
    return {
      actionMode: "prototype-local",
      demonstrationSource: "disconnected-preview",
      fixtureAllowed: true,
      liveAuthorityAllowed: false,
      reasonCode: "console_owner_explicitly_disconnected",
    };
  }

  if (mode === "live" && status === "current") {
    return {
      actionMode: "durable",
      demonstrationSource: "live-authority",
      fixtureAllowed: false,
      liveAuthorityAllowed: true,
      reasonCode: null,
    };
  }

  return {
    actionMode: "disabled",
    demonstrationSource: "none",
    fixtureAllowed: false,
    liveAuthorityAllowed: false,
    reasonCode:
      mode === null || status === "loading"
        ? "console_owner_truth_loading"
        : mode === "live"
          ? "console_live_owner_unavailable"
          : mode === "unavailable"
            ? "console_owner_configuration_unavailable"
            : "console_disconnected_preview_unavailable",
  };
}

export function selectConsoleAuthorityProjection<T>({
  decision,
  fixture,
  live,
}: {
  decision: ConsoleFixtureIsolationDecision;
  fixture: T;
  live: T | null;
}): T | null {
  if (decision.fixtureAllowed) return fixture;
  if (decision.liveAuthorityAllowed) return live;
  return null;
}

export function consoleActionExecutable(
  decision: ConsoleFixtureIsolationDecision,
  semantic: ConsoleActionSemantic,
) {
  return semantic === "durable-command"
    ? decision.actionMode === "durable"
    : decision.actionMode === "prototype-local";
}
