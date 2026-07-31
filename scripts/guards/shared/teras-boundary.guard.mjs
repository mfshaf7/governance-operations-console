import {
  importSpecifiers,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../guard-lib.mjs";

export const guard = {
  id: "shared/teras-boundary",
  run() {
    const failures = [];
    const legacyPanelTokens = [
      "TerasPanelFamily",
      "TerasPanelStateMode",
      'family="non-railed"',
      'family="plain"',
      'family="railed"',
      'stateMode="neutral"',
      'stateMode="stateful"',
      ".panelSelected",
      ".terasNonRailedPanel",
      ".terasRailedPanel",
    ];
    const legacyModalCssTokens = [
      ".modalControl",
      ".modalFullscreen",
      ".modalLarge",
      ".modalRoomy",
      ".modalWide",
      ".terasActionInspectorDialog",
      ".terasArchiveViewerDialog",
      ".terasChecklistDialog",
      ".terasCompactFormDialog",
      ".terasEditorDialog",
      ".terasEvidenceViewerDialog",
      ".terasListBrowserDialog",
      ".terasLogViewerDialog",
      ".terasMediaViewerDialog",
      ".terasReferenceInspectorDialog",
      ".terasTreeViewerDialog",
      ".terasWideSurfaceDialog",
    ];
    const operationProjectionTokens = [
      "resolveTerasSurfaceStatusTone",
      "TerasSurfaceStatusSignalId",
      "TerasSurfaceStatusState",
    ];

    for (const file of walkFiles("src/teras", [".ts", ".tsx"])) {
      const relativePath = relativeAppPath(file);
      const source = readAppFile(relativePath);

      for (const specifier of importSpecifiers(source)) {
        if (
          specifier.includes("domain-workspaces/") ||
          specifier.includes("operation-workbench/") ||
          specifier.includes("product-apps/")
        ) {
          failures.push(
            `${relativePath}: Teras primitives must not import app, workbench, or domain internals via "${specifier}"`,
          );
        }
      }

      for (const token of [
        "model-dock-",
        "terminal-active-line",
        "terminal-command",
        "terminal-entry",
        "terminal-input",
        "terminal-prompt",
        "terminal-run-button",
        "terminal-shell",
        "terminal-speaker",
        "terminal-transcript",
      ]) {
        if (source.includes(token)) {
          failures.push(
            `${relativePath}: Teras must own its visual classes instead of depending on global "${token}" styling`,
          );
        }
      }

      for (const token of operationProjectionTokens) {
        if (source.includes(token)) {
          failures.push(
            `${relativePath}: operation status projection token "${token}" must stay outside Teras`,
          );
        }
      }
    }

    for (const file of walkFiles("src/teras", [".css"])) {
      const relativePath = relativeAppPath(file);
      const source = readAppFile(relativePath);

      if (source.includes(':global([class*="')) {
        failures.push(
          `${relativePath}: Teras must target named primitive classes instead of broad descendant class fragments`,
        );
      }
    }

    const terasPatterns = readAppFile("src/teras/teras-patterns.module.css");

    for (const selector of [
      '.terasMetadataItem[data-tone="danger"]',
      '.terasMetadataItem[data-tone="info"]',
      '.terasMetadataItem[data-tone="muted"]',
      '.terasMetadataItem[data-tone="ok"]',
      '.terasMetadataItem[data-tone="stale"]',
      '.terasMetadataItem[data-tone="warn"]',
      ".terasMetadataItem[data-tone] .terasMetadataValue",
    ]) {
      if (!terasPatterns.includes(selector)) {
        failures.push(
          `src/teras/teras-patterns.module.css: metadata tone contract is missing "${selector}"`,
        );
      }
    }

    for (const file of walkFiles("src", [".ts", ".tsx", ".css"])) {
      const relativePath = relativeAppPath(file);
      const source = readAppFile(relativePath);

      for (const token of [...legacyPanelTokens, ...legacyModalCssTokens]) {
        if (source.includes(token)) {
          failures.push(
            `${relativePath}: obsolete Teras token "${token}" must not return`,
          );
        }
      }
    }

    const directConsumerRoots = [
      "src/agent-console",
      "src/console-shell",
      "src/domain-workspaces",
      "src/product-apps",
    ];

    for (const root of directConsumerRoots) {
      for (const file of walkFiles(root, [".tsx"])) {
        const relativePath = relativeAppPath(file);
        const source = readAppFile(relativePath);

        for (const match of source.matchAll(/<TerasPanel\b[\s\S]*?>/g)) {
          const openingTag = match[0];

          if (!/\bframe=/.test(openingTag)) {
            failures.push(
              `${relativePath}: direct TerasPanel consumers must declare frame explicitly`,
            );
          }

          if (!/\btreatment=/.test(openingTag)) {
            failures.push(
              `${relativePath}: direct TerasPanel consumers must declare treatment explicitly`,
            );
          }

          if (
            /treatment="neutral"/.test(openingTag) &&
            /\btone=/.test(openingTag)
          ) {
            failures.push(
              `${relativePath}: neutral TerasPanel treatment must not carry a tone`,
            );
          }
        }

        for (const match of source.matchAll(/<TerasModalShell\b[\s\S]*?>/g)) {
          const openingTag = match[0];

          if (/\b(size|overlayLayer|layoutProfile)=/.test(openingTag)) {
            failures.push(
              `${relativePath}: TerasModalShell must use width/height/bodyLayout instead of legacy size, profile, or overlay props`,
            );
          }
        }

        for (const match of source.matchAll(/<TerasWizardPanel\b[\s\S]*?>/g)) {
          if (/\bfitContent\b/.test(match[0])) {
            failures.push(
              `${relativePath}: TerasWizardPanel uses neutral fit instead of fitContent`,
            );
          }
        }

        for (const match of source.matchAll(/<TerasDialog\b[\s\S]*?>/g)) {
          const openingTag = match[0];

          if (/\b(shape|overlayLayer)=/.test(openingTag)) {
            failures.push(
              `${relativePath}: TerasDialog must use width/height/contentOverflow geometry instead of semantic shape or overlay layering`,
            );
          }
        }

        for (const match of source.matchAll(/<TerasWizardModal\b[\s\S]*?>/g)) {
          const openingTag = match[0];

          if (/\b(size|overlayLayer)=/.test(openingTag)) {
            failures.push(
              `${relativePath}: TerasWizardModal owns its stable geometry and must not accept local size or overlay layering`,
            );
          }
        }
      }
    }

    return failures;
  },
};

export default guard;
