import type { TerasTone } from "@/teras";

import type { PrototypeRecord } from "../../read-model/prototype-workspace-read-model.ts";
import {
  prototypeBaselineLabel,
  prototypeBaselineTone,
  prototypeLifecycleLabel,
  prototypeLifecycleTone,
  prototypeMovementStateLabel,
  prototypePreviewLabel,
  prototypePreviewTone,
  prototypeRecordStatusLabel,
  prototypeRecordTone,
} from "../../read-model/selectors/prototype-workspace-selectors.ts";
import { prototypeLandingStateLabel } from "../../work-model/workflows/landing/prototype-landing-model.ts";

export { prototypeMovementStateLabel };

export function prototypeSelectedPanelMeta(record: PrototypeRecord) {
  return [
    { label: "Record", value: record.id },
    { label: "Lifecycle", value: prototypeLifecycleLabel(record.lifecycle) },
    {
      label: "Landing",
      value: prototypeLandingStateLabel(record.landing.state),
    },
    { label: "Ingress", value: prototypeIngressLabel(record.ingress) },
    { label: "Data", value: prototypeDataModeLabel(record.dataMode) },
    {
      label: "Boundary",
      value: prototypeMutationBoundaryLabel(record.mutationBoundary),
    },
  ];
}

export function prototypeSelectedPanelStatus(record: PrototypeRecord) {
  return {
    label: prototypeRecordStatusLabel(record),
    tone: prototypeRecordTone(record),
  };
}

export function prototypeCompactSupportBundleLabel(record: PrototypeRecord) {
  switch (record.landing.supportProfile) {
    case "custom-support":
      return "Custom";
    case "existing-source-review":
      return "Source review";
    case "external-dependency":
      return "External dependency";
    case "interactive-prototype":
      return "Interactive";
    case "local-runtime":
      return "Local runtime";
    case "simple-prototype":
      return "Simple";
  }
}

export function prototypeLifecycleStatus(record: PrototypeRecord) {
  return {
    label: prototypeLifecycleLabel(record.lifecycle),
    tone: prototypeLifecycleTone(record.lifecycle),
  };
}

export function prototypeBaselineStatus(record: PrototypeRecord) {
  return {
    label: prototypeBaselineLabel(record.baseline.state),
    tone: prototypeBaselineTone(record.baseline.state),
  };
}

export function prototypeLandingStatus(record: PrototypeRecord) {
  return {
    label: prototypeLandingStateLabel(record.landing.state),
    tone: prototypeLandingTone(record),
  };
}

export function prototypePreviewStatus(record: PrototypeRecord) {
  return {
    label: prototypePreviewLabel(record),
    tone: prototypePreviewTone(record),
  };
}

function prototypeLandingTone(record: PrototypeRecord): TerasTone {
  if (record.lifecycle === "retired" || record.lifecycle === "graduated") {
    return "muted";
  }

  switch (record.landing.state) {
    case "blocked":
      return "danger";
    case "captured":
    case "drafting":
      return "warn";
    case "landed":
      return "ok";
  }
}

export function prototypeIngressLabel(value: PrototypeRecord["ingress"]) {
  switch (value) {
    case "existing-source":
      return "Existing source";
    case "imported":
      return "Imported";
    case "local-entry":
      return "Local entry";
    case "proposal-routed":
      return "Proposal routed";
  }
}

export function prototypeDataModeLabel(value: PrototypeRecord["dataMode"]) {
  switch (value) {
    case "mock":
      return "Mock";
    case "real-mutable":
      return "Real mutable";
    case "real-readonly":
      return "Real read-only";
    case "synthetic":
      return "Synthetic";
  }
}

export function prototypeMutationBoundaryLabel(
  value: PrototypeRecord["mutationBoundary"],
) {
  switch (value) {
    case "external-sandbox":
      return "External sandbox";
    case "none":
      return "None";
    case "prototype-local":
      return "Prototype local";
    case "read-only":
      return "Read only";
    case "real-system":
      return "Real system";
  }
}

export function prototypeVisibilityLabel(
  value: PrototypeRecord["visibilityTier"],
) {
  switch (value) {
    case "client-review":
      return "Client review";
    case "operator-review":
      return "Operator review";
    case "private-internal":
      return "Private internal";
    case "public-demo":
      return "Public demo";
  }
}
