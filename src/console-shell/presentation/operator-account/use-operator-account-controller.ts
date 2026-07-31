"use client";

import { useMemo, useState } from "react";

import type {
  OperatorAccountProfile,
  OperatorAccountSnapshot,
} from "../../identity/operator-account-model";
import {
  normalizeOperatorAccountProfile,
  operatorAccountProfilesMatch,
  validateOperatorAccountProfile,
} from "../../identity/operator-account-model";

export type OperatorAccountView = "access" | "profile" | "security";

export function useOperatorAccountController(
  initialSnapshot: OperatorAccountSnapshot,
) {
  const [activeView, setActiveView] =
    useState<OperatorAccountView>("profile");
  const [accountOpen, setAccountOpen] = useState(false);
  const [discardGuardOpen, setDiscardGuardOpen] = useState(false);
  const [identityDetailsOpen, setIdentityDetailsOpen] = useState(false);
  const [savedProfile, setSavedProfile] = useState(initialSnapshot.profile);
  const [profileDraft, setProfileDraft] = useState(initialSnapshot.profile);

  const account = useMemo(
    () => ({
      ...initialSnapshot,
      profile: savedProfile,
    }),
    [initialSnapshot, savedProfile],
  );
  const profileDirty = !operatorAccountProfilesMatch(
    savedProfile,
    profileDraft,
  );
  const profileUpdateEnabled =
    account.capabilities.updateProfile.state !== "unavailable";
  const profileValidation = validateOperatorAccountProfile(profileDraft);

  function updateProfileDraft(patch: Partial<OperatorAccountProfile>) {
    setProfileDraft((current) => ({
      ...current,
      ...patch,
    }));
  }

  function saveProfile() {
    if (!profileUpdateEnabled || !profileValidation.valid) {
      return;
    }

    const normalized = normalizeOperatorAccountProfile(profileDraft);
    setSavedProfile(normalized);
    setProfileDraft(normalized);
  }

  function resetProfile() {
    setProfileDraft(savedProfile);
  }

  function requestAccountClose() {
    if (profileDirty) {
      setDiscardGuardOpen(true);
      return;
    }

    setAccountOpen(false);
  }

  function discardProfileAndClose() {
    setProfileDraft(savedProfile);
    setDiscardGuardOpen(false);
    setAccountOpen(false);
  }

  return {
    account,
    accountOpen,
    activeView,
    discardGuardOpen,
    identityDetailsOpen,
    profileDirty,
    profileDraft,
    profileUpdateEnabled,
    profileValidation,
    cancelDiscard: () => setDiscardGuardOpen(false),
    closeIdentityDetails: () => setIdentityDetailsOpen(false),
    discardProfileAndClose,
    openAccount: () => setAccountOpen(true),
    openIdentityDetails: () => setIdentityDetailsOpen(true),
    requestAccountClose,
    resetProfile,
    saveProfile,
    setActiveView,
    updateProfileDraft,
  };
}

export type OperatorAccountController = ReturnType<
  typeof useOperatorAccountController
>;
