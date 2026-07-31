import type { TerasTone } from "@/teras";

import {
  prototypePreviewNeedLabel,
  prototypeSourceHomeLabel,
} from "../../../work-model/workflows/landing/prototype-landing-model.ts";
import { prototypeBasePlatformLabel } from "@/domain-workspaces/prototype/domain/support/prototype-setup-profile-model";
import { prototypePreviewProfileInputComplete } from "../../../work-model/preview-runtime/prototype-preview-state-model.ts";
import type {
  PrototypePreviewLaunchAdapter,
  PrototypeRecord,
} from "../../../read-model/prototype-workspace-read-model.ts";
import type {
  PrototypePreviewPanelProjection,
  PrototypePreviewProfileDraft,
  PrototypePreviewRuntimeFact,
  PrototypePreviewRuntimeRow,
} from "./prototype-preview-runtime-types.ts";

export const prototypePreviewHostOptions = [
  { label: "127.0.0.1", value: "127.0.0.1" },
  { label: "0.0.0.0", value: "0.0.0.0" },
  { label: "workspace host", value: "workspace-host" },
];

export const prototypePreviewLaunchAdapterOptions: Array<{
  label: string;
  value: PrototypePreviewLaunchAdapter;
}> = [
  { label: "Node.js / npm", value: "node-npm" },
  { label: "Node.js / pnpm", value: "node-pnpm" },
  { label: "Python / uv", value: "python-uv" },
  { label: "Python / Poetry", value: "python-poetry" },
  { label: "Python / pip", value: "python-pip" },
  { label: "Container / Compose", value: "container-compose" },
  { label: "Static server", value: "static-server" },
  { label: "Generic command", value: "generic-command" },
  { label: "No runtime", value: "none" },
  { label: "Unassigned", value: "unassigned" },
];

export function prototypePreviewLaunchAdapterLabel(
  value: PrototypePreviewLaunchAdapter,
) {
  return (
    prototypePreviewLaunchAdapterOptions.find(
      (option) => option.value === value,
    )?.label ?? value
  );
}

export function prototypePreviewProfileDraftFromRecord(
  record: PrototypeRecord,
): PrototypePreviewProfileDraft {
  return {
    command: record.preview.command,
    healthcheckPath: record.preview.healthcheckPath,
    host: prototypePreviewHostFromAddress(record.preview.address),
    launchAdapter: record.preview.launchAdapter,
    port: record.preview.port,
    profileRef: record.preview.profileRef,
    profileSource: record.preview.profileSource,
    workingDirectory: record.preview.workingDirectory,
  };
}

export function prototypePreviewProfileDraftComplete(
  draft: PrototypePreviewProfileDraft,
) {
  return prototypePreviewProfileInputComplete(draft);
}

export function prototypePreviewAddressFromDraft(
  draft: PrototypePreviewProfileDraft,
) {
  if (draft.host === "workspace-host") {
    return `http://workspace-host:${draft.port}`;
  }

  return `http://${draft.host}:${draft.port}`;
}

function prototypePreviewHostFromAddress(address: string) {
  const match = address.match(/^https?:\/\/([^:/]+)(?::\d+)?/);
  const host = match?.[1] ?? "127.0.0.1";

  if (host === "workspace-host" || host === "0.0.0.0") {
    return host;
  }

  return "127.0.0.1";
}

export function prototypePreviewProfileLabel(record: PrototypeRecord) {
  switch (record.preview.profileState) {
    case "no-profile":
      return "Profile needed";
    case "profile-configured":
      return "Profile ready";
    case "profile-draft":
      return "Draft profile";
  }
}

export function prototypePreviewProfileCompactLabel(record: PrototypeRecord) {
  switch (record.preview.profileState) {
    case "no-profile":
      return "Needed";
    case "profile-configured":
      return "Ready";
    case "profile-draft":
      return "Draft";
  }
}

export function prototypePreviewSelectedProfileFacts(
  record: PrototypeRecord,
): PrototypePreviewRuntimeFact[] {
  return [
    { label: "Profile", value: record.preview.profileRef },
    {
      label: "Base platform",
      value: prototypeBasePlatformLabel(record.landing.basePlatform),
    },
    {
      label: "Source home",
      value: prototypeSourceHomeLabel(record.landing.sourceHome),
    },
    {
      label: "Preview need",
      value: prototypePreviewNeedLabel(record.landing.previewNeed),
    },
  ];
}

export function prototypePreviewResolvedProfileFacts(
  record: PrototypeRecord,
): PrototypePreviewRuntimeFact[] {
  return [
    { label: "Profile", value: record.preview.profileRef },
    {
      label: "Launch adapter",
      value: prototypePreviewLaunchAdapterLabel(record.preview.launchAdapter),
    },
    { label: "Address", value: record.preview.address },
    { label: "Port", value: record.preview.port },
    { label: "Healthcheck", value: record.preview.healthcheckPath },
    { label: "Command", value: record.preview.command },
    { label: "Working Dir", value: record.preview.workingDirectory },
    { label: "Profile source", value: record.preview.profileSource },
  ];
}

export function prototypePreviewProfileDraftFacts(
  draft: PrototypePreviewProfileDraft,
): PrototypePreviewRuntimeFact[] {
  return [
    {
      label: "Preview address",
      value: prototypePreviewAddressFromDraft(draft),
    },
    { label: "Launch command", value: draft.command },
    {
      label: "Launch adapter",
      value: prototypePreviewLaunchAdapterLabel(draft.launchAdapter),
    },
    { label: "Working directory", value: draft.workingDirectory },
    { label: "Healthcheck", value: draft.healthcheckPath },
    { label: "Profile source", value: draft.profileSource },
  ];
}

export function prototypePreviewProfileDraftChanged(
  record: PrototypeRecord,
  draft: PrototypePreviewProfileDraft,
) {
  return (
    record.preview.address !== prototypePreviewAddressFromDraft(draft) ||
    record.preview.command !== draft.command ||
    record.preview.healthcheckPath !== draft.healthcheckPath ||
    record.preview.launchAdapter !== draft.launchAdapter ||
    record.preview.port !== draft.port ||
    record.preview.profileRef !== draft.profileRef ||
    record.preview.profileSource !== draft.profileSource ||
    record.preview.workingDirectory !== draft.workingDirectory
  );
}

export function prototypePreviewProfileReadinessRows(
  record: PrototypeRecord,
  draft: PrototypePreviewProfileDraft,
): PrototypePreviewRuntimeRow[] {
  const draftComplete = prototypePreviewProfileDraftComplete(draft);
  const draftChanged = prototypePreviewProfileDraftChanged(record, draft);
  const confirmed =
    record.preview.profileState === "profile-configured" && !draftChanged;

  return [
    {
      detail: draftComplete
        ? "Profile, launch adapter, endpoint, command, working directory, healthcheck, and source are filled."
        : "Complete profile, launch adapter, endpoint, command, working directory, healthcheck, and source before saving.",
      label: "Required fields",
      status: draftComplete ? "complete" : "missing",
      tone: draftComplete ? "ok" : "warn",
    },
    {
      detail: draftChanged
        ? "The visible draft differs from the saved prototype record."
        : "The visible draft matches the saved prototype record.",
      label: "Draft state",
      status: draftChanged ? "changed" : "unchanged",
      tone: draftChanged ? "warn" : "ok",
    },
    {
      detail: confirmed
        ? "Runtime controls can use this confirmed profile."
        : "Runtime controls stay locked to the last confirmed profile until this draft is confirmed.",
      label: "Runtime admission",
      status: confirmed ? "available" : "locked",
      tone: confirmed ? "ok" : "warn",
    },
  ];
}

export function prototypePreviewProfileControlProjection(
  record: PrototypeRecord,
): PrototypePreviewPanelProjection {
  const configured = record.preview.profileState === "profile-configured";

  return {
    statusLabel: configured ? "Configured" : "Needs profile",
    tone: configured ? "ok" : "warn",
  };
}

export function prototypePreviewProfileDraftChangeProjection(
  record: PrototypeRecord,
  draft: PrototypePreviewProfileDraft,
  previewTone: TerasTone,
): PrototypePreviewPanelProjection {
  const changed = prototypePreviewProfileDraftChanged(record, draft);

  return {
    statusLabel: changed ? "Draft changed" : "Current profile",
    tone: changed ? "warn" : previewTone,
  };
}

export function prototypePreviewProfileDraftCompletionProjection(
  draftComplete: boolean,
  previewTone: TerasTone,
): PrototypePreviewPanelProjection {
  return {
    statusLabel: draftComplete ? "Complete" : "Missing",
    tone: draftComplete ? previewTone : "warn",
  };
}

export function prototypePreviewValidationRows(
  record: PrototypeRecord,
): PrototypePreviewRuntimeRow[] {
  const profileConfigured =
    record.preview.profileState === "profile-configured";
  const launchAdapterReady =
    record.preview.launchAdapter !== "unassigned" &&
    record.preview.launchAdapter !== "none";
  const endpointReady =
    record.preview.address.trim().length > 0 &&
    record.preview.port.trim().length > 0;
  const launchReady =
    record.preview.command.trim().length > 0 &&
    record.preview.workingDirectory.trim().length > 0;
  const healthcheckReady = record.preview.healthcheckPath.trim().length > 0;

  return [
    {
      detail: `${prototypePreviewNeedLabel(record.landing.previewNeed)} / ${prototypePreviewLaunchAdapterLabel(record.preview.launchAdapter)}`,
      label: "Activation mode",
      status: launchAdapterReady ? "ready" : "needed",
      tone: launchAdapterReady ? "ok" : "warn",
    },
    {
      detail: `${record.preview.command} from ${record.preview.workingDirectory}`,
      label: "Launch path",
      status: launchReady ? "ready" : "missing",
      tone: launchReady ? "ok" : "warn",
    },
    {
      detail: `${record.preview.address}${record.preview.healthcheckPath}`,
      label: "Endpoint check",
      status: endpointReady && healthcheckReady ? "ready" : "missing",
      tone: endpointReady && healthcheckReady ? "ok" : "warn",
    },
    {
      detail:
        "Start remains prototype-local until a future dev-integration profile is admitted.",
      label: "Runtime admission",
      status: profileConfigured ? "available" : "locked",
      tone: profileConfigured ? "ok" : "warn",
    },
  ];
}

export function prototypePreviewProfileTone(
  record: PrototypeRecord,
): TerasTone {
  switch (record.preview.profileState) {
    case "profile-configured":
      return "ok";
    case "no-profile":
    case "profile-draft":
      return "warn";
  }
}
