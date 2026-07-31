import {
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const orchestrationRoot = "src/domain-workspaces/orchestration";

export const guard = {
  id: "orchestration/css-composition",
  run() {
    const failures = [];

    for (const absolutePath of walkFiles(orchestrationRoot, [".css"])) {
      failures.push(
        `${relativeAppPath(absolutePath)}: Orchestration has no approved domain-local CSS exception`,
      );
    }

    for (const absolutePath of walkFiles(orchestrationRoot, [".ts", ".tsx"])) {
      const filePath = relativeAppPath(absolutePath);
      const source = readAppFile(filePath);

      if (
        source.includes(".module.css") ||
        source.includes("styles.") ||
        source.includes("className=") ||
        source.includes("style={{")
      ) {
        failures.push(
          `${filePath}: Orchestration must use Teras primitives instead of raw local styling chrome`,
        );
      }
    }

    return failures;
  },
};

export default guard;
