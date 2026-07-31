export type OperatorIdentitySourceMode =
  | "live"
  | "source-projected"
  | "synthetic"
  | "unavailable";

export type OperatorIdentityFreshness =
  | "current"
  | "stale"
  | "unverified"
  | "unavailable";

export type OperatorAuthenticationState =
  | "authenticated"
  | "expired"
  | "not-authenticated"
  | "unavailable";

export type OperatorIdentitySnapshot = Readonly<{
  access: Readonly<{
    authorities: readonly string[];
    environment: string;
    roles: readonly string[];
  }>;
  principal: Readonly<{
    displayName: string;
    kind: "human";
    reference: string;
  }>;
  schemaVersion: "console-operator-identity/v1";
  session: Readonly<{
    authenticatedAt: string | null;
    authenticationState: OperatorAuthenticationState;
    expiresAt: string | null;
    mode: string;
    reference: string | null;
  }>;
  source: Readonly<{
    authority: string;
    freshness: OperatorIdentityFreshness;
    mode: OperatorIdentitySourceMode;
    observedAt: string | null;
    reference: string;
  }>;
}>;
