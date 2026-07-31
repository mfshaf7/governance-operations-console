import {
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const portfolioRoot = "src/domain-workspaces/portfolio";

export const guard = {
  id: "portfolio/css-composition",
  run() {
    const failures = [];

    for (const absoluteFilePath of walkFiles(portfolioRoot, [".ts", ".tsx"])) {
      const filePath = relativeAppPath(absoluteFilePath);
      const source = readAppFile(filePath);

      if (source.includes(".module.css") || source.includes("styles.")) {
        failures.push(
          `${filePath}: Portfolio must use Teras primitives instead of local CSS module styling`,
        );
      }

      if (
        source.includes("className=") ||
        source.includes("style={{")
      ) {
        failures.push(
          `${filePath}: Portfolio must not recreate Teras chrome through local className or inline style`,
        );
      }
    }

    return failures;
  },
};

export default guard;
