"use client";

import { RotateCcw, Save } from "lucide-react";

import {
  ConsoleSurfaceButton,
  ConsoleSurfaceChecklist,
  ConsoleSurfaceFieldGrid,
  ConsoleSurfacePanel,
  ConsoleSurfaceSelectField,
  ConsoleSurfaceStack,
  ConsoleSurfaceTextField,
  ConsoleSurfaceTwoZone,
} from "../../console-surface-controls";
import type { OperatorAccountController } from "./use-operator-account-controller";

const timeZoneOptions = [
  { label: "Kuala Lumpur (UTC+08:00)", value: "Asia/Kuala_Lumpur" },
  { label: "Singapore (UTC+08:00)", value: "Asia/Singapore" },
  { label: "London", value: "Europe/London" },
  { label: "New York", value: "America/New_York" },
  { label: "UTC", value: "UTC" },
] as const;

const localeOptions = [
  { label: "English (Malaysia)", value: "en-MY" },
  { label: "English (United Kingdom)", value: "en-GB" },
  { label: "English (United States)", value: "en-US" },
] as const;

const timeFormatOptions = [
  { label: "24-hour", value: "24-hour" },
  { label: "12-hour", value: "12-hour" },
] as const;

export function OperatorAccountProfileView({
  controller,
}: {
  controller: OperatorAccountController;
}) {
  const {
    profileDirty,
    profileDraft,
    profileUpdateEnabled,
    profileValidation,
    resetProfile,
    saveProfile,
    updateProfileDraft,
  } = controller;

  return (
    <ConsoleSurfaceTwoZone
      primary={
        <ConsoleSurfacePanel
          description="Update the local operator label and command-clock format."
          footer={
            <>
              <ConsoleSurfaceButton
                disabled={!profileDirty}
                icon={<RotateCcw aria-hidden="true" size={15} />}
                onClick={resetProfile}
              >
                Reset
              </ConsoleSurfaceButton>
              <ConsoleSurfaceButton
                disabled={
                  !profileUpdateEnabled ||
                  !profileDirty ||
                  !profileValidation.valid
                }
                icon={<Save aria-hidden="true" size={15} />}
                onClick={saveProfile}
                variant="primary"
              >
                Save profile
              </ConsoleSurfaceButton>
            </>
          }
          kicker="Profile"
          title="Profile and preferences"
        >
          <ConsoleSurfaceStack>
            <ConsoleSurfaceTextField
              description={
                profileValidation.displayName ??
                "Shown on the command bar in this browser session."
              }
              label="Display name"
              onChange={(displayName) =>
                updateProfileDraft({ displayName })
              }
              value={profileDraft.displayName}
            />
            <ConsoleSurfaceFieldGrid>
              <ConsoleSurfaceSelectField
                description="Controls the command-clock time zone."
                label="Time zone"
                onChange={(timeZone) => updateProfileDraft({ timeZone })}
                options={timeZoneOptions}
                value={profileDraft.timeZone}
              />
              <ConsoleSurfaceSelectField
                description="Controls date formatting."
                label="Locale"
                onChange={(locale) => updateProfileDraft({ locale })}
                options={localeOptions}
                value={profileDraft.locale}
              />
              <ConsoleSurfaceSelectField
                description="Controls command-clock hour formatting."
                label="Time format"
                onChange={(timeFormat) =>
                  updateProfileDraft({
                    timeFormat: timeFormat as "12-hour" | "24-hour",
                  })
                }
                options={timeFormatOptions}
                value={profileDraft.timeFormat}
              />
            </ConsoleSurfaceFieldGrid>
          </ConsoleSurfaceStack>
        </ConsoleSurfacePanel>
      }
      support={
        <ConsoleSurfacePanel
          description="Profile changes affect presentation only and never alter identity claims."
          kicker="Change scope"
          title="Prototype-local profile"
          tone={profileDirty ? "warn" : "info"}
        >
          <ConsoleSurfaceChecklist
            items={[
              {
                detail: "Updates this Console session only.",
                id: "profile-display-name",
                label: "Display name",
                status: "LOCAL",
                tone: "info",
              },
              {
                detail: "Updates the command clock after save.",
                id: "profile-clock",
                label: "Time preferences",
                status: "LOCAL",
                tone: "info",
              },
              {
                detail: "Principal, role, and authority remain source-owned.",
                id: "profile-identity",
                label: "Identity claims",
                status: "UNCHANGED",
                tone: "muted",
              },
              {
                detail: profileDirty
                  ? "Review or save the current draft."
                  : "No unsaved profile changes.",
                id: "profile-draft",
                label: "Profile draft",
                status: profileDirty ? "UNSAVED" : "SAVED",
                tone: profileDirty ? "warn" : "ok",
              },
            ]}
          />
        </ConsoleSurfacePanel>
      }
    />
  );
}
