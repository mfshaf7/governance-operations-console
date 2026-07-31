import type { TerasMetadataItem, TerasTone } from "@/teras";

import type {
  LocalExceptionRuntimeProjection,
  ModelConsumerEligibilityState,
  ModelProfileAvailability,
  ModelProfileLifecycle,
  ModelProfileRecord,
  ModelProjectionFreshness,
  ModelReadinessState,
} from "../../read-model/types/model-operations-types.ts";

export function modelProfileAvailabilityLabel(
  availability: ModelProfileAvailability,
) {
  switch (availability) {
    case "available":
      return "Available";
    case "blocked":
      return "Blocked";
    case "exception":
      return "Exception";
    case "retired":
      return "Retired";
    case "suspended":
      return "Suspended";
  }
}

export function modelProfileLifecycleLabel(lifecycle: ModelProfileLifecycle) {
  return lifecycle.charAt(0).toUpperCase() + lifecycle.slice(1);
}

export function modelReadinessLabel(state: ModelReadinessState) {
  switch (state) {
    case "blocked":
      return "Blocked";
    case "ready":
      return "Ready";
    case "stale":
      return "Stale";
    case "suspended":
      return "Suspended";
    case "unknown":
      return "Unknown";
  }
}

export function modelConsumerEligibilityLabel(
  state: ModelConsumerEligibilityState,
) {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

export function modelConsumerEligibilityTone(
  state: ModelConsumerEligibilityState,
): TerasTone {
  switch (state) {
    case "eligible":
      return "ok";
    case "blocked":
      return "danger";
    case "stale":
      return "stale";
    case "suspended":
      return "warn";
    case "unknown":
      return "muted";
  }
}

export function modelReadinessTone(state: ModelReadinessState): TerasTone {
  switch (state) {
    case "ready":
      return "ok";
    case "blocked":
      return "danger";
    case "stale":
      return "stale";
    case "suspended":
      return "warn";
    case "unknown":
      return "muted";
  }
}

export function modelProfileAvailabilityTone(
  availability: ModelProfileAvailability,
): TerasTone {
  switch (availability) {
    case "available":
      return "ok";
    case "blocked":
      return "danger";
    case "exception":
      return "warn";
    case "retired":
      return "muted";
    case "suspended":
      return "warn";
  }
}

export function modelProfileResolutionLabel(profile: ModelProfileRecord) {
  return profile.policy.upstreamModel === "pending-selection"
    ? "Pending Selection"
    : profile.policy.upstreamModel;
}

export function modelProjectionFreshnessTone(
  freshness: ModelProjectionFreshness,
): TerasTone {
  switch (freshness) {
    case "current":
      return "ok";
    case "stale":
      return "stale";
    case "unknown":
      return "muted";
  }
}

export function localExceptionRuntimeTone(
  runtime: LocalExceptionRuntimeProjection,
): TerasTone {
  switch (runtime.state) {
    case "available":
      return "ok";
    case "offline":
      return "danger";
    case "probing":
      return "warn";
    case "unknown":
      return "muted";
  }
}

export function localExceptionRuntimeMetadata(
  runtime: LocalExceptionRuntimeProjection,
): TerasMetadataItem[] {
  return [
    { label: "Provider", value: runtime.provider },
    { label: "Endpoint", value: runtime.endpoint },
    { label: "State", value: runtime.state },
    { label: "Observed", value: runtime.observedAt ?? "not observed" },
    { label: "Models", value: String(runtime.models.length) },
    { label: "Source", value: runtime.source.ref },
  ];
}

export function localExceptionRuntimeSummaryMetadata(
  runtime: LocalExceptionRuntimeProjection,
): TerasMetadataItem[] {
  return [
    { label: "Models", value: String(runtime.models.length) },
    { label: "Observed", value: runtime.observedAt ?? "not observed" },
  ];
}
