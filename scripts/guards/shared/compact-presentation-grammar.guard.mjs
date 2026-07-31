import { dirname, normalize } from "node:path";

import {
  importSpecifiers,
  isDirectory,
  listDir,
  pathExists,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../guard-lib.mjs";

const compactDomains = [
  {
    domain: "proposal",
    allowedPresentationRoots: new Set([
      "dialogs",
      "hub",
      "shared",
      "surface",
      "workflows",
      "workspace",
    ]),
  },
  {
    domain: "repository",
    allowedPresentationRoots: new Set([
      "dialogs",
      "shared",
      "surface",
      "workspace",
    ]),
  },
  {
    domain: "prototype",
    allowedPresentationRoots: new Set([
      "dashboards",
      "dialogs",
      "shared",
      "surface",
      "workflows",
      "workspace",
    ]),
  },
  {
    domain: "model-operations",
    allowedPresentationRoots: new Set([
      "dashboards",
      "dialogs",
      "shared",
      "surface",
      "workspace",
    ]),
  },
];

const directDialogRoots = new Set([
  "admission",
  "capture",
  "details",
  "gate-resolution",
  "history",
  "request",
  "retirement",
]);

const directDashboardRoots = new Set([
  "dashboard",
  "preview-runtime",
]);

export const guard = {
  id: "shared/compact-presentation-grammar",
  run() {
    const failures = [];

    for (const { domain, allowedPresentationRoots } of compactDomains) {
      const presentationRoot = `src/domain-workspaces/${domain}/presentation`;

      if (!pathExists(presentationRoot)) {
        failures.push(`${presentationRoot}: missing compact presentation root`);
        continue;
      }

      for (const entry of listDir(presentationRoot)) {
        const entryPath = `${presentationRoot}/${entry}`;

        if (!isDirectory(entryPath)) {
          failures.push(
            `${entryPath}: compact presentation root should contain role folders only`,
          );
          continue;
        }

        if (!allowedPresentationRoots.has(entry)) {
          failures.push(
            `${entryPath}: compact presentation folder must be one of ${[
              ...allowedPresentationRoots,
            ].join(", ")}`,
          );
        }

        if (directDialogRoots.has(entry)) {
          failures.push(
            `${entryPath}: focused dialogs belong under presentation/dialogs/${entry}`,
          );
        }

        if (directDashboardRoots.has(entry)) {
          failures.push(
            `${entryPath}: stable dashboards belong under presentation/dashboards/${entry}`,
          );
        }
      }

      for (const file of walkFiles(presentationRoot, [".ts", ".tsx"])) {
        const relativePath = relativeAppPath(file);
        const sourceRole = relativePath
          .slice(`${presentationRoot}/`.length)
          .split("/")[0];

        for (const specifier of importSpecifiers(readAppFile(relativePath))) {
          if (!specifier.startsWith(".")) {
            continue;
          }

          const targetPath = normalize(
            `${dirname(relativePath)}/${specifier}`,
          ).replaceAll("\\", "/");
          const importsWorkspaceHost = targetPath.startsWith(
            `${presentationRoot}/workspace/`,
          );
          const importsPrimarySurface = targetPath.startsWith(
            `${presentationRoot}/surface/`,
          );

          if (sourceRole !== "workspace" && importsWorkspaceHost) {
            failures.push(
              `${relativePath}: compact presentation internals must not depend on the public workspace host via "${specifier}"`,
            );
          }

          if (
            sourceRole !== "workspace" &&
            sourceRole !== "surface" &&
            importsPrimarySurface
          ) {
            failures.push(
              `${relativePath}: shared display projection belongs under presentation/shared instead of depending on the primary surface via "${specifier}"`,
            );
          }
        }
      }
    }

    return failures;
  },
};

export default guard;
