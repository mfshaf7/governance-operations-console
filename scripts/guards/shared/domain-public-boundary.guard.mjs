import {
  assertAppFile,
  importSpecifiers,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../guard-lib.mjs";

const domainIds = [
  "delivery",
  "proposal",
  "repository",
  "prototype",
  "portfolio",
  "orchestration",
  "model-operations",
];

function privateDomainImport(specifier) {
  const normalized = specifier
    .replace(/^@\//, "")
    .replace(/^\.\.\/domain-workspaces\//, "domain-workspaces/")
    .replace(/^\.\.\/\.\.\/domain-workspaces\//, "domain-workspaces/");
  return /^domain-workspaces\/[^/]+\/.+/.test(normalized);
}

export const guard = {
  id: "shared/domain-public-boundary",
  run() {
    const failures = [];

    assertAppFile(failures, "src/domain-workspaces/index.ts");
    for (const domainId of domainIds) {
      assertAppFile(failures, `src/domain-workspaces/${domainId}/index.ts`);
    }

    for (const scope of ["src/app", "src/console-shell", "src/operation-workbench"]) {
      for (const file of walkFiles(scope, [".ts", ".tsx"])) {
        const relativePath = relativeAppPath(file);
        const source = readAppFile(relativePath);

        for (const specifier of importSpecifiers(source)) {
          if (specifier.includes("domain-workspaces/") && privateDomainImport(specifier)) {
            failures.push(
              `${relativePath}: external shell must import domain workspaces through public barrels, not "${specifier}"`,
            );
          }
        }
      }
    }

    return failures;
  },
};

export default guard;
