import {
  assertAppFile,
  assertAppPathAbsent,
  assertDomainOwnershipRoot,
} from "../../guard-lib.mjs";

const root = "src/domain-workspaces/proposal";

export const guard = {
  id: "proposal/source-structure",
  run() {
    const failures = [];

    assertDomainOwnershipRoot(failures, "proposal", {
      allowedLayers: [
        "domain",
        "local-runtime",
        "presentation",
        "read-model",
        "work-model",
      ],
    });

    for (const path of [
      `${root}/domain/proposal-types.ts`,
      `${root}/presentation/workspace/index.ts`,
      `${root}/presentation/workspace/workspace.tsx`,
      `${root}/presentation/workspace/workspace-contract.ts`,
      `${root}/presentation/surface/proposal-control-surface.tsx`,
      `${root}/presentation/shared/proposal-display-model.ts`,
      `${root}/presentation/surface/use-proposal-control-controller.ts`,
      `${root}/presentation/hub/proposal-hub-modal.tsx`,
      `${root}/presentation/hub/proposal-hub-view-model.ts`,
      `${root}/presentation/workflows/session/use-proposal-workflow-drafts.ts`,
      `${root}/read-model/proposal-workspace-read-model.ts`,
      `${root}/read-model/activity-source.ts`,
      `${root}/read-model/attention-source.ts`,
      `${root}/work-model/proposal-triage-model.ts`,
      `${root}/work-model/proposal-disposition-model.ts`,
      `${root}/work-model/proposal-handoff-model.ts`,
      `${root}/work-model/proposal-workflow-command-model.ts`,
      `${root}/local-runtime/proposal-runtime.ts`,
      `${root}/local-runtime/proposal-effective-projection.ts`,
    ]) {
      assertAppFile(failures, path);
    }

    for (const legacyPath of [
      `${root}/model`,
      `${root}/runtime`,
      `${root}/surface`,
      `${root}/proposal-workspace.tsx`,
      `${root}/presentation/surface/proposal-workspace-view-model.ts`,
    ]) {
      assertAppPathAbsent(
        failures,
        legacyPath,
        "Proposal uses ownership layers and neutral operation integrations",
      );
    }

    return failures;
  },
};

export default guard;
