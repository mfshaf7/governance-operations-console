import {
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../guard-lib.mjs";

const statusOnlyTones = ["info", "muted", "ok", "stale", "warn"];

export const guard = {
  id: "shared/teras-action-contract",
  run() {
    const failures = [];

    for (const file of walkFiles("src", [".tsx"])) {
      const relativePath = relativeAppPath(file);
      const source = readAppFile(relativePath);

      for (const match of source.matchAll(/<TerasActionButton\b[\s\S]*?>/g)) {
        const openingTag = match[0];
        const tonal = /\btreatment=["']tonal["']/.test(openingTag);

        if (/\bvariant=/.test(openingTag)) {
          failures.push(
            `${relativePath}: TerasActionButton uses emphasis instead of the retired variant prop`,
          );
        }

        if (/\bemphasis=["']danger["']/.test(openingTag)) {
          failures.push(
            `${relativePath}: danger is an action tone, not action emphasis`,
          );
        }

        if (tonal && /\bemphasis=/.test(openingTag)) {
          failures.push(
            `${relativePath}: tonal actions do not carry primary or secondary emphasis`,
          );
        }

        if (!tonal) {
          for (const tone of statusOnlyTones) {
            if (new RegExp(`\\btone=["']${tone}["']`).test(openingTag)) {
              failures.push(
                `${relativePath}: solid actions use accent or danger; "${tone}" is a status tone`,
              );
            }
          }
        }
      }
    }

    return failures;
  },
};

export default guard;
