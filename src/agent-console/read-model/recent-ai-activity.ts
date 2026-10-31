import { resolveConsoleFixtureIsolation, type ConsoleOwnerMode, type ConsoleOwnerStatus } from "../../console-integration/fixture-isolation/console-fixture-isolation.ts";
import { recentAiActivityExamples } from "../fixtures/recent-ai-activity.fixture.ts";
import type { RecentAiActivity } from "../model/recent-ai-activity";

export type AiActivitySource = { mode: ConsoleOwnerMode | null; status: ConsoleOwnerStatus; observedAt: string | null };

export function selectRecentAiActivity(source: AiActivitySource): { examples: boolean; items: readonly RecentAiActivity[]; message: string } {
  const isolation = resolveConsoleFixtureIsolation(source);
  if (!isolation.fixtureAllowed) return {
    examples: false, items: [], message: source.status === "loading"
      ? "Checking activity coverage…"
      : "Activity examples are available only in disconnected preview.",
  };
  const observed = Date.parse(source.observedAt ?? "");
  if (!Number.isFinite(observed)) return { examples: false, items: [], message: "Activity preview time is unavailable." };
  return {
    examples: true,
    items: recentAiActivityExamples.map(({ minutesAgo, ...item }) => ({ ...item, occurredAt: new Date(observed - minutesAgo * 60_000).toISOString() })),
    message: "Preview examples · no model requests were run",
  };
}
