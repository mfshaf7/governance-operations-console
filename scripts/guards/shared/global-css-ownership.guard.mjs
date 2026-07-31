import postcss from "postcss";
import {
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../guard-lib.mjs";

const globalCssPath = "src/app/globals.css";
const rootLayoutPath = "src/app/layout.tsx";
const agentControllerPath =
  "src/agent-console/state/use-agent-console-controller.ts";
const agentPresentationCssPath =
  "src/agent-console/presentation/model-interaction-dock.css";

const maxGlobalCssBytes = 180_000;
const maxGlobalCssRules = 1_000;

const operationClassPrefixes = [
  "delivery",
  "desk",
  "model-operation",
  "model-operations",
  "operation-desk",
  "orchestration",
  "portfolio",
  "proposal",
  "prototype",
  "repo",
  "repository",
];

const retiredModalSelectors = [
  ".desk-primary-modal",
  ".desk-workflow-modal",
  ".prototype-resolution-modal",
  ".prototype-preview-modal",
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const guard = {
  id: "shared/global-css-ownership",
  run() {
    const failures = [];
    const globalCss = readAppFile(globalCssPath);
    const agentController = readAppFile(agentControllerPath);
    const agentPresentationCss = readAppFile(agentPresentationCssPath);

    if (!globalCss.includes('@import "tailwindcss";')) {
      failures.push(`${globalCssPath}: must retain the shared Tailwind foundation import`);
    }

    if (
      !globalCss.includes(
        '@import "../agent-console/presentation/model-interaction-dock.css";',
      )
    ) {
      failures.push(
        `${globalCssPath}: must mount the Agent Console owner stylesheet`,
      );
    }

    if (!agentPresentationCss.includes("body:has([data-teras-modal])")) {
      failures.push(
        `${agentPresentationCssPath}: modal-aware Agent styling must use the data-teras-modal contract`,
      );
    }

    for (const selector of [".model-dock", ".terminal-transcript"]) {
      if (globalCss.includes(selector)) {
        failures.push(
          `${globalCssPath}: Agent Console selector "${selector}" must remain in ${agentPresentationCssPath}`,
        );
      }
    }

    for (const selector of retiredModalSelectors) {
      if (globalCss.includes(selector) || agentController.includes(selector)) {
        failures.push(
          `${selector}: retired modal selector must not return to global CSS or Agent modal detection`,
        );
      }
    }

    for (const prefix of operationClassPrefixes) {
      const selectorPattern = new RegExp(
        `\\.${escapeRegExp(prefix)}-[A-Za-z0-9_-]+`,
        "g",
      );
      const selectors = [...new Set(globalCss.match(selectorPattern) ?? [])];

      if (selectors.length > 0) {
        failures.push(
          `${globalCssPath}: Operation-domain selectors must remain scoped outside global CSS; found ${selectors.slice(0, 4).join(", ")}`,
        );
      }
    }

    if (
      !agentController.includes(
        'document.body.matches(":has([data-teras-modal])")',
      )
    ) {
      failures.push(
        `${agentControllerPath}: Agent modal detection must use the data-teras-modal contract`,
      );
    }

    const globalCssBytes = Buffer.byteLength(globalCss);
    if (globalCssBytes > maxGlobalCssBytes) {
      failures.push(
        `${globalCssPath}: ${globalCssBytes} bytes exceeds the ${maxGlobalCssBytes}-byte global ownership budget; move capability styling behind a scoped owner`,
      );
    }

    try {
      const root = postcss.parse(globalCss, { from: globalCssPath });
      let ruleCount = 0;
      root.walkRules(() => {
        ruleCount += 1;
      });

      if (ruleCount > maxGlobalCssRules) {
        failures.push(
          `${globalCssPath}: ${ruleCount} rules exceeds the ${maxGlobalCssRules}-rule global ownership budget; move capability styling behind a scoped owner`,
        );
      }
    } catch (error) {
      failures.push(
        `${globalCssPath}: invalid CSS (${error instanceof Error ? error.message : String(error)})`,
      );
    }

    for (const file of walkFiles("src", [".ts", ".tsx"])) {
      const relativePath = relativeAppPath(file);
      const source = readAppFile(relativePath);

      if (source.includes("globals.css") && relativePath !== rootLayoutPath) {
        failures.push(
          `${relativePath}: global CSS may only be mounted by ${rootLayoutPath}`,
        );
      }
    }

    return failures;
  },
};

export default guard;
