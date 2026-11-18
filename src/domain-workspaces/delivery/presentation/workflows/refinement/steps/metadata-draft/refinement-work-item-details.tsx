"use client";

import { useState } from "react";
import { TerasContentTray, TerasDialog, TerasDocument, TerasUtilityButton } from "@/teras";
import type { DeliveryRefinementTreeNode } from "../../../../../read-model/index.ts";
import { refinementItemLabel } from "../../view-model/refinement-workbench-model.ts";

export function RefinementWorkItemDetails({ node }: { node: DeliveryRefinementTreeNode }) {
  const [open, setOpen] = useState(false);
  return <>
    <TerasUtilityButton onClick={() => setOpen(true)}>Read work item</TerasUtilityButton>
    <TerasDialog open={open} onClose={() => setOpen(false)} closeLabel="Close work item details"
      kicker={refinementItemLabel(node)} title={node.title} width="large" height="content" contentOverflow="auto">
      <TerasContentTray descriptionFormat="lines">
        <TerasDocument content={node.description} ariaLabel="Full work description" />
      </TerasContentTray>
    </TerasDialog>
  </>;
}
