import {
  readRepoFile,
  repoPathExists,
} from "../guard-lib.mjs";

const operationWorkbenchContract =
  "docs/product/operation-workbench-contract.md";

const requiredTerms = [
  "## Canonical Operation Surface Modes",
  "choose a surface mode by domain shape",
  "Full Workspace Mode",
  "Delivery is the current reference",
  "Compact Control Mode",
  "Proposal is the current reference",
  "Compact Control With Dashboard Extensions",
  "an extension of Compact Control",
  "## Operation Source Grammar",
  "Domain root layers",
  "Public boundary rules",
  "Full Workspace Mode presentation grammar",
  "File role naming",
  "product-app host folders",
  "presentation/dialogs/",
  "presentation/dashboards/",
  "Raw styling is not an accepted shortcut",
  "Duplicating an existing primitive with local styling is not acceptable",
  "surface only as a temporary comparison path",
  "legacy path and stale mock data must be removed",
];

export const guard = {
  id: "shared/operation-workbench-contract",
  run() {
    const failures = [];

    if (!repoPathExists(operationWorkbenchContract)) {
      return [`${operationWorkbenchContract}: missing operation contract`];
    }

    const source = readRepoFile(operationWorkbenchContract);

    for (const term of requiredTerms) {
      if (!source.includes(term)) {
        failures.push(
          `${operationWorkbenchContract}: missing required mode taxonomy token "${term}"`,
        );
      }
    }

    return failures;
  },
};

export default guard;
