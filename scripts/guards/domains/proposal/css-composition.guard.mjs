import {
  assertAppPathAbsent,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const proposalRoot = "src/domain-workspaces/proposal";
const proposalCssPath = `${proposalRoot}/proposal-workspace.module.css`;

export const guard = {
  id: "proposal/css-composition",
  run() {
    const failures = [];

    assertAppPathAbsent(
      failures,
      proposalCssPath,
      "Proposal is normalized to Teras primitives and should not keep placeholder local CSS",
    );

    for (const absoluteFilePath of walkFiles(proposalRoot, [".ts", ".tsx"])) {
      const filePath = relativeAppPath(absoluteFilePath);
      const source = readAppFile(filePath);

      if (source.includes(".module.css") || source.includes("styles.")) {
        failures.push(
          `${filePath}: Proposal source should use Teras primitives instead of local CSS module styling`,
        );
      }

      if (source.includes("className=") || source.includes("style={{")) {
        failures.push(
          `${filePath}: Proposal source should use Teras primitives instead of local className or inline style chrome`,
        );
      }
    }

    return failures;
  },
};

export default guard;
