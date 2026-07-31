import type { ConsoleTone } from "../console-shell-status";
import type {
  OperatorAuthenticationState,
  OperatorIdentityFreshness,
  OperatorIdentitySnapshot,
  OperatorIdentitySourceMode,
} from "./operator-identity-model";

export type OperatorIdentityPosture =
  | "expired"
  | "not-authenticated"
  | "prototype-local"
  | "stale"
  | "unavailable"
  | "unverified"
  | "verified";

export type OperatorIdentityProjection = Readonly<{
  authenticationLabel: string;
  authoritySummary: string;
  environmentLabel: string;
  expiresAtLabel: string;
  freshnessLabel: string;
  observedAtLabel: string;
  posture: OperatorIdentityPosture;
  principalLabel: string;
  roleSummary: string;
  sessionAuthenticatedAtLabel: string;
  sessionModeLabel: string;
  sourceModeLabel: string;
  statusLabel: string;
  tone: ConsoleTone;
  trusted: boolean;
}>;

const authenticationLabels: Readonly<
  Record<OperatorAuthenticationState, string>
> = {
  authenticated: "Authenticated",
  expired: "Expired",
  "not-authenticated": "Not authenticated",
  unavailable: "Unavailable",
};

const freshnessLabels: Readonly<Record<OperatorIdentityFreshness, string>> = {
  current: "Current",
  stale: "Stale",
  unavailable: "Unavailable",
  unverified: "Unverified",
};

const sourceModeLabels: Readonly<Record<OperatorIdentitySourceMode, string>> = {
  live: "Live identity source",
  "source-projected": "Source projection",
  synthetic: "Synthetic fixture",
  unavailable: "Unavailable",
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function isValidTimestamp(value: string | null) {
  return Boolean(value && !Number.isNaN(Date.parse(value)));
}

export function formatOperatorIdentityTimestamp(
  value: string | null,
  fallback = "Not reported",
) {
  if (!isValidTimestamp(value)) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    timeZoneName: "short",
    year: "numeric",
  }).format(new Date(value!));
}

function hasRequiredIdentity(snapshot: OperatorIdentitySnapshot) {
  return (
    snapshot.schemaVersion === "console-operator-identity/v1" &&
    hasText(snapshot.principal.displayName) &&
    hasText(snapshot.principal.reference) &&
    hasText(snapshot.access.environment) &&
    hasText(snapshot.source.authority) &&
    hasText(snapshot.source.reference)
  );
}

function resolvePosture(
  snapshot: OperatorIdentitySnapshot,
): OperatorIdentityPosture {
  if (
    !hasRequiredIdentity(snapshot) ||
    snapshot.source.mode === "unavailable" ||
    snapshot.source.freshness === "unavailable" ||
    snapshot.session.authenticationState === "unavailable"
  ) {
    return "unavailable";
  }

  if (snapshot.session.authenticationState === "expired") {
    return "expired";
  }

  if (snapshot.source.freshness === "stale") {
    return "stale";
  }

  if (snapshot.source.mode === "synthetic") {
    return "prototype-local";
  }

  if (snapshot.session.authenticationState === "not-authenticated") {
    return "not-authenticated";
  }

  const hasLiveTrustEvidence =
    snapshot.source.mode === "live" &&
    snapshot.source.freshness === "current" &&
    snapshot.session.authenticationState === "authenticated" &&
    hasText(snapshot.session.reference) &&
    isValidTimestamp(snapshot.session.authenticatedAt) &&
    isValidTimestamp(snapshot.session.expiresAt) &&
    isValidTimestamp(snapshot.source.observedAt);

  return hasLiveTrustEvidence ? "verified" : "unverified";
}

function postureDisplay(posture: OperatorIdentityPosture) {
  const display: Readonly<
    Record<
      OperatorIdentityPosture,
      Readonly<{ label: string; tone: ConsoleTone }>
    >
  > = {
    expired: { label: "SESSION EXPIRED", tone: "danger" },
    "not-authenticated": {
      label: "NOT AUTHENTICATED",
      tone: "danger",
    },
    "prototype-local": { label: "PROTOTYPE LOCAL", tone: "info" },
    stale: { label: "STALE IDENTITY", tone: "stale" },
    unavailable: { label: "IDENTITY UNAVAILABLE", tone: "danger" },
    unverified: { label: "UNVERIFIED SOURCE", tone: "warn" },
    verified: { label: "VERIFIED", tone: "ok" },
  };

  return display[posture];
}

export function projectOperatorIdentity(
  snapshot: OperatorIdentitySnapshot,
): OperatorIdentityProjection {
  const posture = resolvePosture(snapshot);
  const display = postureDisplay(posture);

  return {
    authenticationLabel:
      authenticationLabels[snapshot.session.authenticationState],
    authoritySummary:
      snapshot.access.authorities.join(" / ") || "No authority reported",
    environmentLabel: snapshot.access.environment || "Unavailable",
    expiresAtLabel: formatOperatorIdentityTimestamp(
      snapshot.session.expiresAt,
      snapshot.session.authenticationState === "not-authenticated"
        ? "Not issued"
        : "Not reported",
    ),
    freshnessLabel: freshnessLabels[snapshot.source.freshness],
    observedAtLabel: formatOperatorIdentityTimestamp(
      snapshot.source.observedAt,
    ),
    posture,
    principalLabel: snapshot.principal.displayName || "Identity unavailable",
    roleSummary: snapshot.access.roles.join(" / ") || "No role reported",
    sessionAuthenticatedAtLabel: formatOperatorIdentityTimestamp(
      snapshot.session.authenticatedAt,
      snapshot.session.authenticationState === "not-authenticated"
        ? "Not authenticated"
        : "Not reported",
    ),
    sessionModeLabel: snapshot.session.mode || "Unavailable",
    sourceModeLabel: sourceModeLabels[snapshot.source.mode],
    statusLabel: display.label,
    tone: display.tone,
    trusted: posture === "verified",
  };
}
