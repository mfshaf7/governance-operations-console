import type { DeliveryTone } from "../../../../../read-model/index.ts";
import type {
  WorkDesignBoardSnapshot,
  WorkDesignContextDecision,
} from "../../model/work-design-model.ts";

export function workDesignContextFingerprint({
  decision,
  note,
  snapshot,
  sources,
}: {
  decision: WorkDesignContextDecision;
  note: string;
  snapshot: WorkDesignBoardSnapshot;
  sources: Array<{
    label: string;
    status: string;
    tone: DeliveryTone;
  }>;
}) {
  return JSON.stringify({
    connections: snapshot.connections,
    customItems: snapshot.customItems,
    decision,
    note: note.trim(),
    positions: snapshot.positions,
    removedCoreIds: snapshot.removedCoreIds,
    sketchStrokes: snapshot.sketchStrokes,
    sources: sources.map((source) => ({
      label: source.label,
      status: source.status,
      tone: source.tone,
    })),
    style: snapshot.style,
    templateTrays: snapshot.templateTrays,
  });
}
