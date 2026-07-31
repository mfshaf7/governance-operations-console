import {
  assertAppPathAbsent,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const repositoryRoot = "src/domain-workspaces/repository";

export const guard = {
  id: "repository/css-composition",
  run() {
    const failures = [];

    assertAppPathAbsent(
      failures,
      `${repositoryRoot}/repository-workspace.module.css`,
      "Repository local CSS must not live at the domain root",
    );

    for (const absoluteFilePath of walkFiles(repositoryRoot, [".ts", ".tsx"])) {
      const filePath = relativeAppPath(absoluteFilePath);
      const source = readAppFile(filePath);

      if (source.includes(".module.css")) {
        failures.push(
          `${filePath}: Repository uses Teras primitives directly and must not import local CSS`,
        );
      }

      if (source.includes("styles.") || source.includes("className=") || source.includes("style={{")) {
        failures.push(
          `${filePath}: Repository must not recreate Teras chrome through local className styling`,
        );
      }
    }

    return failures;
  },
};

export default guard;
