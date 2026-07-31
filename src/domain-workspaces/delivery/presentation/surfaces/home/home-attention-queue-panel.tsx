"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

import {
  TerasEmptyState,
  TerasFilterBar,
  TerasPanel,
  TerasPanelHeader,
  TerasList,
  TerasSignalItem,
} from "@/teras";

import type {
  DeliveryHomeAttentionItem,
  DeliveryHomeTarget,
  DeliveryHomeAttentionFilter,
} from "./home-view-model.ts";
import {
  deliveryHomeAttentionFilterOptions,
  deliveryHomeAttentionPanelProjection,
} from "./home-view-model.ts";

export function DeliveryHomeAttentionQueuePanel({
  attentionQueue,
  onRouteToTarget,
}: {
  attentionQueue: DeliveryHomeAttentionItem[];
  onRouteToTarget: (
    target: DeliveryHomeTarget | { surfaceId: "catalog" } | null,
  ) => void;
}) {
  const [attentionFilter, setAttentionFilter] =
    useState<DeliveryHomeAttentionFilter>("all");
  const [attentionSearch, setAttentionSearch] = useState("");
  const normalizedAttentionSearch = attentionSearch.trim().toLowerCase();
  const filteredAttentionQueue = attentionQueue.filter((item) => {
    const matchesFilter =
      attentionFilter === "all" || item.tone === attentionFilter;
    const matchesSearch = normalizedAttentionSearch
      ? [item.actionLabel, item.detail, item.label, item.title, item.tone]
          .join(" ")
          .toLowerCase()
          .includes(normalizedAttentionSearch)
      : true;

    return matchesFilter && matchesSearch;
  });
  const panelProjection = deliveryHomeAttentionPanelProjection({
    filteredCount: filteredAttentionQueue.length,
    totalCount: attentionQueue.length,
  });

  return (
    <TerasPanel
      fit="fill"
      frame="padded"
      treatment="neutral"
      layout="header-toolbar-body"
      overflow="hidden"
    >
      <TerasPanelHeader
        kicker="Attention Queue"
        statusLabel={panelProjection.statusLabel}
        statusTone={panelProjection.tone}
        title="Ranked Delivery moves"
        description="Operator-decision queue from projected sources and packages."
      />
      <TerasFilterBar
        data-delivery-home-filter="attention"
        search={{
          ariaLabel: "Search attention queue",
          onValueChange: setAttentionSearch,
          placeholder: "Search queue",
          value: attentionSearch,
        }}
        filters={[
          {
            label: "Filter attention queue",
            onValueChange: setAttentionFilter,
            options: deliveryHomeAttentionFilterOptions,
            value: attentionFilter,
          },
        ]}
      />
      {filteredAttentionQueue.length > 0 ? (
        <TerasList fit="fill" frame="contained">
          {filteredAttentionQueue.map((item) => (
            <TerasSignalItem
              actionLabel={
                <>
                  {item.actionLabel}
                  <ArrowUpRight aria-hidden="true" size={12} />
                </>
              }
              ariaLabel={`${item.actionLabel}: ${item.title}`}
              detail={item.detail}
              key={`${item.rank}-${item.title}`}
              label={item.label}
              onSelect={() => onRouteToTarget(item.target)}
              title={item.title}
              tone={item.tone}
            />
          ))}
        </TerasList>
      ) : (
        <TerasEmptyState fill>
          No attention item matches the current filters.
        </TerasEmptyState>
      )}
    </TerasPanel>
  );
}
