import {
  assertAppFile,
  assertIncludes,
  assertOmits,
  readAppFile,
} from "../../guard-lib.mjs";

const orchestrationRoot = "src/domain-workspaces/orchestration";

export const guard = {
  id: "orchestration/workspace-ownership",
  run() {
    const failures = [];
    const workbenchHost =
      "src/operation-workbench/operation-workbench-host.tsx";
    const workspace =
      `${orchestrationRoot}/presentation/workspace/workspace.tsx`;
    const home =
      `${orchestrationRoot}/presentation/surfaces/home/orchestration-home-surface.tsx`;
    const definitions =
      `${orchestrationRoot}/presentation/surfaces/definitions/orchestration-definitions-surface.tsx`;
    const definitionDashboard =
      `${orchestrationRoot}/presentation/surfaces/definitions/dashboard/definition-dashboard-modal.tsx`;
    const runs =
      `${orchestrationRoot}/presentation/surfaces/runs/orchestration-runs-surface.tsx`;
    const runDashboard =
      `${orchestrationRoot}/presentation/surfaces/runs/dashboard/run-dashboard-modal.tsx`;

    for (const path of [
      workbenchHost,
      workspace,
      home,
      definitions,
      definitionDashboard,
      runs,
      runDashboard,
    ]) {
      assertAppFile(failures, path);
    }

    const hostSource = readAppFile(workbenchHost);
    const routeStart = hostSource.indexOf(
      'case "orchestration":',
    );
    const routeEnd = hostSource.indexOf(
      "return assertUnreachableOperationWorkbenchDomain(domain);",
      routeStart,
    );

    if (routeStart === -1 || routeEnd === -1) {
      failures.push(
        `${workbenchHost}: missing bounded Orchestration Workbench route block`,
      );
    } else {
      const routeBlock = hostSource.slice(routeStart, routeEnd);

      for (const term of [
        "getOrchestrationOperationWorkbenchContract",
        "<OperationWorkbench contract={contract}>",
        "<OrchestrationWorkspace",
      ]) {
        if (!routeBlock.includes(term)) {
          failures.push(
            `${workbenchHost}: Orchestration route block is missing "${term}"`,
          );
        }
      }

      for (const term of [
        "UndevelopedOperationDeskFocus",
        "legacy",
        "placeholder",
        "toggle",
      ]) {
        if (routeBlock.includes(term)) {
          failures.push(
            `${workbenchHost}: Orchestration direct-entry route must not include "${term}"`,
          );
        }
      }
    }

    assertIncludes(failures, workspace, [
      'height="fill"',
      'width="viewport"',
      "TerasFullscreenSurfaceFrame",
      "TerasSurfaceNav",
      "TerasSurfaceNavButton",
      "TerasSurfaceSummaryHeader",
      "OrchestrationHomeSurface",
      "OrchestrationDefinitionsSurface",
      "OrchestrationRunsSurface",
      "getOperationWorkbenchSurfaceAttributes",
    ]);
    assertOmits(failures, workspace, [
      "TerasEmptyState",
      "surfaceStatus",
      "orchestrationWorkspaceSurfaceStatus",
    ]);

    assertIncludes(failures, home, [
      "TerasPrimarySideLayout",
      "TerasSurfaceStatusPanel",
      "OrchestrationHomeAttentionPanel",
      "OrchestrationHomeInFlightPanel",
      "OrchestrationHomeMaterialEventsPanel",
    ]);

    for (const surfacePath of [definitions, runs]) {
      assertIncludes(failures, surfacePath, [
        "TerasRecordControlLayout",
        'mode="register-selected"',
        "TerasRegisterPanel",
        "TerasFilterBar",
        "TerasSelectedPanel",
        'variant="rich"',
      ]);
    }

    for (const dashboardPath of [definitionDashboard, runDashboard]) {
      assertIncludes(failures, dashboardPath, [
        "TerasContentFrame fill",
        'TerasZoneLayout variant="main-support"',
        'TerasList fit="fill"',
      ]);
    }

    return failures;
  },
};

export default guard;
