import { readAppFile, walkFiles } from "../guard-lib.mjs";

const guardImport = "authorizeConsoleMutation";
const explicitlyNonMutatingPosts = new Set([
  "src/app/api/agent-interaction/route.ts",
  "src/app/api/delivery/refinement/[packageId]/assist/route.ts",
  "src/app/api/delivery/work-design/[packageId]/assist/route.ts",
  "src/app/api/prototypes/closures/preparations/route.ts",
  "src/app/api/prototypes/landings/preparations/route.ts",
  "src/app/api/prototypes/maturity/preparations/route.ts",
  "src/app/api/workspace-intake/preparations/route.ts",
  "src/app/api/workspace-registry/lifecycle/preparations/route.ts",
  "src/app/api/workspace-registry/preparations/route.ts",
]);

export const guard = {
  id: "shared/console-session-authorization",
  run() {
    const failures = [];
    const routeFiles = walkFiles("src/app/api", [".ts"]);
    for (const absolutePath of routeFiles) {
      const path = absolutePath.slice(process.cwd().length + 1).replace(/\\/g, "/");
      const source = readAppFile(path);
      const exportsPost =
        /export\s+(?:async\s+function|const)\s+POST\b/.test(source) ||
        /\bas\s+POST\b/.test(source) ||
        /export\s*\{[^}]*\bPOST\b[^}]*\}/s.test(source);
      if (!exportsPost || explicitlyNonMutatingPosts.has(path)) continue;
      if (!source.includes(guardImport)) {
        failures.push(`${path}: canonical mutation must use ${guardImport}`);
      }
    }

    const ownerClients = walkFiles("src", [".ts"]).filter((path) => {
      const source = readAppFile(path.slice(process.cwd().length + 1));
      return source.includes('"x-oos-caller-secret"');
    });
    for (const absolutePath of ownerClients) {
      const path = absolutePath.slice(process.cwd().length + 1).replace(/\\/g, "/");
      if (!readAppFile(path).includes("consoleMutationAttributionHeaders")) {
        failures.push(`${path}: OOS request must carry verified Console attribution`);
      }
    }

    return failures;
  },
};

export default guard;
