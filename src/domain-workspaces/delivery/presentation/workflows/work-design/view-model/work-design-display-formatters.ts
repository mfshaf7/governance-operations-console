import type {
  DeliveryTone,
  DeliveryWorkDesignSnapshotAttachmentDisplayStatus,
} from "../../../../read-model/index.ts";

export function formatWorkDesignDateTime(isoValue: string) {
  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function workDesignSnapshotAttachmentStatusLabel(
  status: DeliveryWorkDesignSnapshotAttachmentDisplayStatus,
) {
  switch (status) {
    case "attached":
      return "attached";
    case "failed":
      return "failed";
    case "pending_apply":
      return "pending OOS attach";
    case "skipped":
      return "skipped";
    case "superseded":
      return "superseded";
    case "local_preview":
    default:
      return "local preview";
  }
}

export function workDesignSnapshotAttachmentStatusTone(
  status: DeliveryWorkDesignSnapshotAttachmentDisplayStatus,
): DeliveryTone {
  switch (status) {
    case "attached":
      return "ok";
    case "failed":
      return "danger";
    case "pending_apply":
      return "warn";
    case "skipped":
    case "superseded":
      return "muted";
    case "local_preview":
    default:
      return "info";
  }
}
