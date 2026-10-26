import type { OperatorAccountSnapshot } from "./operator-account-model.ts";
import type { OperatorIdentitySnapshot } from "./operator-identity-model.ts";

export const unavailableOperatorIdentity: OperatorIdentitySnapshot = {
  schemaVersion: "console-operator-identity/v1",
  access: { authorities: [], roles: [], environment: "Not observed" },
  principal: { displayName: "Operator", kind: "human", reference: "unavailable" },
  session: { authenticatedAt: null, authenticationState: "unavailable", expiresAt: null, mode: "Unavailable", reference: null },
  source: { authority: "platform-engineering", mode: "unavailable", freshness: "unavailable", observedAt: null, reference: "console://operator-session" },
};

export function operatorAccountSnapshot(identity: OperatorIdentitySnapshot): OperatorAccountSnapshot {
  const unavailable = { owner: "Platform identity and access", state: "unavailable" as const };
  return {
    schemaVersion: "console-operator-account/v1",
    identity,
    capabilities: { manageAuthentication: unavailable, requestAccess: unavailable, revokeSession: unavailable, signOut: unavailable, switchAccount: unavailable, updateProfile: { owner: "Console Shell", state: "prototype-local" } },
    profile: { displayName: identity.principal.displayName, locale: "en-GB", timeFormat: "24-hour", timeZone: "UTC" },
  };
}
