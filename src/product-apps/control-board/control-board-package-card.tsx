import { TerasStatusPill } from "@/teras";

import {
  ControlBoardCard,
  ControlBoardCardProgress,
} from "./control-board-dashboard";
import type { ControlBoardPackage } from "./control-board-model";
import {
  controlBoardPackageProgressLabels,
  formatControlBoardPackageRef,
} from "./control-board-view-model";

export function ControlBoardPackageCard({
  onSelectPackage,
  packageSummary,
  selected,
}: {
  onSelectPackage: (packageId: string) => void;
  packageSummary: ControlBoardPackage;
  selected: boolean;
}) {
  const progress = controlBoardPackageProgressLabels(packageSummary);

  return (
    <ControlBoardCard
      detail={
        <ControlBoardCardProgress
          progressLabel={progress.progressLabel}
          totalLabel={progress.totalLabel}
        />
      }
      kicker={formatControlBoardPackageRef(packageSummary.sourceRef)}
      onClick={() => onSelectPackage(packageSummary.packageId)}
      pills={
        <>
          <TerasStatusPill tone={packageSummary.tone}>
            {packageSummary.posture}
          </TerasStatusPill>
          <TerasStatusPill tone="muted">
            {packageSummary.openChildCount} open
          </TerasStatusPill>
        </>
      }
      selected={selected}
      title={packageSummary.displayName}
      tone={packageSummary.tone}
    />
  );
}
