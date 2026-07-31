import type { OperatorIdentitySnapshot } from "./operator-identity-model";

export type OperatorAccountCapabilityState =
  | "available"
  | "prototype-local"
  | "unavailable";

export type OperatorAccountCapability = Readonly<{
  owner: string;
  state: OperatorAccountCapabilityState;
}>;

export type OperatorClockFormat = "12-hour" | "24-hour";

export type OperatorAccountProfile = Readonly<{
  displayName: string;
  locale: string;
  timeFormat: OperatorClockFormat;
  timeZone: string;
}>;

export type OperatorAccountSnapshot = Readonly<{
  capabilities: Readonly<{
    manageAuthentication: OperatorAccountCapability;
    requestAccess: OperatorAccountCapability;
    revokeSession: OperatorAccountCapability;
    signOut: OperatorAccountCapability;
    switchAccount: OperatorAccountCapability;
    updateProfile: OperatorAccountCapability;
  }>;
  identity: OperatorIdentitySnapshot;
  profile: OperatorAccountProfile;
  schemaVersion: "console-operator-account/v1";
}>;

export type OperatorAccountProfileValidation = Readonly<{
  displayName: string | null;
  valid: boolean;
}>;

export function normalizeOperatorAccountProfile(
  profile: OperatorAccountProfile,
): OperatorAccountProfile {
  return {
    ...profile,
    displayName: profile.displayName.trim(),
  };
}

export function validateOperatorAccountProfile(
  profile: OperatorAccountProfile,
): OperatorAccountProfileValidation {
  const normalized = normalizeOperatorAccountProfile(profile);
  const displayName =
    normalized.displayName.length >= 2
      ? null
      : "Display name must contain at least two characters.";

  return {
    displayName,
    valid: displayName === null,
  };
}

export function operatorAccountProfilesMatch(
  left: OperatorAccountProfile,
  right: OperatorAccountProfile,
) {
  return (
    left.displayName === right.displayName &&
    left.locale === right.locale &&
    left.timeFormat === right.timeFormat &&
    left.timeZone === right.timeZone
  );
}
