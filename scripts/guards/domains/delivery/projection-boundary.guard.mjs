import {
  assertAppFile,
  assertIncludes,
  assertOmits,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const root = "src/domain-workspaces/delivery";
const fixtureRoot = `${root}/read-model/fixtures/`;
const terminalSourceAssignments = [
  'backend_status: "done"',
  'backend_status: "retired"',
  'package_posture: "Done"',
  'package_posture: "Retired"',
];

export const guard = {
  id: "delivery/projection-boundary",
  run() {
    const failures = [];
    const packageModel = `${root}/domain/delivery-package.ts`;
    const packageProjection =
      `${root}/domain/delivery-package-posture.ts`;
    const effectiveProjection =
      `${root}/local-runtime/projections/delivery-effective-projection.ts`;
    const transitionRecord =
      `${root}/local-runtime/transitions/transition-record.ts`;
    const summaryModel =
      `${root}/presentation/workspace/workspace-summary-model.ts`;
    const controller =
      `${root}/presentation/workspace/workspace-controller.tsx`;
    const workDesignLiveContract =
      `${root}/live-runtime/work-design-live-contract.ts`;
    const workDesignLiveRuntime =
      `${root}/live-runtime/use-work-design-live-runtime.ts`;
    const workDesignServerRoutes =
      `${root}/server/work-design-api-routes.ts`;
    const workDesignOosClient =
      `${root}/server/work-design-oos-client.ts`;

    for (const path of [
      packageModel,
      packageProjection,
      effectiveProjection,
      transitionRecord,
      summaryModel,
      controller,
      workDesignLiveContract,
      workDesignLiveRuntime,
      workDesignServerRoutes,
      workDesignOosClient,
    ]) {
      assertAppFile(failures, path);
    }

    assertIncludes(failures, packageModel, [
      "DeliveryLocalWorkflowProjection",
      "local_workflow_projection",
      'authority: "prototype-local"',
    ]);
    assertIncludes(failures, packageProjection, [
      "getDeliveryEffectivePackageProjection",
      "getDeliveryEffectivePackagePosture",
      "refinementReceipt",
    ]);
    assertIncludes(failures, effectiveProjection, [
      "projectDeliveryEffectiveReadModel",
    ]);
    assertIncludes(failures, transitionRecord, [
      "deliveryIntakeSourceVersion",
      "deliveryPackageSourceVersion",
      "sourceRecordVersion",
    ]);
    for (const path of [
      `${root}/local-runtime/transitions/execution-transition.ts`,
      `${root}/local-runtime/transitions/intake-transition.ts`,
      `${root}/local-runtime/transitions/refinement-transition.ts`,
      `${root}/local-runtime/transitions/work-design-transition.ts`,
    ]) {
      assertIncludes(failures, path, ["sourceRecordVersion"]);
    }
    assertIncludes(failures, summaryModel, [
      "effectivePackagePosture",
      "getDeliveryEffectivePackagePosture",
      "getExecutionBoardPackages",
    ]);
    assertOmits(failures, summaryModel, [
      "model.board_summary",
      "summary.by_posture",
      "summary.blocked_count",
    ]);
    assertIncludes(failures, controller, [
      "projectDeliveryEffectiveReadModel",
      "runtimeProjection: localProjection",
    ]);
    assertIncludes(failures, workDesignLiveContract, [
      "workDesignLivePackageRef",
      "workDesignLiveIdentity",
      "assertWorkDesignOosProjection",
      "assertWorkDesignOosApplyResult",
    ]);
    assertIncludes(failures, workDesignLiveRuntime, [
      'fetch(',
      "/api/delivery/work-design/",
      'mode: "live"',
      "work_design_projection_unavailable",
    ]);
    assertOmits(failures, workDesignLiveRuntime, [
      "OOS_BASE_URL",
      "OOS_CALLER_SECRET",
      "x-oos-caller-secret",
      "process.env",
    ]);
    assertIncludes(failures, workDesignServerRoutes, [
      'mode: "disconnected-preview"',
      "workDesignOosConfigured",
      "applyWorkDesignDraft",
    ]);
    assertIncludes(failures, workDesignOosClient, [
      '"x-oos-caller-id"',
      '"x-oos-caller-secret"',
      "GOVERNANCE_CONSOLE_OPERATOR_ID",
      "AbortSignal.timeout",
      'cache: "no-store"',
    ]);
    assertOmits(failures, workDesignOosClient, [
      'mode: "disconnected-preview"',
      "localStorage",
    ]);

    for (const path of [
      `${root}/read-model/selectors/delivery-attention-selector.ts`,
      `${root}/presentation/package-register/package-register-view-model.ts`,
      `${root}/presentation/surfaces/execution-board/execution-board-surface.tsx`,
      `${root}/presentation/surfaces/execution-board/execution-selected-package-panel.tsx`,
      `${root}/presentation/workflows/refinement/view-model/refinement-hub-model.ts`,
      `${root}/product-adapters/control-board/delivery-control-board-adapter.ts`,
    ]) {
      assertIncludes(failures, path, [
        "getDeliveryEffectivePackageProjection",
      ]);
    }
    assertIncludes(
      failures,
      `${root}/read-model/selectors/workflow-package-selectors.ts`,
      ["getDeliveryEffectivePackagePosture"],
    );

    assertOmits(
      failures,
      `${root}/presentation/workflows/shared/package-actions/package-action-routing.ts`,
      [
        "refinement_packet?.receipt",
        "refinement_packet?.status",
      ],
    );

    for (const file of walkFiles(root, [".ts", ".tsx"])) {
      const path = relativeAppPath(file);
      if (path.startsWith(fixtureRoot)) {
        continue;
      }

      const source = readAppFile(path);
      for (const assignment of terminalSourceAssignments) {
        if (source.includes(assignment)) {
          failures.push(
            `${path}: terminal backend posture belongs to source fixtures or a future backend projection`,
          );
        }
      }
    }

    return failures;
  },
};

export default guard;
