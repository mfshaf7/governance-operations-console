"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { downloadConsoleBlob } from "../../console-integration/browser-download.ts";
import type { GovernanceActivitySnapshot } from "../../governance-activity/governance-activity-types.ts";
import { consoleActivityOutcomeLabels, filterConsoleActivity, type ConsoleActivityOutcome } from "./console-activity-model.ts";
import { isRoutineActivityRead } from "./console-activity-view-model.ts";
import { readOlderActivityPage } from "./activity-history-page.ts";
export function useConsoleActivityController(snapshot: GovernanceActivitySnapshot) {
    const [dialogOpen, setDialogOpen] = useState(false), [outcome, setOutcome] = useState<ConsoleActivityOutcome | "all">("all"), [query, setQuery] = useState(""), [source, setSource] = useState("all");
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null), [includeRoutine, setIncludeRoutine] = useState(false);
    const [historyPage, setHistoryPage] = useState<GovernanceActivitySnapshot | null>(null), [pageNumber, setPageNumber] = useState(0), [loading, setLoading] = useState(false), [error, setError] = useState<string | null>(null);
    const activeRead = useRef<AbortController | null>(null);
    useEffect(() => () => activeRead.current?.abort(), []);
    const currentPage = historyPage ?? snapshot;
    const visibleHead = useMemo(() => snapshot.events.filter(event => includeRoutine || !isRoutineActivityRead(event)), [snapshot.events, includeRoutine]);
    const recentEvents = visibleHead.slice(0, 8);
    const retainedSelection = historyPage?.events.find(event => event.eventId === selectedEventId && (includeRoutine || !isRoutineActivityRead(event)));
    const selectedEvent = visibleHead.find(event => event.eventId === selectedEventId) ?? retainedSelection ?? visibleHead[0] ?? null;
    const filteredEvents = useMemo(() => filterConsoleActivity(currentPage.events.filter(event => includeRoutine || !isRoutineActivityRead(event)), { outcome, query, source }), [currentPage.events, includeRoutine, outcome, query, source]);
    const dialogSelectedEvent = filteredEvents.find(event => event.eventId === selectedEventId) ?? filteredEvents[0] ?? null;
    const sourceOptions = useMemo(() => [{ label: "All sources", value: "all" }, ...[...new Map(currentPage.events.map(event => [event.source.owner, event.source.label])).entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }))], [currentPage.events]);
    const outcomeOptions = useMemo(() => [{ label: "All outcomes", value: "all" }, ...Object.entries(consoleActivityOutcomeLabels).filter(([value]) => currentPage.events.some(event => event.outcome === value)).map(([value, label]) => ({ value, label }))], [currentPage.events]);
    function openFullActivity() { setSelectedEventId(selectedEvent?.eventId ?? null); setDialogOpen(true); }
    function closeHistory() { setSelectedEventId(dialogSelectedEvent?.eventId ?? null); activeRead.current?.abort(); activeRead.current = null; setLoading(false); setDialogOpen(false); }
    async function loadOlder() {
        if (activeRead.current)
            return;
        const controller = new AbortController();
        activeRead.current = controller;
        setLoading(true);
        setError(null);
        try {
            const page = await readOlderActivityPage(currentPage, fetch, controller.signal);
            if (!controller.signal.aborted) {
                setHistoryPage(page);
                setPageNumber(value => value + 1);
                setSelectedEventId(null);
            }
        }
        catch (error) {
            if (!controller.signal.aborted)
                setError(error instanceof Error ? error.message : "Older history is unavailable; this page is retained.");
        }
        finally {
            if (activeRead.current === controller) {
                activeRead.current = null;
                setLoading(false);
            }
        }
    }
    function latest() { activeRead.current?.abort(); activeRead.current = null; setLoading(false); setHistoryPage(null); setPageNumber(0); setError(null); setSelectedEventId(null); }
    function exportActivity() {
        const exportedAt = new Date().toISOString();
        const payload = { eventCount: filteredEvents.length, events: filteredEvents, exportedAt, filters: { outcome, query: query.trim(), source, includeRoutineReads: includeRoutine }, observedAt: currentPage.observedAt, projectionMode: currentPage.mode, projectionStatus: currentPage.status, schemaVersion: 2, scope: "governance-activity-loaded-page", source: "governance-operations-console", sources: currentPage.sources, truncated: currentPage.truncated, hasOlderPages: Boolean(currentPage.continuations?.length), pageNumber };
        downloadConsoleBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `governance-activity-${exportedAt.slice(0, 10)}.json`);
    }
    return { dialogOpen, outcome, setOutcome, query, setQuery, source, setSource, includeRoutine, setIncludeRoutine, recentEvents, visibleHead, hiddenRoutineCount: snapshot.events.length - visibleHead.length, selectedEvent, filteredEvents, dialogSelectedEvent, sourceOptions, outcomeOptions, setSelectedEventId, openFullActivity, closeHistory, currentPage, pageNumber, loading, error, loadOlder, latest, exportActivity };
}
