import {
  assertAppFile,
  assertAppPathAbsent,
  isFile,
  listDir,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const root = "src/domain-workspaces/delivery";
const readModelRoot = `${root}/read-model`;
const fixtureRoot = `${readModelRoot}/fixtures`;

export const guard = {
  id: "delivery/read-model",
  run() {
    const failures = [];

    for (const path of [
      `${readModelRoot}/delivery-read-model.ts`,
      `${readModelRoot}/projections/root-projection.ts`,
      `${readModelRoot}/selectors/delivery-attention-selector.ts`,
      `${readModelRoot}/selectors/workflow-package-selectors.ts`,
      `${readModelRoot}/terms/copy.ts`,
      `${root}/domain/delivery-audit.ts`,
      `${root}/domain/delivery-catalog.ts`,
      `${root}/domain/delivery-common.ts`,
      `${root}/domain/delivery-execution.ts`,
      `${root}/domain/delivery-intake.ts`,
      `${root}/domain/delivery-package.ts`,
      `${root}/domain/delivery-refinement.ts`,
      `${root}/domain/delivery-work-design.ts`,
      `${fixtureRoot}/packages/packages.fixture.ts`,
      `${fixtureRoot}/catalog/catalog.fixture.ts`,
      `${fixtureRoot}/board/board.fixture.ts`,
    ]) {
      assertAppFile(failures, path);
    }

    assertAppPathAbsent(
      failures,
      `${readModelRoot}/types`,
      "Delivery domain types live in the domain ownership layer",
    );

    for (const entry of listDir(fixtureRoot)) {
      const path = `${fixtureRoot}/${entry}`;
      if (isFile(path)) {
        failures.push(
          `${path}: fixture root must contain ownership folders only`,
        );
      }
    }

    for (const file of walkFiles(fixtureRoot, [".ts"])) {
      const path = relativeAppPath(file);
      if (!path.endsWith(".fixture.ts")) {
        failures.push(
          `${path}: fixture implementations must use the *.fixture.ts suffix`,
        );
      }
    }

    return failures;
  },
};

export default guard;
