import {
  assertAppFile,
  assertAppPathAbsent,
  assertIncludes,
  assertOmits,
  assertRepoIncludes,
  importSpecifiers,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../guard-lib.mjs";

const root = "src/lifecycle-transitions";
const routeRegistry = `${root}/model/lifecycle-transition-routes.ts`;
const workspace =
  `${root}/presentation/workspace/lifecycle-transitions-workspace.tsx`;
const workspaceSurface =
  `${root}/presentation/workspace/lifecycle-transitions-workspace-surface.tsx`;
const register =
  `${root}/presentation/workspace/lifecycle-transition-register.tsx`;
const selected =
  `${root}/presentation/workspace/lifecycle-transition-selected.tsx`;
const ownerRoute =
  `${root}/routing/lifecycle-transition-owner-route.ts`;

export const guard = {
  id: "shared/lifecycle-transitions-boundary",
  run() {
    const failures = [];

    for (const path of [
      `${root}/index.ts`,
      `${root}/fixtures/lifecycle-transition-artifacts.fixture.ts`,
      `${root}/fixtures/lifecycle-transition-projections.fixture.ts`,
      `${root}/model/lifecycle-transition-artifacts.ts`,
      routeRegistry,
      `${root}/model/lifecycle-transition-types.ts`,
      `${root}/presentation/lifecycle-transition-overview-view-model.ts`,
      workspace,
      workspaceSurface,
      register,
      selected,
      `${root}/read-model/lifecycle-transition-projector.ts`,
      `${root}/read-model/lifecycle-transition-reducer.ts`,
      ownerRoute,
    ]) {
      assertAppFile(failures, path);
    }

    for (const path of [
      "src/movement-control",
      `${root}/presentation/lifecycle-transitions-panel.tsx`,
      `${root}/presentation/lifecycle-transition-detail-tray.tsx`,
      `${root}/presentation/use-lifecycle-transition-panel-state.ts`,
      `${root}/presentation/lifecycle-transitions-panel.module.css`,
    ]) {
      assertAppPathAbsent(
        failures,
        path,
        "Lifecycle Transitions uses only the dedicated workspace",
      );
    }

    assertIncludes(failures, routeRegistry, [
      '"proposal-to-prototype"',
      '"proposal-to-delivery"',
      '"prototype-to-delivery"',
      'completionEvidence: "target-admission-receipt"',
      'completionEvidence: "target-application-receipt"',
    ]);
    assertOmits(failures, routeRegistry, [
      "proposal-to-portfolio",
      "prototype-to-portfolio",
      "delivery-to-platform",
    ]);

    assertIncludes(failures, workspace, [
      "TerasModalShell",
      "TerasFullscreenSurfaceFrame",
      "TerasSurfaceNav",
      "TerasSurfaceSummaryHeader",
      "LifecycleTransitionsWorkspaceSurface",
    ]);
    assertIncludes(failures, workspaceSurface, [
      "TerasRecordControlLayout",
      "TerasRegisterPanel",
      "TerasFilterBar",
      "LifecycleTransitionRegister",
      "LifecycleTransitionSelected",
    ]);
    assertIncludes(failures, register, [
      "TerasRecordTable",
      "TerasStatusPill",
    ]);
    assertIncludes(failures, selected, [
      "TerasSelectedPanel",
      "TerasTimeline",
      "resolveLifecycleTransitionWorkbenchRoute",
      "onOpenWorkbenchSurface",
    ]);
    assertIncludes(failures, ownerRoute, [
      "operationWorkbenchPathLabels.proposal",
      "operationWorkbenchPathLabels.prototype",
      "operationWorkbenchPathLabels.delivery",
      "operationWorkbenchPathLabels.orchestration",
      'kind: "unavailable"',
    ]);
    assertOmits(failures, ownerRoute, [
      "operationWorkbenchPathLabels.portfolio",
      "operationWorkbenchPathLabels.repository",
    ]);

    assertIncludes(failures, `${root}/index.ts`, [
      'id: "lifecycle-transitions"',
      "correlated cross-domain transition status",
      "source or target domain mutation",
      "authority decisions",
      "target adapter execution",
    ]);
    assertOmits(failures, "src/app/globals.css", [
      ".lane-card",
      ".lane-detail",
      ".movement-decision",
    ]);
    assertRepoIncludes(
      failures,
      "docs/product/surface-contracts/lifecycle-transitions.md",
      [
        "dedicated full-viewport Lifecycle Transitions Teras workspace",
        "routing links to the authority that owns the next action",
        "Actions remain in the source domain",
      ],
    );

    for (const file of walkFiles(root, [".ts", ".tsx", ".css"])) {
      const path = relativeAppPath(file);
      const source = readAppFile(path);

      if (path.endsWith(".css")) {
        failures.push(
          `${path}: Lifecycle Transitions must compose Teras without local CSS`,
        );
      }

      for (const specifier of importSpecifiers(source)) {
        if (specifier.includes("domain-workspaces")) {
          failures.push(
            `${path}: shared Lifecycle Transitions must not import an Operation Workbench domain implementation`,
          );
        }
      }
    }

    return failures;
  },
};

export default guard;
