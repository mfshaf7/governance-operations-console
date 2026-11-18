import { contextBoardDiagrams } from "../../../../product-apps/context-board/context-board-diagrams.ts";
import type { ContextBoardCoreNode } from "../../../../product-apps/context-board/context-board-model.ts";
import type { WorkDesignFinalizedBrief, WorkDesignSnapshotAttachment } from "../../work-model/work-design/work-design-artifact-types.ts";
import type { WorkDesignBoardSnapshot } from "../../work-model/work-design/work-design-types.ts";

export type WorkDesignSnapshotAttachmentInput = {
  artifact: WorkDesignFinalizedBrief["snapshotArtifact"];
  coreNodes: ContextBoardCoreNode[];
  ref: string;
  snapshot: WorkDesignBoardSnapshot;
  summary: string;
  title: string;
};

/** Render every retained view; the selected canvas alone cannot represent a brief. */
export function workDesignDiagramCollectionAttachment(
  input: WorkDesignSnapshotAttachmentInput,
  render: (input: WorkDesignSnapshotAttachmentInput) => WorkDesignSnapshotAttachment,
): WorkDesignSnapshotAttachment {
  const views = contextBoardDiagrams(input.snapshot);
  const pages = views.map((view, index) => render({ ...input, artifact: null,
    ref: `${input.ref}/${view.id}`, snapshot: view.snapshot, summary: view.description,
    title: `${index + 1}. ${view.name}` }));
  const width = Math.max(...pages.map(page => page.width));
  const height = pages.reduce((total, page) => total + page.height + 40, 0);
  let offset = 0;
  const children = pages.map((page, index) => {
    if (!page.svg) throw Error("A retained diagram could not be rendered; the complete brief was not exported.");
    const prefix = `view-${index}-`;
    const svg = page.svg.replace(/id="([^"]+)"/g, `id="${prefix}$1"`)
      .replace(/url\(#([^\)]+)\)/g, `url(#${prefix}$1)`)
      .replace("<svg ", `<svg x="0" y="${offset}" `);
    offset += page.height + 40;
    return svg;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>Complete Context Brief — ${views.length} diagrams</title>${children.join("")}</svg>`;
  return { ...pages[0], diagramPreviews: pages, artifactId: input.artifact?.artifact_id ?? null,
    attachmentStatus: input.artifact?.attachment_status ?? "local_preview",
    boardSnapshotRef: input.ref, ref: input.ref, title: input.title, summary: input.summary,
    description: `Complete retained Context Brief containing ${views.length} named diagrams. Each view remains editable in its working brief.`,
    contentType: "image/svg+xml", fileName: "context-brief-diagrams.png", width, height,
    itemCount: pages.reduce((total, page) => total + page.itemCount, 0),
    connectorCount: pages.reduce((total, page) => total + page.connectorCount, 0),
    dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, svg };
}
