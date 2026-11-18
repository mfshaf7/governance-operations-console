"use client";

import { useState, type ComponentProps } from "react";
import { Maximize2 } from "lucide-react";
import { TerasMediaSnapshot, TerasMediaSnapshotNavigation, TerasMediaSnapshotViewerDialog, TerasTrayStack } from "@/teras";
import type { WorkDesignSnapshotAttachment } from "./work-design-context-brief-model.ts";

function useDiagramPreview(attachment: WorkDesignSnapshotAttachment) {
  const [selection, setSelection] = useState({ attachment, index: 0 });
  const pages = attachment.diagramPreviews?.length ? attachment.diagramPreviews : [attachment];
  const index = selection.attachment === attachment ? Math.min(selection.index, pages.length - 1) : 0;
  return { pages, index, selected: pages[index], select: (next: number) => setSelection({ attachment, index: next }) };
}

function DiagramNavigation({ index, total, title, select }: { index: number; total: number; title: string; select: (index: number) => void }) {
  return <TerasMediaSnapshotNavigation index={index} total={total}
    title={title.replace(/^\d+\. /, "")} onSelect={select} />;
}

type ViewerProps = Omit<ComponentProps<typeof TerasMediaSnapshotViewerDialog>, "imageSrc" | "imageAlt" | "toolbarTitle" | "navigation"> & {
  attachment: WorkDesignSnapshotAttachment;
};

export function WorkDesignSnapshotViewerDialog({ attachment, ...props }: ViewerProps) {
  const { selected, pages, index, select } = useDiagramPreview(attachment);
  return <TerasMediaSnapshotViewerDialog {...props}
    imageAlt={`${selected.title} full snapshot attachment`} imageSrc={selected.dataUrl}
    toolbarTitle={<span role="status" aria-live="polite">Diagram {index + 1} of {pages.length}</span>}
    navigation={pages.length > 1 ? <DiagramNavigation index={index} total={pages.length} title={selected.title} select={select} /> : undefined} />;
}

/** Browse derived views without changing the complete retained/exported artifact. */
export function WorkDesignSnapshotPreview({ attachment, ...props }: Omit<ComponentProps<typeof TerasMediaSnapshot>, "imageSrc" | "imageAlt" | "onPreview" | "title" | "actions"> & {
  attachment: WorkDesignSnapshotAttachment;
  exportAction: NonNullable<ComponentProps<typeof TerasMediaSnapshot>["actions"]>[number];
}) {
  const { exportAction, ...mediaProps } = props;
  const { selected, pages, index, select } = useDiagramPreview(attachment);
  const [viewerOpen, setViewerOpen] = useState(false);
  return <TerasTrayStack spacing="normal">
    <TerasMediaSnapshot {...mediaProps} imageAlt={`${selected.title} snapshot attachment`} imageSrc={selected.dataUrl}
      title={pages.length > 1 ? <span role="status" aria-live="polite">Diagram {index + 1} of {pages.length}</span> : undefined}
      previewOverlay={pages.length > 1 ? <DiagramNavigation index={index} total={pages.length} title={selected.title} select={select} /> : undefined}
      onPreview={() => setViewerOpen(true)}
      actions={[{ icon: <Maximize2 aria-hidden="true" size={14} />, label: "View Snapshot", onClick: () => setViewerOpen(true), tone: "warn" }, exportAction]} />
    <TerasMediaSnapshotViewerDialog open={viewerOpen} onClose={() => setViewerOpen(false)}
      title="Context Snapshot Viewer" kicker="Retained Context Diagram"
      toolbarTitle={<span role="status" aria-live="polite">Diagram {index + 1} of {pages.length}</span>}
      imageAlt={`${selected.title} full snapshot attachment`} imageSrc={selected.dataUrl}
      navigation={pages.length > 1 ? <DiagramNavigation index={index} total={pages.length} title={selected.title} select={select} /> : undefined}
      exportAction={exportAction} />
  </TerasTrayStack>;
}
