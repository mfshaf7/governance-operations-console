import {
  assertAppFile,
  assertAppPathAbsent,
  assertDomainOwnershipRoot,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const root = "src/domain-workspaces/orchestration";
const staleTerms = [
  "UndevelopedOperationDeskFocus",
  "comparison toggle",
  "legacy comparison",
  "monitoring-only",
  "orchestrationWorkspaceSurfaceStatus",
];

export const guard = {
  id: "orchestration/source-structure",
  run() {
    const failures = [];

    assertDomainOwnershipRoot(failures, "orchestration", {
      allowedLayers: [
        "domain",
        "local-runtime",
        "presentation",
        "read-model",
        "work-model",
      ],
    });

    for (const path of [
      `${root}/domain/orchestration-definition-types.ts`,
      `${root}/domain/orchestration-run-types.ts`,
      `${root}/presentation/workspace/index.ts`,
      `${root}/presentation/workspace/workspace.tsx`,
      `${root}/presentation/workspace/workspace-contract.ts`,
      `${root}/presentation/surfaces/home/orchestration-home-surface.tsx`,
      `${root}/presentation/surfaces/definitions/orchestration-definitions-surface.tsx`,
      `${root}/presentation/surfaces/runs/orchestration-runs-surface.tsx`,
      `${root}/presentation/workflows/definition-design/definition-design-workflow.tsx`,
      `${root}/read-model/workspace/orchestration-workspace-read-model.ts`,
      `${root}/read-model/activity-source.ts`,
      `${root}/read-model/attention-source.ts`,
      `${root}/work-model/definition-design/definition-design-model.ts`,
      `${root}/work-model/run-control/run-control-model.ts`,
      `${root}/local-runtime/orchestration-workspace-runtime.ts`,
      `${root}/local-runtime/orchestration-effective-projection.ts`,
    ]) {
      assertAppFile(failures, path);
    }

    for (const legacyPath of [
      `${root}/presentation/shared`,
      `${root}/presentation/package-register`,
    ]) {
      assertAppPathAbsent(
        failures,
        legacyPath,
        "Orchestration uses its named surface and workflow ownership folders",
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
