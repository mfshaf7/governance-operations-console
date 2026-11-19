"use client";

import { useState, type ComponentProps } from "react";
import { TerasActionButton, TerasContentFrame, TerasModalShell } from "@/teras";
import { refinementMetadataTargets } from "../../view-model/refinement-metadata-model.ts";
import { RefinementMetadataWorkbenchView } from "./refinement-metadata-workbench-view.tsx";

type TreeProps = Pick<ComponentProps<typeof RefinementMetadataWorkbenchView>,
  "packet" | "metadataDraftValues" | "metadataFieldResolutions" | "selectedMetadataFieldKey">;
const inspectOnly = () => {};

export function RefinementTreeReviewDialog({ workbench, onClose }: {
  workbench: TreeProps;
  onClose: () => void;
}) {
  const targets = refinementMetadataTargets(workbench.packet);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [focusedItem, setFocusedItem] = useState(() =>
    targets.find(target => target.key === workbench.selectedMetadataFieldKey)?.node.id ?? workbench.packet.target_tree.id);
  return (
    <TerasModalShell height="fill" width="large" bodyLayout="fill"
      surfaceId="delivery-refinement-tree-review"
      modalAttributes={{ "data-delivery-workflow-readonly": "true" }}
      kicker="Refinement · Read-only" title="Metadata Workbench"
      description="Expand work items and fields to inspect the reviewed metadata."
      onClose={onClose}
      footer={<TerasActionButton onClick={onClose}>Back to Readiness</TerasActionButton>}>
      <TerasContentFrame fill variant="single-region">
        <RefinementMetadataWorkbenchView {...workbench} readOnly
          selectedMetadataFieldKey={selectedField}
          onSelectMetadataField={key => setSelectedField(current => current === key ? null : key)}
          focusedItemId={focusedItem} onSelectItem={id => { setFocusedItem(id); setSelectedField(null); }}
          metadataSelectionMode="single" onSelectMetadataSelectionMode={inspectOnly}
          selectedMetadataBulkNodeIds={[]} onToggleMetadataBulkNode={inspectOnly} />
      </TerasContentFrame>
    </TerasModalShell>
  );
}
