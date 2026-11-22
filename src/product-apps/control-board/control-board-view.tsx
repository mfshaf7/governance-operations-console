"use client";

import { useState, type ReactNode } from "react";
import { TerasEmptyState } from "@/teras";

import {
  ControlBoardCardStack,
  ControlBoardLanePanel,
  ControlBoardLaneRow,
} from "./control-board-dashboard";
import type {
  ControlBoardPackage,
  ControlBoardPackagePosture,
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
  hiddenEmptyPostures = [],
}: {
  onSelectPackage: (packageId: string) => void;
  packages: ControlBoardPackage[];
  postureTerms: ControlBoardPostureTerms;
  selectedPackageId: string | null;
  hiddenEmptyPostures?: ControlBoardPackage["posture"][];
}) {
  return (
    <ControlBoardStatusBoard
      groups={controlBoardPostureOrder.map(posture => ({
        posture,
        items: packages.filter(item => item.posture === posture),
      })).filter(group => group.items.length > 0 || !hiddenEmptyPostures.includes(group.posture))}
      postureTerms={postureTerms}
      emptyMessage="No package currently projects to this posture."
      filterItems={filterControlBoardPackages}
      renderItem={item => (
        <ControlBoardPackageCard
          key={item.packageId}
          onSelectPackage={onSelectPackage}
          packageSummary={item}
          selected={item.packageId === selectedPackageId}
        />
      )}
    />
  );
}

export function ControlBoardStatusBoard<Item>({
  groups,
  postureTerms,
  emptyMessage,
  filterItems,
  renderItem,
}: {
  groups: { posture: ControlBoardPackagePosture; items: Item[] }[];
  postureTerms: ControlBoardPostureTerms;
  emptyMessage: string;
  filterItems: (items: Item[], query: string) => Item[];
  renderItem: (item: Item) => ReactNode;
}) {
  const [queries, setQueries] = useState<Partial<Record<ControlBoardPackagePosture, string>>>({});

  return (
    <ControlBoardLaneRow>
      {groups.map(({ posture, items }) => {
        const query = queries[posture] ?? "";
        const visible = filterItems(items, query);
        const { label, description } = postureTerms[posture];

        return (
          <ControlBoardLanePanel
            count={items.length}
            description={description}
            key={posture}
            search={{
              label: `Search ${label} items`,
              value: query,
              onValueChange: value => setQueries(current => ({ ...current, [posture]: value })),
              resultLabel: query.trim() ? `${visible.length} of ${items.length} shown` : undefined,
            }}
            title={label}
            tone={controlBoardPostureTone(posture)}
          >
            {visible.length ? (
              <ControlBoardCardStack>{visible.map(renderItem)}</ControlBoardCardStack>
            ) : (
              <TerasEmptyState>{query.trim() ? "No items match this search." : emptyMessage}</TerasEmptyState>
            )}
          </ControlBoardLanePanel>
        );
      })}
    </ControlBoardLaneRow>
  );
}
