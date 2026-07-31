"use client";

import { BuildTreeScaffoldDialog } from "@/product-apps/build-tree";
import { TerasActionButton, TerasDialog } from "@/teras";
import {
  workDesignNodeDisplayTitle,
  workDesignNodeKindLabel,
  workDesignScaffoldTraceSummary,
} from "../../../../../product-adapters/build-tree/index.ts";
import type { WorkDesignScaffoldSection } from "../../../../../product-adapters/build-tree/index.ts";
import type { WorkDesignNode } from "../../model/work-design-model.ts";

type WorkDesignScaffoldDialogProps = {
  applyScaffold: () => void;
  closeScaffold: () => void;
  operatorScaffoldSections: WorkDesignScaffoldSection[];
  scaffoldNode: WorkDesignNode | null;
  traceScaffoldSections: WorkDesignScaffoldSection[];
  updateScaffoldSection: (sectionId: string, value: string) => void;
};

export function WorkDesignScaffoldDialog({
  applyScaffold,
  closeScaffold,
  operatorScaffoldSections,
  scaffoldNode,
  traceScaffoldSections,
  updateScaffoldSection,
}: WorkDesignScaffoldDialogProps) {
  return (
    <BuildTreeScaffoldDialog
      copy={{
        description:
          "Capture contract-aware narrative seeds from the finalized context brief. Refinement materializes execution metadata and backend-safe fields later.",
      }}
      onApply={applyScaffold}
      onClose={closeScaffold}
      onSectionValueChange={updateScaffoldSection}
      operatorSections={operatorScaffoldSections}
      subject={
        scaffoldNode
          ? {
              description: scaffoldNode.description,
              kindLabel: workDesignNodeKindLabel(scaffoldNode.kind),
              title: workDesignNodeDisplayTitle(scaffoldNode),
            }
          : null
      }
      traceSections={traceScaffoldSections}
      traceSummary={workDesignScaffoldTraceSummary(traceScaffoldSections)}
    />
  );
}

type WorkDesignDeleteDraftItemDialogProps = {
  confirmDelete: () => void;
  deleteRequestNode: WorkDesignNode | null;
  setDeleteRequestNode: (node: WorkDesignNode | null) => void;
};

export function WorkDesignDeleteDraftItemDialog({
  confirmDelete,
  deleteRequestNode,
  setDeleteRequestNode,
}: WorkDesignDeleteDraftItemDialogProps) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="compact"
      actions={
        <>
          <TerasActionButton
            onClick={() => setDeleteRequestNode(null)}
            emphasis="secondary"
          >
            Keep Item
          </TerasActionButton>
          <TerasActionButton
            onClick={confirmDelete}
            tone="danger"
            emphasis="primary"
          >
            Remove
          </TerasActionButton>
        </>
      }
      description={
        deleteRequestNode
          ? `Remove ${deleteRequestNode.title} from this local work-design draft.`
          : undefined
      }
      kicker="Delete Draft Item"
      open={Boolean(deleteRequestNode)}
      title="Remove Draft Item?"
    />
  );
}

type WorkDesignDeleteGuardDialogProps = {
  deleteBlockedNode: WorkDesignNode | null;
  setDeleteBlockedNode: (node: WorkDesignNode | null) => void;
};

export function WorkDesignDeleteGuardDialog({
  deleteBlockedNode,
  setDeleteBlockedNode,
}: WorkDesignDeleteGuardDialogProps) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="compact"
      actions={
        <TerasActionButton onClick={() => setDeleteBlockedNode(null)}>
          Understood
        </TerasActionButton>
      }
      description={
        deleteBlockedNode
          ? `${deleteBlockedNode.title} still has child User stories. Remove those individually before deleting the Feature.`
          : undefined
      }
      kicker="Delete Guard"
      open={Boolean(deleteBlockedNode)}
      title="Remove Child Items First"
    />
  );
}
