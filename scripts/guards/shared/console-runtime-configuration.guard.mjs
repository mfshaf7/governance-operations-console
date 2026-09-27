import { assertIncludes, readAppFile, walkFiles } from "../guard-lib.mjs";

const configurationPath =
  "src/console-integration/configuration/console-runtime-configuration.ts";
const governedKeys = [
  "GOVERNANCE_CONSOLE_OPERATOR_HANDLE",
  "GOVERNANCE_CONSOLE_OPERATOR_ID",
  "GOVERNANCE_CONSOLE_RUNTIME_OBSERVATION_PATH",
  "GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH",
  "OOS_BASE_URL",
  "OOS_CALLER_ID",
  "OOS_CALLER_SECRET",
];

export const guard = {
  id: "shared/console-runtime-configuration",
  run() {
    const failures = [];

    assertIncludes(failures, configurationPath, [
      "projectConsoleRuntimeCapabilities",
      "resolveConsoleArtifactReference",
      "resolveConsoleOosConnection",
      "resolveConsoleOosOperatorConfiguration",
      "resolveConsoleOperatorBinding",
      "resolveConsoleRuntimeObservationConfiguration",
      "resolveConsoleSessionProjectionPath",
    ]);

    for (const absolutePath of walkFiles("src", [".ts", ".tsx"])) {
      const path = absolutePath
        .slice(process.cwd().length + 1)
        .replace(/\\/g, "/");
      if (path === configurationPath) continue;
      const source = readAppFile(path);
      for (const key of governedKeys) {
        if (source.includes(key)) {
          failures.push(
            `${path}: governed runtime key ${key} must be resolved through ${configurationPath}`,
          );
        }
      }
    }

    return failures;
  },
};

export default guard;
