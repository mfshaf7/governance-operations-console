import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";

import {
  readAppFile,
  relativeAppPath,
  walkFiles,
  repoPath,
  repoRoot,
} from "../guard-lib.mjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const requiredProps = new Map([
  ["TerasContentFrame", ["variant"]],
  ["TerasDetailGrid", ["variant"]],
  ["TerasDialog", ["contentOverflow", "height", "width"]],
  ["TerasModalShell", ["bodyLayout", "height", "surfaceId", "width"]],
  ["TerasPanelStack", ["fill"]],
  ["TerasRecordControlLayout", ["mode"]],
  ["TerasZone", ["fit"]],
  ["TerasZoneLayout", ["variant"]],
]);

const stableModalSurfaceIds = new Set([
  '"delivery-workspace-modal"',
  '"dev-integration-profile-dashboard"',
  '"governed-product-dashboard"',
  '"lifecycle-transitions-workspace"',
  '"model-operations-control"',
  '"model-profile-dashboard"',
  '"orchestration-definition-dashboard"',
  '"orchestration-run-dashboard"',
  '"orchestration-workspace-modal"',
  '"product-dashboard"',
  '"product-portfolio-workspace"',
  '"proposal-control"',
  '"prototype-control"',
  '"prototype-dashboard"',
  '"prototype-preview-runtime"',
  '"repository-control"',
]);

const hubAwareModalSurfaceIds = new Set([
  '"delivery-refinement-workflow"',
  '"proposal-workflow"',
  '"work-design-session"',
]);

const activeContractPaths = [
  "docs/product/teras-contract.md",
  "docs/product/operation-workbench-contract.md",
];

const retiredContractTokens = [
  "auto-auto-fill",
  "flexPanel=",
  "panelCount=",
  "stackItem=",
  'family="',
  "stateMode=",
  "layoutProfile=",
  "TerasDialog.shape",
  "TerasDialog shape=",
  "TerasModalShell size=",
];

export const guard = {
  id: "shared/teras-structure-contract",
  run() {
    const failures = [];

    for (const file of walkFiles("src", [".tsx"])) {
      const relativePath = relativeAppPath(file);
      const source = readAppFile(relativePath);
      const sourceFile = ts.createSourceFile(
        relativePath,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );

      visitJsx(sourceFile, (node, componentName, attributes) => {
        const componentRequiredProps = requiredProps.get(componentName) ?? [];
        const line =
          sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

        for (const requiredProp of componentRequiredProps) {
          if (!attributes.has(requiredProp)) {
            failures.push(
              `${relativePath}:${line}: ${componentName} must declare ${requiredProp} explicitly`,
            );
          }
        }

        if (componentName === "TerasZone" && attributes.has("layout")) {
          failures.push(
            `${relativePath}:${line}: TerasZone uses semantic fit instead of layout mechanics`,
          );
        }

        if (componentName === "TerasContentTray" && attributes.has("layout")) {
          failures.push(
            `${relativePath}:${line}: TerasContentTray uses semantic fit instead of layout mechanics`,
          );
        }

        if (componentName === "TerasPanelStack") {
          for (const retiredProp of ["flexPanel", "panelCount"]) {
            if (attributes.has(retiredProp)) {
              failures.push(
                `${relativePath}:${line}: TerasPanelStack must not use retired ${retiredProp}`,
              );
            }
          }
        }

        if (componentName === "TerasPanel" && attributes.has("stackItem")) {
          failures.push(
            `${relativePath}:${line}: stack sizing belongs to TerasPanelStack, not TerasPanel`,
          );
        }

        if (
          componentName === "TerasModalShell" &&
          stableModalSurfaceIds.has(attributes.get("surfaceId"))
        ) {
          if (attributes.get("height") !== '"fill"') {
            failures.push(
              `${relativePath}:${line}: stable TerasModalShell surfaces must use height="fill"`,
            );
          }

          if (attributes.get("bodyLayout") !== '"fill"') {
            failures.push(
              `${relativePath}:${line}: stable TerasModalShell surfaces must use bodyLayout="fill"`,
            );
          }
        }

        if (
          componentName === "TerasModalShell" &&
          hubAwareModalSurfaceIds.has(attributes.get("surfaceId"))
        ) {
          const height = attributes.get("height") ?? "";

          if (
            !/activeStep|activeWorkflowStep/.test(height) ||
            !height.includes('"content"') ||
            !height.includes('"fill"')
          ) {
            failures.push(
              `${relativePath}:${line}: hub-aware TerasModalShell surfaces must use content height for the hub and fill height for active workflow steps`,
            );
          }

          if (attributes.get("bodyLayout") !== '"fill"') {
            failures.push(
              `${relativePath}:${line}: hub-aware TerasModalShell surfaces must use bodyLayout="fill"`,
            );
          }
        }

        if (
          componentName === "TerasDialog" ||
          componentName === "TerasModalShell"
        ) {
          for (const geometryProp of [
            "bodyLayout",
            "contentOverflow",
            "height",
            "width",
          ]) {
            if (/\.length\b/.test(attributes.get(geometryProp) ?? "")) {
              failures.push(
                `${relativePath}:${line}: ${componentName} geometry must not depend on collection length`,
              );
            }
          }
        }
      });

      if (source.includes("auto-auto-fill")) {
        failures.push(
          `${relativePath}: CSS track mechanics must not appear in public component vocabulary`,
        );
      }

      if (source.includes("TerasZoneMode")) {
        failures.push(
          `${relativePath}: retired TerasZoneMode compatibility type must not return`,
        );
      }
    }

    const patternsSource = readAppFile("src/teras/teras-patterns.module.css");

    for (const retiredPattern of [
      ".terasContentTray[data-layout",
      '.terasFieldGrid[data-align="start"]',
      ".terasMetadataList[data-offset",
      '.terasPanel[data-layout="header-toolbar-body-footer"]',
      ".terasPanelStackBoundedItem",
      ".terasPanelStackMutableItem",
      ".terasStatItemRail",
      ".terasZone[data-layout",
      "data-flex-panel",
      "data-panel-count",
    ]) {
      if (patternsSource.includes(retiredPattern)) {
        failures.push(
          `src/teras/teras-patterns.module.css: retired structural selector "${retiredPattern}" must not return`,
        );
      }
    }

    for (const contractPath of [
      ...activeContractPaths,
      ...contractFiles(
        "docs/product/domain-contracts",
      ),
      ...contractFiles(
        "docs/product/surface-contracts",
      ),
    ]) {
      const source = readFileSync(repoPath(contractPath), "utf8");

      for (const retiredToken of retiredContractTokens) {
        if (source.includes(retiredToken)) {
          failures.push(
            `${contractPath}: retired structural contract token "${retiredToken}" must not return`,
          );
        }
      }
    }

    return failures;
  },
};

export default guard;

function visitJsx(sourceFile, visitor) {
  function visit(node) {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ts.isIdentifier(node.tagName)
    ) {
      const attributes = new Map(
        node.attributes.properties
          .filter(ts.isJsxAttribute)
          .map((attribute) => [
            attribute.name.text,
            attribute.initializer?.getText(sourceFile) ?? "true",
          ]),
      );

      visitor(node, node.tagName.text, attributes);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function contractFiles(relativeRoot) {
  const files = [];
  const absoluteRoot = repoPath(relativeRoot);

  function walk(path) {
    for (const entry of readdirSync(path)) {
      const target = join(path, entry);

      if (statSync(target).isDirectory()) {
        walk(target);
      } else if (target.endsWith(".md")) {
        files.push(relative(repoRoot, target).replaceAll("\\", "/"));
      }
    }
  }

  walk(absoluteRoot);
  return files;
}
