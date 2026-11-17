"use client";

import { useEffect, useRef, useState } from "react";
import { createSavedWorkBrowserSession, type SavedWorkBrowserSession } from "../../console-integration/saved-work/browser-session.ts";
import { conversationBindingText, conversationId, readAdvisorConversation, type AdvisorConversation,
  type ConversationBinding } from "../model/advisor-conversation.ts";

/** Existing private saved-input custody; never invokes AI or attests model proof. */
export function useAdvisorConversation(binding: ConversationBinding | null, sourceRevision: string | null) {
  const identity = binding ? conversationBindingText(binding) : "";
  const current = useRef<{ identity: string; value: AdvisorConversation; session: SavedWorkBrowserSession; volatile: boolean } | null>(null);
  const [value, setValue] = useState<AdvisorConversation | null>(null);
  const [status, setStatus] = useState("Conversation not selected");
  const [loading, setLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState(false);
  const [restoreVersion, setRestoreVersion] = useState(0);
  const [visibleCount, setVisibleCount] = useState(50);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftText = useRef<string | null>(null);
  useEffect(() => {
    let active = true; let unsubscribe = () => {};
    const selected = binding;
    current.current = null; draftText.current = null; setValue(null); setVisibleCount(50); setRecoveryError(false);
    if (!selected) { setLoading(false); setStatus("Conversation not selected"); return; }
    setLoading(true); setStatus("Reading saved conversation…");
    void (async () => {
      const id = await conversationId(selected);
      if (!active) return;
      let storage: Storage | null = null; try { storage = window.localStorage; } catch { /* Server custody remains available. */ }
      const session = createSavedWorkBrowserSession(`advisor-conversation:${id}:v1`, { storage });
      const update = () => { if (active) setStatus(session.getSnapshot().message); };
      unsubscribe = session.subscribe(update);
      const initial: AdvisorConversation = { schemaVersion: 1, conversationId: id,
        binding: selected, sourceRevision, turns: [], pending: null };
      current.current = { identity, value: initial, session, volatile: false };
      await session.initialize(false, candidate => {
        try { return readAdvisorConversation(JSON.stringify(candidate), selected, id); } catch { return null; }
      });
      if (!active) { unsubscribe(); return; }
      const restored = readAdvisorConversation(session.read(), selected, id);
      const next = restored ?? initial;
      current.current.value = next; setValue(next);
      if (draftText.current !== null && draftText.current !== next.draftPrompt) setDraftPrompt(draftText.current);
      if (restored?.pending) setStatus("Earlier request outcome is unconfirmed. Restoring history did not retry it or apply edits.");
    })().catch(error => { if (active) { setRecoveryError(true); setStatus(error instanceof Error ? error.message : "Conversation history unavailable."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; unsubscribe(); const previous = current.current;
      if (draftTimer.current) { clearTimeout(draftTimer.current); draftTimer.current = null; }
      if (previous?.identity === identity && !previous.volatile && previous.session.getSnapshot().hydrated && draftText.current !== null) {
        previous.value = { ...previous.value, draftPrompt: draftText.current }; previous.session.write(previous.value);
      }
      if (previous?.identity === identity && !previous.volatile && previous.session.getSnapshot().hydrated) void previous.session.retry(); };
    // Source revisions update context, not the identity of the working conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  function write(next: AdvisorConversation) {
    const state = current.current;
    if (!state || state.identity !== identity) return;
    state.value = next; setValue(next);
    if (state.volatile) { setStatus("Current context only · conversation is not server-saved"); return; }
    // A failed hydration must not overwrite a server conversation with empty input.
    if (!state.session.getSnapshot().hydrated) { setStatus("History unavailable. New working messages are not saved to the server."); return; }
    state.session.write(next);
  }
  function pending(request: Record<string, unknown> | null) {
    const state = current.current;
    if (state?.identity !== identity) return;
    const nested = request?.request as { prompt?: unknown } | undefined;
    const prompt = typeof request?.prompt === "string" ? request.prompt : typeof nested?.prompt === "string" ? nested.prompt : null;
    const turnId = prompt === null ? null : crypto.randomUUID();
    write({ ...state.value, sourceRevision, pending: request ? { ...request, ...(turnId ? { turnId } : {}) } : null,
      turns: prompt === null ? state.value.turns : [...state.value.turns,
        { id: turnId!, role: "operator", text: prompt, createdAt: new Date().toISOString(), sourceRevision }] });
  }
  function complete(prompt: string, reply: string) {
    const state = current.current;
    if (!state || state.identity !== identity) return;
    const createdAt = new Date().toISOString();
    const hasPendingTurn = state.value.turns.some(turn => turn.id === state.value.pending?.turnId && turn.text === prompt);
    draftText.current = ""; if (draftTimer.current) clearTimeout(draftTimer.current);
    write({ ...state.value, sourceRevision, pending: null, draftPrompt: "", turns: [...state.value.turns,
      ...(hasPendingTurn ? [] : [{ id: crypto.randomUUID(), role: "operator" as const, text: prompt, createdAt, sourceRevision }]),
      { id: crypto.randomUUID(), role: "advisor", text: reply, createdAt, sourceRevision }] });
  }
  async function recover(action: () => Promise<void>) {
    setRecoveryError(false);
    try { await action(); } catch (error) {
      setRecoveryError(true); setStatus(error instanceof Error ? error.message : "Conversation recovery is unavailable. Working input is retained.");
    }
  }
  async function retry() {
    const state = current.current;
    if (!state || state.identity !== identity || !binding) return;
    const hydrated = state.session.getSnapshot().hydrated;
    await state.session.retry();
    if (current.current !== state) return;
    if (state.volatile) { setStatus("Current context only · choose server or browser conversation before saving"); return; }
    if (!hydrated && state.session.getSnapshot().hydrated) {
      const restored = readAdvisorConversation(state.session.read(), binding, state.value.conversationId);
      const next = restored ?? { ...state.value, turns: [], pending: null };
      state.value = next; setValue(next);
      if (draftText.current !== null) setDraftPrompt(draftText.current);
      setRestoreVersion(version => version + 1);
    }
  }
  function setDraftPrompt(text: string) {
    draftText.current = text;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => { const state = current.current;
      if (state?.identity === identity) write({ ...state.value, draftPrompt: text });
    }, 300);
  }
  async function useServerCopy() {
    const state = current.current;
    if (!state || state.identity !== identity || !binding) return;
    if (state.volatile && (state.value.turns.length || state.value.draftPrompt)) await state.session.preserveWorking(state.value);
    await state.session.useServerCopy();
    if (current.current !== state) return;
    state.volatile = false;
    const restored = readAdvisorConversation(state.session.read(), binding, state.value.conversationId);
    const next = restored ?? { ...state.value, turns: [], pending: null };
    draftText.current = null;
    if (draftTimer.current) { clearTimeout(draftTimer.current); draftTimer.current = null; }
    state.value = next; setValue(next); setRestoreVersion(version => version + 1);
  }
  return { turns: value?.turns ?? [], pendingRequest: value?.pending ?? null, status, loading, restoreVersion,
    ready: current.current?.identity === identity && (current.current.volatile || current.current.session.getSnapshot().hydrated),
    saveError: recoveryError || ["error", "conflict"].includes(current.current?.session.getSnapshot().status ?? ""),
    pending, complete, retry: () => recover(retry), useServerCopy: () => recover(useServerCopy), draftPrompt: value?.draftPrompt ?? "", setDraftPrompt,
    keepBrowserEdits: () => recover(async () => { const state = current.current; if (!state || state.identity !== identity) return;
      if (state.volatile) { await state.session.initialize(); if (!state.session.getSnapshot().hydrated) return;
        if (current.current !== state) return;
        state.session.write(state.value); state.volatile = false; }
      await state.session.keepBrowserEdits(); setValue({ ...state.value }); }),
    useCurrentContextOnly: () => { const state = current.current; if (state?.identity === identity) {
      state.volatile = true; state.value = { ...state.value, turns: [], pending: null };
      setValue(state.value); setRestoreVersion(version => version + 1); setStatus("Current context only · conversation is not server-saved"); } },
    clear: () => { const state = current.current; draftText.current = ""; if (draftTimer.current) clearTimeout(draftTimer.current);
      if (state?.identity === identity) write({ ...state.value, turns: [], pending: null, draftPrompt: "", sourceRevision }); },
    conflict: Boolean(current.current?.volatile) || current.current?.session.getSnapshot().status === "conflict",
    hasEarlier: (value?.turns.length ?? 0) > visibleCount,
    showEarlier: () => setVisibleCount(count => count + 50),
    transcript: (value?.turns ?? []).slice(-visibleCount).map(turn => ({ id: turn.id, role: turn.role, text: turn.text })),
  };
}
