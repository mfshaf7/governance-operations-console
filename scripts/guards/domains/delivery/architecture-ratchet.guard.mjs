import {
  assertRepoIncludes,
  isFile,
  listDir,
  readAppFile,
} from "../../guard-lib.mjs";

const deliveryRoot = "src/domain-workspaces/delivery";
const targetRootDirectories = new Set([
  "domain",
  "live-runtime",
  "local-runtime",
  "product-adapters",
  "presentation",
  "read-model",
  "server",
  "work-model",
]);
const bannedLegacyRootDirectories = new Set([
  "workspace-shell",
  "surfaces",
  "workflows",
  "shared",
]);

export const guard = {
  id: "delivery/architecture-ratchet",
  run() {
    const failures = [];

    assertRepoIncludes(
      failures,
      "docs/product/source-structure-discipline.md",
      [
        "Strongest accepted architecture contract wins",
        "A local structure drift is a system-wide signal until disproven",
        "Record accepted source-structure rules before continuing implementation",
      ],
    );

    assertRepoIncludes(
      failures,
      "docs/product/domain-contracts/delivery.md",
      [
        "Architecture Ratchet Rule",
        "`domain/`, `read-model/`, `work-model/`, `product-adapters/`,",
        "`local-runtime/`, `live-runtime/`, `server/`, and `presentation/`",
        "are the only final Delivery",
        "Legacy root folders are not allowed",
        "`workspace-shell/`",
        "`surfaces/`",
        "`workflows/`",
        "`shared/`",
        "must not be described as the target architecture",
        "add or update a guard that proves the baseline boundary",
      ],
    );

    const sourceStructureGuard = readAppFile(
      "scripts/guards/domains/delivery/source-structure.guard.mjs",
    );

    for (const token of [
      "targetRootDirectories",
      "bannedLegacyRootDirectories",
      "Architecture Ratchet Rule",
    ]) {
      if (!sourceStructureGuard.includes(token)) {
        failures.push(
          `scripts/guards/domains/delivery/source-structure.guard.mjs: missing architecture ratchet token "${token}"`,
        );
      }
    }

    for (const entry of listDir(deliveryRoot)) {
      if (isFile(`${deliveryRoot}/${entry}`)) {
        if (entry !== "index.ts") {
          failures.push(
            `${deliveryRoot}/${entry}: Delivery root may expose only index.ts as a file`,
          );
        }
        continue;
      }

      if (
        !targetRootDirectories.has(entry)
      ) {
        failures.push(
          `${deliveryRoot}/${entry}: Delivery root is not a final target root`,
        );
      }

      if (bannedLegacyRootDirectories.has(entry)) {
        failures.push(
          `${deliveryRoot}/${entry}: legacy Delivery root folders are not allowed`,
        );
      }
    }

    return failures;
  },
};

export default guard;
