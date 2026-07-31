import {
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../guard-lib.mjs";

const selectControlOwner = "src/teras/teras-select-control.tsx";

export const guard = {
  id: "shared/teras-selection-contract",
  run() {
    const failures = [];

    for (const file of walkFiles("src", [".tsx"])) {
      const relativePath = relativeAppPath(file);
      const source = readAppFile(relativePath);

      if (
        relativePath !== selectControlOwner &&
        /\bstyles\.(?:filterSelectButton|filterSelectMenu|filterSelectOption)\b/.test(
          source,
        )
      ) {
        failures.push(
          `${relativePath}: select trigger, menu, and option behavior belongs to TerasSelectControl`,
        );
      }

      if (source.includes("<TerasChoiceRow")) {
        failures.push(
          `${relativePath}: TerasSelectableRow replaces the ambiguous TerasChoiceRow name`,
        );
      }

      for (const match of source.matchAll(/<TerasSelectField\b[\s\S]*?\/>/g)) {
        const openingTag = match[0];
        const highlighted =
          /\btreatment=["']highlighted["']/.test(openingTag);

        if (/\btreatment=["']primary["']/.test(openingTag)) {
          failures.push(
            `${relativePath}: highlighted is the neutral select treatment; primary is retired`,
          );
        }

        if (/\btone=/.test(openingTag) && !highlighted) {
          failures.push(
            `${relativePath}: default selects do not carry tone; tone belongs to highlighted selects`,
          );
        }
      }

      for (const match of source.matchAll(
        /<TerasSelectableRow\b[\s\S]*?\/>/g,
      )) {
        const openingTag = match[0];

        if (/\bvariant=/.test(openingTag)) {
          failures.push(
            `${relativePath}: TerasSelectableRow has one canonical geometry`,
          );
        }

        if (/\bstateMode=/.test(openingTag)) {
          failures.push(
            `${relativePath}: TerasSelectableRow tone directly expresses its state`,
          );
        }
      }

      for (const match of source.matchAll(
        /<TerasSegmentedControl\b[\s\S]*?\/>/g,
      )) {
        if (/\bcolumns=/.test(match[0])) {
          failures.push(
            `${relativePath}: filled segmented controls derive columns from their options`,
          );
        }
      }

      for (const match of source.matchAll(/<TerasChoiceGroup\b[\s\S]*?\/>/g)) {
        const openingTag = match[0];

        if (/\bfitContent\b/.test(openingTag)) {
          failures.push(
            `${relativePath}: TerasChoiceGroup no longer accepts the no-op fitContent prop`,
          );
        }

        if (!/\bframe=/.test(openingTag)) {
          failures.push(
            `${relativePath}: TerasChoiceGroup callers must declare framing explicitly`,
          );
        }

        if (/\brecorded=/.test(openingTag)) {
          failures.push(
            `${relativePath}: confirmed is the neutral choice state; recorded is persistence vocabulary`,
          );
        }
      }

      if (source.includes("<TerasFilterBar") && /\bonChange\s*:/.test(source)) {
        failures.push(
          `${relativePath}: TerasFilterBar filters use onValueChange`,
        );
      }
    }

    const filterBarSource = readAppFile("src/teras/teras-filter-bar.tsx");

    if (/\bany\b/.test(filterBarSource)) {
      failures.push(
        "src/teras/teras-filter-bar.tsx: filter contracts must not erase values to any",
      );
    }

    if (/\.slice\(\s*0\s*,\s*3\s*\)/.test(filterBarSource)) {
      failures.push(
        "src/teras/teras-filter-bar.tsx: reject excess filters instead of silently truncating them",
      );
    }

    const segmentedControlSource = readAppFile(
      "src/teras/teras-segmented-control.tsx",
    );

    if (/role=["']tab(?:list)?["']/.test(segmentedControlSource)) {
      failures.push(
        "src/teras/teras-segmented-control.tsx: segmented value selection uses radio semantics, not an incomplete tab contract",
      );
    }

    const patternsSource = readAppFile("src/teras/teras-patterns.module.css");

    if (
      /terasChoiceRow|teras-option-row-rgb|data-recorded|data-state-mode|terasSegmentedControl\[data-columns/.test(
        patternsSource,
      )
    ) {
      failures.push(
        "src/teras/teras-patterns.module.css: retired selection API selectors remain",
      );
    }

    return failures;
  },
};

export default guard;
