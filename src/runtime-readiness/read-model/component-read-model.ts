import type {
  RuntimeComponentObservation,
  Tone,
} from "../model/runtime-readiness-model.ts";
import { parseExternalConsoleRoute } from "../../console-integration/external-route.ts";

function alertEligibilityLabel(component: RuntimeComponentObservation) {
  if (component.sourceMode === "synthetic-scenario") {
    return "excluded from alerts";
  }

  return component.alertEligible
    ? "eligible"
    : "observation unavailable";
}

export function buildComponentObservationDetail(
  component: RuntimeComponentObservation,
) {
  const observationTone: Tone =
    component.freshness === "unavailable" ? "muted" : component.tone;

  return {
    accessHref: parseExternalConsoleRoute(component.href)
      ? component.href
      : null,
    coverageRows: [
      {
        label: "Authority",
        tone: "info" as Tone,
        value: component.sourceAuthority,
      },
      {
        label: "Source reference",
        tone: "muted" as Tone,
        value: component.sourceRef,
      },
      {
        label: "Alert eligibility",
        tone: component.alertEligible ? ("ok" as Tone) : ("muted" as Tone),
        value: alertEligibilityLabel(component),
      },
      {
        label: "Boundary",
        tone: "muted" as Tone,
        value:
          component.sourceMode === "unavailable"
            ? "No runtime health adapter connected"
            : "Read-only runtime observation",
      },
    ],
    facts: [
      { label: "Environment", value: component.environment },
      { label: "Source mode", value: component.sourceMode },
      { label: "Freshness", value: component.freshness },
    ],
    observationRows: [
      {
        label: "Status",
        tone: observationTone,
        value: component.status,
      },
      {
        label: "Declared route",
        tone: component.href ? ("info" as Tone) : ("muted" as Tone),
        value: component.surface,
      },
      {
        label: "Observed",
        tone: component.observedAt ? observationTone : ("muted" as Tone),
        value: component.observedAt ?? "not observed",
      },
      {
        label: "Freshness",
        tone: observationTone,
        value: component.freshness,
      },
    ],
    status: component.status,
    tone: observationTone,
  };
}
