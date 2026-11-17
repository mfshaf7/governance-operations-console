"use client";

import type { ReactNode } from "react";

import { TerasPanel } from "@/teras";
import type { TerasTone } from "@/teras";

type RefinementMetadataEditorPane = "field" | "item";

export function RefinementMetadataEditorPanel({
  area,
  children,
  collapsed = false,
  hasActions = false,
  tone,
}: {
  area: RefinementMetadataEditorPane;
  children: ReactNode;
  collapsed?: boolean;
  hasActions?: boolean;
  tone: TerasTone;
}) {
  return (
    <TerasPanel
      fit="content"
      density={collapsed ? "compact" : undefined}
      frame="padded"
      treatment="rail"
      layout={
        collapsed
          ? undefined
          : area === "field" && hasActions
            ? "header-body-footer"
            : "header-body"
      }
      overflow="visible"
      spacing={collapsed ? "compact" : "loose"}
      tone={tone}
    >
      {children}
    </TerasPanel>
  );
}
