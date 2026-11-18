import type { DeliveryTone } from "../../../../read-model/index.ts";

export type WorkDesignApplyEvent = {
  marker: string;
  text: string;
  timestamp: string;
  tone: DeliveryTone;
};

export type WorkDesignApplyFeedback = {
  pending: boolean;
  needsCheck: boolean;
  events: WorkDesignApplyEvent[];
};

export function workDesignLiveApplyChecklist({ complete, ready, feedback, error }: {
  complete: boolean; ready: boolean; feedback?: WorkDesignApplyFeedback; error: string | null;
}) {
  const pending = feedback?.pending ?? false;
  const uncertain = !complete && (feedback?.needsCheck || Boolean(error));
  return [
    { label: "Review Apply Input", status: complete || pending || uncertain ? "complete" : ready ? "ready" : "locked",
      tone: complete || pending || uncertain ? "ok" as const : "warn" as const,
      detail: "The reviewed tree, source revision and operator acceptance bind this update." },
    { label: "Apply Reviewed Tree", status: complete ? "complete" : pending ? "processing" : uncertain ? "unconfirmed" : ready ? "queued" : "locked",
      tone: complete ? "ok" as const : "warn" as const,
      detail: complete ? "The durable receipt confirms canonical application and readback."
        : pending ? "Waiting for backend validation and update. Intermediate backend steps are not streamed."
        : uncertain ? error ?? "Check the original application before submitting again."
        : "One submission requests backend validation and the canonical update." },
    { label: "Confirm Receipt", status: complete ? "complete" : uncertain ? "unconfirmed" : "waiting",
      tone: complete ? "ok" as const : "muted" as const,
      detail: complete ? "The confirmed application receipt is available in History."
        : "Completion requires a matching durable receipt; a waiting or interrupted request is not completion." },
  ];
}

export function workDesignLiveApplyLog({ complete, feedback, recordedAt, target }: {
  complete: boolean; feedback?: WorkDesignApplyFeedback; recordedAt: string; target: string;
}): WorkDesignApplyEvent[] {
  if (feedback?.events.length) return feedback.events;
  return complete ? [{ marker: "[ok]", tone: "ok", timestamp: recordedAt,
    text: `Retained application receipt records canonical completion for ${target}. Timestamp is the receipt's application time. Intermediate event times were not retained.` }] : [];
}
