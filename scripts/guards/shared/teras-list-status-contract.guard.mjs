import {
  assertAppFile,
  assertAppPathAbsent,
  assertIncludes,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../guard-lib.mjs";

const retiredComponents = [
  "TerasChecklistRow",
  "TerasChecklistStack",
  "TerasCheckpointItem",
  "TerasCheckpointLibrary",
  "TerasSignalList",
  "TerasSignalRow",
  "TerasTimelineList",
  "TerasTimelineRow",
];

function openingTags(source, componentName) {
  return (
    source.match(new RegExp(`<${componentName}\\b[\\s\\S]*?>`, "g")) ?? []
  );
}

export const guard = {
  id: "shared/teras-list-status-contract",
  run() {
    const failures = [];

    for (const path of [
      "src/teras/teras-list.tsx",
      "src/teras/teras-signal-item.tsx",
      "src/teras/teras-status-item.tsx",
      "src/teras/teras-timeline.tsx",
      "src/teras/teras-activity-log.tsx",
    ]) {
      assertAppFile(failures, path);
    }

    for (const path of [
      "src/teras/teras-checklist.tsx",
      "src/teras/teras-checkpoints.tsx",
      "src/teras/teras-signal-list.tsx",
    ]) {
      assertAppPathAbsent(
        failures,
        path,
        "the neutral list and item contracts replace this legacy primitive",
      );
    }

    assertIncludes(failures, "src/teras/teras-list.tsx", [
      'role="list"',
      'data-teras-list="true"',
    ]);
    assertIncludes(failures, "src/teras/teras-status-item.tsx", [
      'role="listitem"',
    ]);
    assertIncludes(failures, "src/teras/teras-signal-item.tsx", [
      'role="listitem"',
    ]);
    assertIncludes(failures, "src/teras/teras-timeline.tsx", [
      "<ol",
      "<li",
      'data-teras-timeline="true"',
    ]);

    for (const file of walkFiles("src", [".ts", ".tsx"])) {
      const relativePath = relativeAppPath(file);
      const source = readAppFile(relativePath);

      for (const component of retiredComponents) {
        if (source.includes(component)) {
          failures.push(
            `${relativePath}: ${component} is retired by the neutral list and item contract`,
          );
        }
      }

      for (const openingTag of openingTags(source, "TerasList")) {
        if (
          /\b(?:align|fill|maxBlockSize|scroll|spacing|topOffset)=/.test(
            openingTag,
          ) ||
          /\s(?:fill|scroll)(?=\s|\/?>)/.test(openingTag)
        ) {
          failures.push(
            `${relativePath}: TerasList uses columns, fit, frame, and tokenized scrollHeight only`,
          );
        }
      }

      for (const match of source.matchAll(
        /<TerasList\b[\s\S]*?<\/TerasList>/g,
      )) {
        if (match[0].includes("<TerasEmptyState")) {
          failures.push(
            `${relativePath}: empty states are alternatives to a list, not list items`,
          );
        }
      }

      for (const openingTag of openingTags(source, "TerasStatusItem")) {
        if (
          /\b(?:dataTone|detailElement|indexLabel|labelElement|statusTone|variant)=/.test(
            openingTag,
          )
        ) {
          failures.push(
            `${relativePath}: TerasStatusItem uses one tone, index, and treatment contract`,
          );
        }
      }

      for (const openingTag of openingTags(source, "TerasTimelineItem")) {
        if (/\b(?:formattedTimestamp|variant)=/.test(openingTag)) {
          failures.push(
            `${relativePath}: TerasTimelineItem is durable history and uses displayTimestamp without variants`,
          );
        }
      }

      for (const openingTag of openingTags(source, "TerasActivityLogPanel")) {
        if (/\b(?:density|facts|fill)=/.test(openingTag)) {
          failures.push(
            `${relativePath}: TerasActivityLogPanel owns its compact fill geometry; full-view facts belong to fullLog`,
          );
        }
      }

      for (const openingTag of openingTags(source, "TerasTrayStack")) {
        if (/\bmaxBlockSize=/.test(openingTag)) {
          failures.push(
            `${relativePath}: TerasTrayStack uses tokenized scrollHeight instead of arbitrary block sizes`,
          );
        }
      }
    }

    const activityLogSource = readAppFile("src/teras/teras-activity-log.tsx");

    if (/from ["']\.\/teras-timeline["']/.test(activityLogSource)) {
      failures.push(
        "src/teras/teras-activity-log.tsx: operational activity must not reuse durable timeline semantics",
      );
    }

    const patternsSource = readAppFile("src/teras/teras-patterns.module.css");

    if (
      /checklist(?:Row|Stack)|terasCheckpoint|terasSignalRow|timeline(?:Row|List)|activityLog(?:PanelShellFill|PanelFill|PanelHasFacts|Facts|Row)|teras-tray-stack-max-block-size/.test(
        patternsSource,
      )
    ) {
      failures.push(
        "src/teras/teras-patterns.module.css: retired list, status, checkpoint, timeline, or activity-log selectors remain",
      );
    }

    return failures;
  },
};

export default guard;
