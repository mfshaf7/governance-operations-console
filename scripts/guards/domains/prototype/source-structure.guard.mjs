import {
  assertAppFile,
  assertAppPathAbsent,
  assertDomainOwnershipRoot,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const root = "src/domain-workspaces/prototype";
const staleTerms = [
  "PrototypeWorkspaceSurface",
  "Prototype Hub",
  "Preview Control",
  "legacy comparison",
  "prebaseline",
];

export const guard = {
  id: "prototype/source-structure",
  run() {
    const failures = [];

    assertDomainOwnershipRoot(failures, "prototype", {
      allowedLayers: [
        "domain",
        "local-runtime",
        "presentation",
        "read-model",
        "work-model",
      ],
    });

    for (const path of [
      `${root}/domain/prototype-types.ts`,
      `${root}/domain/prototype-movement-state.ts`,
      `${root}/domain/support/prototype-setup-profile-model.ts`,
      `${root}/presentation/workspace/index.ts`,
      `${root}/presentation/workspace/workspace.tsx`,
      `${root}/presentation/workspace/workspace-contract.ts`,
      `${root}/presentation/shared/prototype-record-display-model.ts`,
      `${root}/presentation/surface/prototype-control-surface.tsx`,
      `${root}/presentation/surface/use-prototype-control-controller.ts`,
      `${root}/presentation/dashboards/prototype-dashboard/prototype-dashboard-modal.tsx`,
      `${root}/presentation/dashboards/preview-runtime/prototype-preview-runtime-modal.tsx`,
      `${root}/presentation/workflows/landing/prototype-landing-modal.tsx`,
      `${root}/presentation/workflows/baseline-promotion/prototype-baseline-promotion-modal.tsx`,
      `${root}/read-model/prototype-workspace-read-model.ts`,
      `${root}/read-model/activity-source.ts`,
      `${root}/read-model/attention-source.ts`,
      "src/domain-workspaces/operation-contracts/prototype-movement-request.ts",
      `${root}/work-model/entry/prototype-entry-packet.ts`,
      `${root}/work-model/workflows/landing/prototype-landing-model.ts`,
      `${root}/work-model/workflows/baseline-promotion/prototype-baseline-promotion-model.ts`,
      `${root}/local-runtime/prototype-runtime.ts`,
      `${root}/local-runtime/prototype-effective-projection.ts`,
    ]) {
      assertAppFile(failures, path);
    }

    for (const legacyPath of [
      `${root}/dashboard`,
      `${root}/history`,
      `${root}/preview-runtime`,
      `${root}/request`,
      `${root}/prototype-workspace.tsx`,
      `${root}/presentation/workspace/prototype-record-view-model.ts`,
    ]) {
      assertAppPathAbsent(
        failures,
        legacyPath,
        "Prototype implementation belongs under its ownership layer",
      );
    }

    for (const file of walkFiles(root, [".ts", ".tsx"])) {
      const path = relativeAppPath(file);
      const source = readAppFile(path);

      for (const term of staleTerms) {
        if (source.includes(term)) {
          failures.push(`${path}: must not include stale token "${term}"`);
        }
      }
    }

    return failures;
  },
};

export default guard;
