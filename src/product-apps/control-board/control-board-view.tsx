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
  ControlBoardPackage,
  ControlBoardPostureTerms,
} from "./control-board-model";
import { ControlBoardPackageCard } from "./control-board-package-card";
import {
  filterControlBoardPackages,
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
  const [queries, setQueries] = useState<Record<string, string>>({});
  const groupedPackages = controlBoardPostureOrder.map((posture) => ({
    posture,
    packages: packages.filter(
      (controlPackage) => controlPackage.posture === posture,
    ),
  }));

  return (
    <ControlBoardLaneRow>
      {groupedPackages.map(({ packages: posturePackages, posture }) => {
        const query = queries[posture] ?? "";
        const visible = filterControlBoardPackages(posturePackages, query);
        return <ControlBoardLanePanel
          count={posturePackages.length}
          description={postureTerms[posture].description}
          key={posture}
          search={{label:`Search ${postureTerms[posture].label} items`,value:query,
            onValueChange:value=>setQueries(current=>({...current,[posture]:value})),
            resultLabel:query.trim()?`${visible.length} of ${posturePackages.length} shown`:undefined}}
          title={postureTerms[posture].label}
          tone={controlBoardPostureTone(posture)}
        >
          {visible.length > 0 ? (
            <ControlBoardCardStack>
              {visible.map((controlPackage) => (
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
              {query.trim() ? "No items match this search." : "No package currently projects to this posture."}
            </TerasEmptyState>
          )}
        </ControlBoardLanePanel>;
      })}
    </ControlBoardLaneRow>
  );
}
