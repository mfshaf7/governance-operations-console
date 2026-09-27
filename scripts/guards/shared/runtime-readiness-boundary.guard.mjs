import {
  assertAppFile,
  assertAppPathAbsent,
  assertIncludes,
  assertOmits,
  lineCount,
} from "../guard-lib.mjs";

const appRoute = "src/app/api/wsl-resources/route.ts";
const observationAppRoute = "src/app/api/runtime-observations/route.ts";
const publicBoundary = "src/runtime-readiness/index.ts";
const panel = "src/runtime-readiness/presentation/runtime-readiness-panel.tsx";
const telemetry = "src/runtime-readiness/state/use-wsl-resource-telemetry.ts";
const adapter = "src/runtime-readiness/server/wsl-resource-adapter.ts";
const route = "src/runtime-readiness/server/wsl-resource-route.ts";
const observationAdapter =
  "src/runtime-readiness/server/platform-runtime-observation-adapter.ts";
const observationRoute =
  "src/runtime-readiness/server/platform-runtime-observation-route.ts";
const observationState =
  "src/runtime-readiness/state/use-runtime-component-observations.ts";
const componentReadModel =
  "src/runtime-readiness/read-model/component-read-model.ts";
const alertReadModel =
  "src/runtime-readiness/read-model/runtime-alert-read-model.ts";
const focus =
  "src/runtime-readiness/presentation/runtime-focus-surfaces.tsx";
const fixture =
  "src/runtime-readiness/fixtures/runtime-readiness.fixture.ts";
const readModels = [
  componentReadModel,
  "src/runtime-readiness/read-model/resource-read-model.ts",
  alertReadModel,
  "src/runtime-readiness/read-model/runtime-readiness-scenarios.ts",
];

export const guard = {
  id: "shared/runtime-readiness-boundary",
  run() {
    const failures = [];

    for (const path of [
      appRoute,
      observationAppRoute,
      publicBoundary,
      "src/runtime-readiness/model/runtime-readiness-model.ts",
      fixture,
      ...readModels,
      telemetry,
      observationState,
      "src/runtime-readiness/presentation/runtime-readiness-support.tsx",
      focus,
      panel,
      adapter,
      route,
      observationAdapter,
      observationRoute,
    ]) {
      assertAppFile(failures, path);
    }

    assertAppPathAbsent(
      failures,
      "src/runtime-readiness/runtime-readiness.tsx",
      "presentation must remain inside its ownership folder",
    );
    assertAppPathAbsent(
      failures,
      "src/runtime-readiness/presentation/runtime-readiness.tsx",
      "focus and panel presentation must remain separated",
    );

    assertIncludes(failures, appRoute, [
      'export { GET } from "../../../runtime-readiness/server/wsl-resource-route"',
    ]);
    if (lineCount(appRoute) > 5) {
      failures.push(`${appRoute}: app route must remain a thin mount`);
    }
    assertIncludes(failures, observationAppRoute, [
      'from "../../../runtime-readiness/server/platform-runtime-observation-route"',
    ]);
    if (lineCount(observationAppRoute) > 5) {
      failures.push(`${observationAppRoute}: app route must remain a thin mount`);
    }

    assertIncludes(failures, route, ["readWslResourceSnapshot", "NextResponse.json"]);
    assertOmits(failures, route, ["readFileSync", "statfsSync", "os.loadavg"]);
    assertIncludes(failures, adapter, [
      "readWslResourceSnapshot",
      'readFileSync("/proc/stat"',
      'readFileSync("/proc/net/dev"',
      "uptimeSeconds",
      "os.uptime()",
    ]);
    assertOmits(failures, adapter, ["NextResponse", "className="]);
    assertIncludes(failures, observationAdapter, [
      "readRuntimeComponentProjection",
      "console-runtime-observations/v1",
      "platform-engineering",
      "0o600",
      "console_runtime_observation_replayed",
      "console_runtime_observation_conflict",
    ]);
    assertOmits(failures, observationAdapter, ["NextResponse", "className="]);
    assertIncludes(failures, observationRoute, [
      "readRuntimeComponentProjection",
      "unavailableRuntimeComponentProjection",
      "NextResponse.json",
    ]);
    assertIncludes(failures, observationState, [
      'fetch("/api/runtime-observations"',
      "disconnected-preview",
      "source-projected",
    ]);
    assertOmits(failures, observationState, ["NextResponse", "readFile"]);

    assertIncludes(failures, telemetry, [
      "useEffect",
      'fetch("/api/wsl-resources"',
      "calculateCpuPercent",
      "calculateNetworkRates",
      "resolveResourceTelemetryState",
    ]);
    assertOmits(failures, telemetry, ["className=", "NextResponse", "readFileSync"]);
    assertIncludes(failures, panel, [
      "useWslResourceTelemetry",
      "componentSourceError",
      "buildRuntimeAlerts",
      "buildResourceMetricDetail",
      'label: "Uptime"',
    ]);
    assertOmits(failures, panel, ['fetch("/api/wsl-resources"', "useRef", "readFileSync"]);
    assertIncludes(failures, fixture, [
      "componentObservations",
      "sourceAuthority",
      "sourceMode",
      "alertEligible",
    ]);
    assertIncludes(failures, componentReadModel, [
      "buildComponentObservationDetail",
      "No runtime health adapter connected",
    ]);
    assertOmits(failures, componentReadModel, [
      "ready to promote",
      "not promoted",
      "stage route pending",
      "prod route not assigned",
      "sampled 22s ago",
      "384 MiB",
      "18 KiB/s",
    ]);
    assertOmits(failures, alertReadModel, [
      "Governed AI assist blocked",
      "Governance readiness",
    ]);
    assertOmits(failures, focus, [
      "Run smoke",
      "View logs",
      "Create blocker",
      "Not wired",
      "ready to promote",
      "not promoted",
    ]);

    for (const path of readModels) {
      assertOmits(failures, path, [
        "useEffect",
        "useState",
        "className=",
        "NextResponse",
        "window.addEventListener",
        "window.setInterval",
      ]);
    }

    assertIncludes(failures, publicBoundary, [
      'from "./presentation/runtime-focus-surfaces"',
      'from "./presentation/runtime-readiness-panel"',
      "runtimeReadinessBoundary",
    ]);

    return failures;
  },
};

export default guard;
