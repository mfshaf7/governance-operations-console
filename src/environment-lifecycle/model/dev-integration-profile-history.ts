import type {
  EnvironmentLifecycleProvenance,
} from "./environment-lifecycle-types.ts";

export type DevIntegrationProfileHistoryEventKind =
  | "handoff"
  | "lifecycle"
  | "runtime";

export type DevIntegrationProfileHistoryEvent = Readonly<{
  detail: string;
  eventId: string;
  kind: DevIntegrationProfileHistoryEventKind;
  label: string;
  occurredAt: string;
  profileId: string;
  provenance: EnvironmentLifecycleProvenance;
  sourceRef: string;
}>;

export function selectDevIntegrationProfileHistory(
  events: readonly DevIntegrationProfileHistoryEvent[],
  profileId: string,
): readonly DevIntegrationProfileHistoryEvent[] {
  return events
    .filter((event) => event.profileId === profileId)
    .sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt),
    );
}
