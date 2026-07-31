import {
  assertAppPathAbsent,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const modelOperationsRoot = "src/domain-workspaces/model-operations";

export const guard = {
  id: "model-operations/css-composition",
  run() {
    const failures = [];

    assertAppPathAbsent(
      failures,
      `${modelOperationsRoot}/model-operations.module.css`,
      "Model Operations uses Teras primitives and has no local CSS exception",
    );

    for (const absoluteFilePath of walkFiles(modelOperationsRoot, [".css"])) {
      failures.push(
        `${relativeAppPath(absoluteFilePath)}: Model Operations domain-local CSS is not approved`,
      );
    }

    for (const absoluteFilePath of walkFiles(
      modelOperationsRoot,
      [".ts", ".tsx"],
    )) {
      const relativePath = relativeAppPath(absoluteFilePath);
      const source = readAppFile(relativePath);

      if (
        source.includes(".module.css") ||
        source.includes("styles.") ||
        source.includes("className=") ||
        source.includes("style={{")
      ) {
        failures.push(
          `${relativePath}: Model Operations must use Teras primitives instead of raw local styling`,
        );
      }
    }

    return failures;
  },
};

export default guard;
