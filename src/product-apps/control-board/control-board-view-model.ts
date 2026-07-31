import type {
  ControlBoardFamilyGroup,
  ControlBoardPackage,
  ControlBoardPackagePosture,
  ControlBoardPostureTerms,
  ControlBoardViewMode,
} from "./control-board-model";

export const controlBoardViewOptions: Array<{
  label: string;
  view: ControlBoardViewMode;
}> = [
  { label: "Control Board", view: "control-board" },
  { label: "Family Map", view: "family-map" },
  { label: "ART Tree", view: "art-tree" },
];

export const controlBoardPostureOrder: ControlBoardPackagePosture[] = [
  "Ready",
  "In Progress",
  "Blocked",
  "Closeout Pending",
  "Deferred",
  "Done",
  "Retired",
];

export function controlBoardPostureTone(posture: ControlBoardPackagePosture) {
  switch (posture) {
    case "Blocked":
      return "danger";
    case "Closeout Pending":
    case "Deferred":
      return "warn";
    case "Done":
    case "In Progress":
      return "ok";
    case "Retired":
      return "muted";
    case "Ready":
    default:
      return "info";
  }
}

export function formatControlBoardPackageRef(sourceRef: string) {
  return sourceRef.replace(/^OpenProject\s+/i, "");
}

export function controlBoardPackageProgressLabels(
  packageSummary: ControlBoardPackage,
) {
  const { completedChildCount, progressPercent, totalChildCount } =
    packageSummary.progress;

  return {
    progressLabel: `Progress: ${progressPercent}%`,
    totalLabel: `Total: ${completedChildCount} / ${totalChildCount} Completed`,
  };
}

export function controlBoardFamilyGroupTone(
  packages: ControlBoardPackage[],
) {
  if (packages.some((controlPackage) => controlPackage.tone === "danger")) {
    return "danger";
  }

  if (packages.some((controlPackage) => controlPackage.tone === "warn")) {
    return "warn";
  }

  if (packages.some((controlPackage) => controlPackage.tone === "ok")) {
    return "ok";
  }

  if (packages.some((controlPackage) => controlPackage.tone === "stale")) {
    return "stale";
  }

  return "info";
}

export function summarizeControlBoardFamilyPackages({
  packages,
  postureTerms,
}: {
  packages: ControlBoardPackage[];
  postureTerms: ControlBoardPostureTerms;
}) {
  const parts = controlBoardPostureOrder
    .map((posture) => {
      const count = packages.filter(
        (controlPackage) => controlPackage.posture === posture,
      ).length;

      if (count === 0) {
        return null;
      }

      return `${count} ${postureTerms[posture].label.toLowerCase()}`;
    })
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "No package projected";
}

export function groupControlBoardPackagesByFamily({
  familyGroups,
  packages,
}: {
  familyGroups: ControlBoardFamilyGroup[];
  packages: ControlBoardPackage[];
}) {
  return familyGroups.map((group) => ({
    ...group,
    packages: group.packageIds
      .map((packageId) =>
        packages.find((controlPackage) => controlPackage.packageId === packageId),
      )
      .filter((controlPackage): controlPackage is ControlBoardPackage =>
        Boolean(controlPackage),
      ),
  }));
}
