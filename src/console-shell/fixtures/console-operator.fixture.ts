import type { OperatorAccountSnapshot } from "../identity/operator-account-model";
import { prototypeLocalOperatorAttribution } from "../../console-integration/operator-attribution.ts";

const unavailableIdentityCapability = {
  owner: "Platform identity and access",
  state: "unavailable",
} as const;

export const consoleOperatorAccountFixture = {
  capabilities: {
    manageAuthentication: unavailableIdentityCapability,
    requestAccess: unavailableIdentityCapability,
    revokeSession: unavailableIdentityCapability,
    signOut: unavailableIdentityCapability,
    switchAccount: unavailableIdentityCapability,
    updateProfile: {
      owner: "Console Shell",
      state: "prototype-local",
    },
  },
  identity: {
    access: {
      authorities: ["Workspace owner"],
      environment: "Dev integration",
      roles: ["Operator"],
    },
    principal: {
      displayName: "mfshaf7",
      kind: "human",
      reference: prototypeLocalOperatorAttribution.actorId,
    },
    schemaVersion: "console-operator-identity/v1",
    session: {
      authenticatedAt: null,
      authenticationState: "not-authenticated",
      expiresAt: null,
      mode: "Prototype preview",
      reference: null,
    },
    source: {
      authority: "workspace-prototype-studio",
      freshness: "unverified",
      mode: "synthetic",
      observedAt: null,
      reference: "fixture://console/operator-account",
    },
  },
  profile: {
    displayName: "mfshaf7",
    locale: "en-MY",
    timeFormat: "24-hour",
    timeZone: "Asia/Kuala_Lumpur",
  },
  schemaVersion: "console-operator-account/v1",
} as const satisfies OperatorAccountSnapshot;
