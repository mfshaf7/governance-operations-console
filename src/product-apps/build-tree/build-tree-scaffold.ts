import type { BuildTreeScaffoldSection } from "./build-tree-model";

export function buildTreeScaffoldSectionsWithDraft<
  TSection extends BuildTreeScaffoldSection,
>(sections: TSection[], draftBody: string) {
  const parsed = parseBuildTreeDraftSections(draftBody);

  return sections.map((section) => {
    if (section.owner === "system") {
      return section;
    }

    const existing = parsed.get(normalizeBuildTreeScaffoldValue(section.heading));
    if (!existing) {
      return section;
    }

    const state =
      normalizeBuildTreeScaffoldValue(existing) ===
      normalizeBuildTreeScaffoldValue(section.defaultValue)
        ? section.state
        : "edited";

    return {
      ...section,
      state,
      value: existing,
    };
  });
}

export function buildTreeScaffoldSectionsByOwner<
  TSection extends BuildTreeScaffoldSection,
>(sections: TSection[]) {
  return {
    operatorSections: sections.filter((section) => section.owner === "operator"),
    systemSections: sections.filter((section) => section.owner === "system"),
  };
}

export function updateBuildTreeScaffoldSection<
  TSection extends BuildTreeScaffoldSection,
>(sections: TSection[], sectionId: string, value: string) {
  return sections.map((section) =>
    section.id === sectionId && section.owner === "operator"
      ? {
          ...section,
          state:
            normalizeBuildTreeScaffoldValue(value) ===
            normalizeBuildTreeScaffoldValue(section.defaultValue)
              ? section.state === "edited"
                ? "review"
                : section.state
              : "edited",
          value,
        }
      : section,
  );
}

export function composeBuildTreeScaffoldSections(
  sections: BuildTreeScaffoldSection[],
) {
  return sections
    .filter((section) => section.owner === "operator")
    .map((section) => `## ${section.heading}\n${section.value.trim()}`)
    .join("\n\n");
}

export function normalizeBuildTreeScaffoldValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function buildTreeScaffoldSectionId(heading: string) {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildTreeScaffoldCompactValue(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" / ");
}

export function buildTreeScaffoldStateLabel(
  state: BuildTreeScaffoldSection["state"],
) {
  switch (state) {
    case "auto":
      return "suggested";
    case "edited":
      return "edited";
    case "inherited":
      return "system";
    case "optional":
      return "optional";
    case "review":
      return "review";
  }
}

function parseBuildTreeDraftSections(draftBody: string) {
  const sections = new Map<string, string>();
  const lines = draftBody.split(/\r?\n/);
  let heading: string | null = null;
  let body: string[] = [];

  function flush() {
    if (!heading) {
      return;
    }

    sections.set(
      normalizeBuildTreeScaffoldValue(heading),
      body.join("\n").trim(),
    );
  }

  for (const line of lines) {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (match) {
      flush();
      heading = match[1];
      body = [];
      continue;
    }

    if (heading) {
      body.push(line);
    }
  }

  flush();
  return sections;
}
