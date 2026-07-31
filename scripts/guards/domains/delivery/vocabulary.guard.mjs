import {
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const bannedTerms = [
  "Activate Epic",
  "Commitment",
  "Drafting",
  "Front Control",
  "Fronts",
  "Package #",
  "workflow_stage",
  "child_front",
  "active_front_id",
  "next_front_id",
  " into the desk",
];

const exemptFiles = new Set([
  "src/domain-workspaces/delivery/presentation/workspace/workspace-contract.ts",
  "src/domain-workspaces/delivery/read-model/terms/copy.ts",
]);

export const guard = {
  id: "delivery/vocabulary",
  run() {
    const failures = [];

    for (const file of walkFiles("src/domain-workspaces/delivery", [
      ".ts",
      ".tsx",
      ".css",
    ])) {
      const relativePath = relativeAppPath(file);

      if (exemptFiles.has(relativePath)) {
        continue;
      }

      const source = readAppFile(relativePath);

      for (const term of bannedTerms) {
        if (source.includes(term)) {
          failures.push(`${relativePath}: stale Delivery vocabulary "${term}"`);
        }
      }
    }

    return failures;
  },
};

export default guard;
