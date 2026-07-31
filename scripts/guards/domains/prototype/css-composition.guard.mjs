import {
  assertAppPathAbsent,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const prototypeRoot = "src/domain-workspaces/prototype";

export const guard = {
  id: "prototype/css-composition",
  run() {
    const failures = [];

    assertAppPathAbsent(
      failures,
      `${prototypeRoot}/prototype.module.css`,
      "Prototype uses Teras primitives and has no domain-local CSS exception",
    );

    for (const absoluteFilePath of walkFiles(prototypeRoot, [".css"])) {
      failures.push(
        `${relativeAppPath(absoluteFilePath)}: Prototype domain-local CSS is not approved; use Teras primitives or record a deliberate exception`,
      );
    }

    for (const absoluteFilePath of walkFiles(prototypeRoot, [".ts", ".tsx"])) {
      const relativePath = relativeAppPath(absoluteFilePath);
      const source = readAppFile(relativePath);

      if (source.includes(".module.css")) {
        failures.push(
          `${relativePath}: Prototype CSS import is not allowed here; use Teras primitives or add an approved local composition exception`,
        );
      }

      if (source.includes("styles.") || source.includes("className=") || source.includes("style={{")) {
        failures.push(
          `${relativePath}: Prototype must use Teras primitives instead of raw local styling chrome`,
        );
      }
    }

    return failures;
  },
};

export default guard;
