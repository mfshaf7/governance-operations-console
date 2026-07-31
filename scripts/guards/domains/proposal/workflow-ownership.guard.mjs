import {
  assertAppFile,
  assertAppPathAbsent,
  assertOmits,
  assertRepoIncludes,
  readAppFile,
} from "../../guard-lib.mjs";

const proposalRoot = "src/domain-workspaces/proposal";
const proposalContract =
  "docs/product/domain-contracts/proposal.md";

function assertWorkflowZoneColumns(failures, path) {
  const source = readAppFile(path);
  const marker = '<TerasZoneLayout variant="main-aside">';
  let searchOffset = 0;

  if (!source.includes(marker)) {
    failures.push(
      `${path}: workflow modal body must use TerasZoneLayout variant="main-aside"`,
    );
  }

  if (source.includes('variant="workflow"') || source.includes('variant="flow"')) {
    failures.push(
      `${path}: workflow modal body must use current TerasZoneLayout variant="main-aside"`,
    );
  }

  while (source.indexOf(marker, searchOffset) !== -1) {
    const layoutStart = source.indexOf(marker, searchOffset);
    const afterLayout = source.slice(layoutStart + marker.length);
    const firstLines = afterLayout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const firstChild = firstLines[0] ?? "";

    if (!firstChild.startsWith("<TerasZone")) {
      failures.push(
        `${path}: workflow modal body must use TerasZone as the direct child of TerasZoneLayout`,
      );
    }

    const firstZoneCloseOffset = afterLayout.indexOf("</TerasZone>");

    if (firstZoneCloseOffset === -1) {
      failures.push(
        `${path}: workflow modal body must expose both workflow zones`,
      );
      searchOffset = layoutStart + marker.length;
      continue;
    }

    const afterFirstColumn = afterLayout.slice(
      firstZoneCloseOffset + "</TerasZone>".length,
    );
    const nextLines = afterFirstColumn
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const nextChild = nextLines[0] ?? "";

    if (!nextChild.startsWith("<TerasZone")) {
      failures.push(
        `${path}: workflow modal body must keep the second direct zone as TerasZone`,
      );
    }

    searchOffset = layoutStart + marker.length;
  }
}

export const guard = {
  id: "proposal/workflow-ownership",
  run() {
    const failures = [];

    assertRepoIncludes(failures, proposalContract, [
      "Workflow step modal bodies use `TerasZoneLayout variant=\"main-aside\"`",
      "`TerasZone` as the direct children",
      "Step-specific stacked content",
      "belong inside a zone",
    ]);

    for (const requiredPath of [
      `${proposalRoot}/work-model/proposal-disposition-model.ts`,
      `${proposalRoot}/work-model/proposal-handoff-model.ts`,
      `${proposalRoot}/work-model/proposal-source-projection-model.ts`,
      `${proposalRoot}/work-model/proposal-triage-model.ts`,
      `${proposalRoot}/work-model/proposal-workflow-command-model.ts`,
      `${proposalRoot}/work-model/proposal-workflow-navigation.ts`,
      `${proposalRoot}/work-model/proposal-workflow-step-model.ts`,
      `${proposalRoot}/presentation/workflows/session/proposal-workflow-footer.tsx`,
      `${proposalRoot}/presentation/workflows/session/proposal-workflow-progress-panel.tsx`,
      `${proposalRoot}/presentation/workflows/session/use-proposal-workflow-drafts.ts`,
      `${proposalRoot}/presentation/workflows/session/proposal-workflow-session-controller-types.ts`,
      `${proposalRoot}/presentation/workflows/session/proposal-workflow-session-controller.ts`,
      `${proposalRoot}/presentation/workflows/steps/triage/proposal-triage-step-view-model.ts`,
      `${proposalRoot}/presentation/workflows/steps/triage/proposal-triage-step.tsx`,
      `${proposalRoot}/presentation/workflows/steps/disposition/proposal-disposition-decision-panel.tsx`,
      `${proposalRoot}/presentation/workflows/steps/disposition/proposal-disposition-route-panel.tsx`,
      `${proposalRoot}/presentation/workflows/steps/disposition/proposal-disposition-step.tsx`,
      `${proposalRoot}/presentation/workflows/steps/handoff/proposal-handoff-apply-panel.tsx`,
      `${proposalRoot}/presentation/workflows/steps/handoff/proposal-handoff-repository-gate-panel.tsx`,
      `${proposalRoot}/presentation/workflows/steps/handoff/proposal-handoff-route-state-panel.tsx`,
      `${proposalRoot}/presentation/workflows/steps/handoff/proposal-handoff-step.tsx`,
      `${proposalRoot}/presentation/workflows/steps/history/proposal-history-step.tsx`,
    ]) {
      assertAppFile(failures, requiredPath);
    }

    for (const path of [
      `${proposalRoot}/presentation/workflows/steps/triage/proposal-triage-step.tsx`,
      `${proposalRoot}/presentation/workflows/steps/handoff/proposal-handoff-step.tsx`,
      `${proposalRoot}/presentation/workflows/steps/history/proposal-history-step.tsx`,
      `${proposalRoot}/presentation/workflows/session/proposal-workflow-session-controller.ts`,
      `${proposalRoot}/presentation/workflows/session/use-proposal-workflow-drafts.ts`,
      `src/domain-workspaces/operation-integrations/proposal-prototype-entry-projection.ts`,
    ]) {
      assertOmits(failures, path, [
        "proposal-triage-modal.tsx",
        "proposal-handoff-modal.tsx",
      ]);
    }

    for (const path of [
      `${proposalRoot}/presentation/workflows/session/proposal-workflow-progress-panel.tsx`,
      `${proposalRoot}/presentation/workflows/steps/disposition/proposal-disposition-step.tsx`,
      `${proposalRoot}/presentation/workflows/steps/handoff/proposal-handoff-step.tsx`,
    ]) {
      assertOmits(failures, path, [
        "proposalTriageProgress",
        "proposalTriageStepList",
        "proposalTriageColumn",
        "proposalTriagePanel",
        "proposalTriageDraftPanel",
        "proposalTriageSummaryField",
        "proposalTriageAdvisorColumn",
      ]);
    }

    for (const workflowStepPath of [
      `${proposalRoot}/presentation/workflows/steps/triage/proposal-triage-step.tsx`,
      `${proposalRoot}/presentation/workflows/steps/disposition/proposal-disposition-step.tsx`,
      `${proposalRoot}/presentation/workflows/steps/handoff/proposal-handoff-step.tsx`,
      `${proposalRoot}/presentation/workflows/steps/history/proposal-history-step.tsx`,
    ]) {
      assertWorkflowZoneColumns(failures, workflowStepPath);
    }

    for (const internalBarrelPath of [
      `${proposalRoot}/local-runtime/index.ts`,
      `${proposalRoot}/presentation/dialogs/index.ts`,
      `${proposalRoot}/presentation/dialogs/capture/index.ts`,
      `${proposalRoot}/presentation/dialogs/details/index.ts`,
      `${proposalRoot}/presentation/hub/index.ts`,
      `${proposalRoot}/presentation/surface/index.ts`,
      `${proposalRoot}/presentation/workflows/index.ts`,
      `${proposalRoot}/presentation/workflows/session/index.ts`,
      `${proposalRoot}/presentation/workflows/steps/index.ts`,
      `${proposalRoot}/read-model/index.ts`,
      `${proposalRoot}/work-model/index.ts`,
    ]) {
      assertAppPathAbsent(
        failures,
        internalBarrelPath,
        "Proposal internal ownership folders should use concrete imports until a true public boundary is needed",
      );
    }

    return failures;
  },
};

export default guard;
