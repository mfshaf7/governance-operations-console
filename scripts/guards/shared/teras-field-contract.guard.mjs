import {
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../guard-lib.mjs";

function openingTags(source, componentName, selfClosing = false) {
  return source.match(
    new RegExp(
      `<${componentName}\\b[\\s\\S]*?${selfClosing ? "/>" : ">"}`,
      "g",
    ),
  ) ?? [];
}

export const guard = {
  id: "shared/teras-field-contract",
  run() {
    const failures = [];

    for (const file of walkFiles("src", [".ts", ".tsx"])) {
      const relativePath = relativeAppPath(file);
      const source = readAppFile(relativePath);

      if (
        source.includes("TerasPrefixedTextField") ||
        source.includes("TerasItemListField") ||
        source.includes("teras-item-list-field")
      ) {
        failures.push(
          `${relativePath}: text fields own optional prefixes and TerasTextListField owns string-list editing`,
        );
      }

      for (const openingTag of openingTags(source, "TerasTextField", true)) {
        if (/\bspacing=/.test(openingTag)) {
          failures.push(
            `${relativePath}: field containers own spacing; TerasTextField does not`,
          );
        }
      }

      for (const openingTag of openingTags(source, "TerasNoteField", true)) {
        if (/\bminHeight=/.test(openingTag)) {
          failures.push(
            `${relativePath}: TerasNoteField uses minimumHeight`,
          );
        }

        if (/\brows=/.test(openingTag)) {
          failures.push(
            `${relativePath}: TerasNoteField uses one tokenized height contract instead of native rows`,
          );
        }

        if (/\bdensity=["']editor["']/.test(openingTag)) {
          failures.push(
            `${relativePath}: compact is the neutral TerasNoteField density`,
          );
        }
      }

      for (const openingTag of openingTags(source, "TerasReadoutField", true)) {
        if (
          /\b(?:children|fill|maxBlockSize|scroll|variant)=/.test(openingTag)
        ) {
          failures.push(
            `${relativePath}: TerasReadoutField uses value, fit, treatment, and tokenized scrollHeight only`,
          );
        }
      }

      for (const openingTag of openingTags(source, "TerasFieldStack")) {
        if (/\blayout=/.test(openingTag)) {
          failures.push(
            `${relativePath}: TerasFieldStack uses semantic fill placement instead of raw grid-track names`,
          );
        }
      }

      for (const openingTag of openingTags(source, "TerasFieldGrid")) {
        if (/\bcolumns=\{1\}/.test(openingTag)) {
          failures.push(
            `${relativePath}: one-column field arrangements use TerasFieldStack`,
          );
        }
      }
    }

    for (const file of walkFiles("src/domain-workspaces", [".tsx"])) {
      const relativePath = relativeAppPath(file);
      const source = readAppFile(relativePath);

      if (/<(?:input|textarea)\b/.test(source)) {
        failures.push(
          `${relativePath}: domain workspaces must use Teras field primitives instead of raw inputs`,
        );
      }
    }

    for (const file of walkFiles("src/domain-workspaces", [".css"])) {
      const relativePath = relativeAppPath(file);
      const source = readAppFile(relativePath);

      if (/(?:^|[\s>+~,])(?:input|textarea)(?=[\s:{.#\[])/m.test(source)) {
        failures.push(
          `${relativePath}: domain styles must not restyle Teras input or textarea internals`,
        );
      }
    }

    const patternsSource = readAppFile("src/teras/teras-patterns.module.css");

    if (
      /terasPrefixedTextField|terasItemListField|terasTextField\[data-spacing|terasNoteField\[data-min-height|terasReadoutField\[data-(?:fill|max-block-size|variant)|terasReadoutField\[data-scroll(?:=|\])|terasFieldStack\[data-layout/.test(
        patternsSource,
      )
    ) {
      failures.push(
        "src/teras/teras-patterns.module.css: retired field-contract selectors remain",
      );
    }

    return failures;
  },
};

export default guard;
