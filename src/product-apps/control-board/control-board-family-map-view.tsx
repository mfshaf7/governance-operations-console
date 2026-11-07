"use client";

import { useState } from "react";
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
  filterControlBoardPackages,
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
  const [queries, setQueries] = useState<Record<string, string>>({});
  const groupedPackages = groupControlBoardPackagesByFamily({
    familyGroups,
    packages,
  });

  return (
    <ControlBoardLaneRow>
      {groupedPackages.map((group) => {
        const query = queries[group.id] ?? "";
        const visible = filterControlBoardPackages(group.packages, query);
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
            search={{label:`Search ${group.label} items`,value:query,
              onValueChange:value=>setQueries(current=>({...current,[group.id]:value})),
              resultLabel:query.trim()?`${visible.length} of ${group.packages.length} shown`:undefined}}
            title={group.label}
            tone={
              groupSelected ? "warn" : controlBoardFamilyGroupTone(group.packages)
            }
          >
            <ControlBoardCardStack>
              {visible.length > 0 ? (
                visible.map((controlPackage) => (
                  <ControlBoardPackageCard
                    key={controlPackage.packageId}
                    onSelectPackage={onSelectPackage}
                    packageSummary={controlPackage}
                    selected={controlPackage.packageId === selectedPackageId}
                  />
                ))
              ) : (
                <TerasEmptyState>
                  {query.trim() ? "No items match this search." : "No package currently projects to this family."}
                </TerasEmptyState>
              )}
            </ControlBoardCardStack>
          </ControlBoardLanePanel>
        );
      })}
    </ControlBoardLaneRow>
  );
}
