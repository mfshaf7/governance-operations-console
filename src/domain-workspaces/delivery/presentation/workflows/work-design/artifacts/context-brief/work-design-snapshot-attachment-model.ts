import { workDesignFileSlug } from "../../../../../work-model/work-design/work-design-artifact-types.ts";
import type {
  WorkDesignSnapshotAttachment,
  WorkDesignSnapshotCaptureBounds,
} from "../../../../../work-model/work-design/work-design-artifact-types.ts";

export function workDesignSnapshotAttachmentSourceLabel(
  source: WorkDesignSnapshotAttachment["source"],
) {
  return source === "canvas_screenshot"
    ? "Canvas Screenshot"
    : "Stored Board State Preview";
}

export function workDesignCanvasScreenshotAttachment({
  baseAttachment,
  bounds,
  dataUrl,
  fingerprint,
}: {
  baseAttachment: WorkDesignSnapshotAttachment;
  bounds: WorkDesignSnapshotCaptureBounds;
  dataUrl: string;
  fingerprint: string;
}): WorkDesignSnapshotAttachment {
  const slug = workDesignFileSlug(baseAttachment.title || "context-snapshot");

  return {
    ...baseAttachment,
    capturedAt: new Date().toISOString(),
    checksum: null,
    contentType: "image/png",
    dataUrl,
    description:
      "Rendered canvas screenshot captured from the Work Design board. Board State Ref remains the machine-readable truth.",
    fileName: `${slug}-canvas-screenshot.png`,
    fingerprint,
    height: bounds.height,
    source: "canvas_screenshot",
    svg: null,
    width: bounds.width,
  };
}
