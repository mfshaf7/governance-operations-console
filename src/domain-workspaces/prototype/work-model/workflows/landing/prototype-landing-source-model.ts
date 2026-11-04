import type { PrototypeLandingSourcePosture, PrototypeRecord, PrototypeSourceHome } from "../../../domain/prototype-types.ts";

export function prototypeLandingSourcePosture(sourceHome: PrototypeSourceHome): PrototypeLandingSourcePosture {
  switch (sourceHome) {
    case "new-prototype-folder":
    case "docs-only": return "create-studio-source";
    case "existing-source":
    case "future-owner-repo": return "reference-dedicated-owner-source";
    case "app-folder":
    case "console-domain-module": return "reference-shared-owner-source";
  }
}

export function prototypeLandingSourceReadout(record: PrototypeRecord) {
  const posture = record.sourceEvidence?.posture ?? prototypeLandingSourcePosture(record.landing.sourceHome);
  const studio = ["create-studio-source", "use-existing-studio-source", "import-to-studio"].includes(posture);
  const sourceHome: PrototypeSourceHome = studio
    ? record.landing.sourceHome === "docs-only" ? "docs-only" : "new-prototype-folder"
    : posture === "reference-dedicated-owner-source" ? "existing-source" : "app-folder";
  return {
    sourceHome,
    label: studio ? "Prototype Studio" : "Referenced project repository",
    detail: studio
      ? "Source stays in Studio during incubation. Transfer to a project repository is a separate reviewed step."
      : "Landing records the existing source by reference. It does not edit or copy that repository; Studio authoring is unavailable for this source home.",
  };
}

export function prototypeLandingSourceHomeMatches(sourceHome: PrototypeSourceHome, posture: PrototypeLandingSourcePosture) {
  return ["use-existing-studio-source", "import-to-studio"].includes(posture)
    ? ["new-prototype-folder", "docs-only"].includes(sourceHome)
    : prototypeLandingSourcePosture(sourceHome) === posture;
}
