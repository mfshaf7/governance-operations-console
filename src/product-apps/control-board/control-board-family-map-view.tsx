import {
  TerasEmptyState,
} from "@/teras";

import {
  ControlBoardCardStack,
  ControlBoardLanePanel,
  ControlBoardLaneRow,
} from "./control-board-dashboard";
import type {
  ControlBoardFamilyGroup,
  ControlBoardPackage,
  ControlBoardPostureTerms,
} from "./control-board-model";
import { ControlBoardPackageCard } from "./control-board-package-card";
import {
  controlBoardFamilyGroupTone,
  groupControlBoardPackagesByFamily,
  summarizeControlBoardFamilyPackages,
} from "./control-board-view-model";

export function ControlBoardFamilyMapView({
  familyGroups,
  onSelectPackage,
  packages,
  postureTerms,
  selectedPackageId,
}: {
  familyGroups: ControlBoardFamilyGroup[];
  onSelectPackage: (packageId: string) => void;
  packages: ControlBoardPackage[];
  postureTerms: ControlBoardPostureTerms;
  selectedPackageId: string | null;
}) {
  const groupedPackages = groupControlBoardPackagesByFamily({
    familyGroups,
    packages,
  });

  return (
    <ControlBoardLaneRow>
      {groupedPackages.map((group) => {
        const groupSelected = group.packages.some(
          (controlPackage) => controlPackage.packageId === selectedPackageId,
        );

        return (
          <ControlBoardLanePanel
            count={group.packages.length}
            description={summarizeControlBoardFamilyPackages({
              packages: group.packages,
              postureTerms,
            })}
            key={group.id}
            title={group.label}
            tone={
              groupSelected ? "warn" : controlBoardFamilyGroupTone(group.packages)
            }
          >
            <ControlBoardCardStack>
              {group.packages.length > 0 ? (
                group.packages.map((controlPackage) => (
                  <ControlBoardPackageCard
                    key={controlPackage.packageId}
                    onSelectPackage={onSelectPackage}
                    packageSummary={controlPackage}
                    selected={controlPackage.packageId === selectedPackageId}
                  />
                ))
              ) : (
                <TerasEmptyState>
                  No package currently projects to this family.
                </TerasEmptyState>
              )}
            </ControlBoardCardStack>
          </ControlBoardLanePanel>
        );
      })}
    </ControlBoardLaneRow>
  );
}
