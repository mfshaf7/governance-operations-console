import type { ConsoleBoundary } from "../console-architecture";

export {
  AlertDetailFocus,
  ComponentDetailFocus,
  ResourceMetricFocus,
} from "./presentation/runtime-focus-surfaces";
export { WslResourceUsage } from "./presentation/runtime-readiness-panel";
export { useRuntimeComponentObservations } from "./state/use-runtime-component-observations";
export {
  componentStatusScenarios,
  resourceUsageScenarios,
} from "./read-model/runtime-readiness-scenarios";

export type {
  ComponentStatusScenario,
  ResourceMetricDetail,
  ResourceUsageScenario,
  RuntimeAlertItem,
  RuntimeComponentObservation,
  Tone,
} from "./model/runtime-readiness-model";

export const runtimeReadinessBoundary: ConsoleBoundary = {
  id: "runtime-readiness",
  mustNotOwn: [
    "domain record mutation",
    "movement approval",
    "model invocation authority",
  ],
  owns: [
    "local WSL resource telemetry",
    "declared component observation catalog",
    "bounded Platform runtime observation consumption",
    "source-qualified advisory runtime alerts",
  ],
  status: "active-contract",
};
