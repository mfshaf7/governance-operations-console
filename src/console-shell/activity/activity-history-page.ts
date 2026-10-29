import type { GovernanceActivitySnapshot } from "../../governance-activity/governance-activity-types.ts";
// A page replaces the previous window. History browsing does not accumulate an
// unbounded browser ledger and never changes the independently refreshed head.
export async function readOlderActivityPage(snapshot: GovernanceActivitySnapshot, fetchImpl: typeof fetch = fetch, signal?: AbortSignal): Promise<GovernanceActivitySnapshot> {
    const continuations = snapshot.continuations ?? [];
    if (!continuations.length)
        return snapshot;
    const pages = await Promise.all(continuations.map(async (continuation) => {
        const query = new URLSearchParams(continuation);
        const response = await fetchImpl(`/api/governance-activity?${query}`, { cache: "no-store", signal });
        const page = await response.json() as GovernanceActivitySnapshot;
        if (!response.ok || page.mode !== "live" || page.status === "offline" || !Array.isArray(page.events) || !Array.isArray(page.sources) || page.events.length > 100)
            throw new Error("Older owner history is unavailable. The current page is retained; retry the same page.");
        if ((page.continuations ?? []).some(next => next.owner === continuation.owner && next.cursor === continuation.cursor))
            throw new Error("Owner history did not advance; the current page is retained.");
        return page;
    }));
    const events = new Map<string, GovernanceActivitySnapshot["events"][number]>();
    for (const page of pages)
        for (const event of page.events) {
            const previous = events.get(event.eventId);
            if (previous && JSON.stringify(previous) !== JSON.stringify(event))
                throw new Error("Conflicting owner history identity; the current page is retained.");
            events.set(event.eventId, event);
        }
    return { mode: "live", observedAt: pages.map(page => page.observedAt).sort().at(-1)!, status: pages.some(page => page.status !== "current") ? "partial" : "current", truncated: pages.some(page => page.truncated), error: null,
        sources: pages.flatMap(page => page.sources), continuations: pages.flatMap(page => page.continuations ?? []), events: [...events.values()].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.eventId.localeCompare(b.eventId)) };
}
