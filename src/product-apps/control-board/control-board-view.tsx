import {
  TerasEmptyState,
} from "@/teras";

import {
  ControlBoardCardStack,
  ControlBoardLanePanel,
  ControlBoardLaneRow,
} from "./control-board-dashboard";
import type {
  ControlBoardPackage,
  ControlBoardPostureTerms,
} from "./control-board-model";
import { ControlBoardPackageCard } from "./control-board-package-card";
import {
  controlBoardPostureOrder,
  controlBoardPostureTone,
} from "./control-board-view-model";

export function ControlBoardView({
  onSelectPackage,
  packages,
  postureTerms,
  selectedPackageId,
}: {
  onSelectPackage: (packageId: string) => void;
  packages: ControlBoardPackage[];
  postureTerms: ControlBoardPostureTerms;
  selectedPackageId: string | null;
}) {
  const groupedPackages = controlBoardPostureOrder.map((posture) => ({
    posture,
    packages: packages.filter(
      (controlPackage) => controlPackage.posture === posture,
    ),
  }));

  return (
    <ControlBoardLaneRow>
      {groupedPackages.map(({ packages: posturePackages, posture }) => (
        <ControlBoardLanePanel
          count={posturePackages.length}
          description={postureTerms[posture].description}
          key={posture}
          title={postureTerms[posture].label}
          tone={controlBoardPostureTone(posture)}
        >
          {posturePackages.length > 0 ? (
            <ControlBoardCardStack>
              {posturePackages.map((controlPackage) => (
                <ControlBoardPackageCard
                  key={controlPackage.packageId}
                  onSelectPackage={onSelectPackage}
                  packageSummary={controlPackage}
                  selected={controlPackage.packageId === selectedPackageId}
                />
              ))}
            </ControlBoardCardStack>
          ) : (
            <TerasEmptyState>
              No package currently projects to this posture.
            </TerasEmptyState>
          )}
        </ControlBoardLanePanel>
      ))}
    </ControlBoardLaneRow>
  );
}
