import {
  assertAppFile,
  assertAppPathAbsent,
  assertDomainOwnershipRoot,
} from "../../guard-lib.mjs";

const root = "src/domain-workspaces/repository";

export const guard = {
  id: "repository/source-structure",
  run() {
    const failures = [];

    assertDomainOwnershipRoot(failures, "repository", {
      allowedLayers: [
        "domain",
        "live-runtime",
        "local-runtime",
        "presentation",
        "read-model",
        "server",
        "work-model",
      ],
    });

    for (const path of [
      `${root}/domain/repository-types.ts`,
      `${root}/live-runtime/repository-custody-live-contract.ts`,
      `${root}/live-runtime/repository-custody-live-projection.ts`,
      `${root}/live-runtime/repository-custody-live-types.ts`,
      `${root}/live-runtime/use-repository-custody-live-runtime.ts`,
      `${root}/presentation/workspace/index.ts`,
      `${root}/presentation/workspace/workspace.tsx`,
      `${root}/presentation/workspace/workspace-contract.ts`,
      `${root}/presentation/surface/repository-control-surface.tsx`,
      `${root}/presentation/shared/repository-display-model.ts`,
      `${root}/presentation/shared/repository-control-projection.ts`,
      `${root}/presentation/surface/use-repository-control-controller.ts`,
      `${root}/presentation/dialogs/admission/repository-admission-dialog.tsx`,
      `${root}/read-model/repository-workspace-read-model.ts`,
      `${root}/read-model/activity-source.ts`,
      `${root}/read-model/attention-source.ts`,
      `${root}/work-model/ingress/proposal-repository-request-packet.ts`,
      `${root}/work-model/request/repository-request-model.ts`,
      `${root}/work-model/gate-resolution/repository-gate-resolution-model.ts`,
      `${root}/local-runtime/repository-runtime.ts`,
      `${root}/local-runtime/repository-effective-projection.ts`,
      `${root}/local-runtime/ingress/repository-ingress-runtime.ts`,
      `${root}/server/repository-custody-api-routes.ts`,
      `${root}/server/repository-custody-oos-client.ts`,
    ]) {
      assertAppFile(failures, path);
    }

    for (const legacyPath of [
      `${root}/model`,
      `${root}/runtime`,
      `${root}/surface`,
      `${root}/repository-workspace.tsx`,
      `${root}/presentation/surface/repository-workspace-view-model.ts`,
      `${root}/presentation/surface/repository-control-projections.ts`,
    ]) {
      assertAppPathAbsent(
        failures,
        legacyPath,
        "Repository implementation belongs under its ownership layer",
      );
    }

    return failures;
  },
};

export default guard;
