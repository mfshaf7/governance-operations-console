"use client";

import { useEffect, useRef, useState } from "react";
import { useDraftScopeRegistration, type AdvisorRunContext } from "./draft-advisor-scope-provider";
import {
  advisorScopeIdentity, advisorScopeSnapshot, assertAdvisorReply, assertAdvisorScope,
  type AdvisorEdit, type AdvisorScope, type GovernedAdvisorReply,
} from "../model/advisor-drafts.ts";

type Turn = { role: "advisor" | "operator"; text: string };
type Undo = { identity: string; before: AdvisorEdit[]; after: AdvisorEdit[] };
type Options = {
  getScope: () => AdvisorScope;
  apply: (edits: AdvisorEdit[]) => AdvisorEdit[];
  restore?: (edits: AdvisorEdit[]) => void;
  disabled?: boolean;
  active?: boolean;
  transport?: (scope: AdvisorScope, prompt: string, signal: AbortSignal, conversation: Turn[]) => Promise<GovernedAdvisorReply>;
};

export function useDraftAdvisor(options: Options) {
  const current = useRef(options);
  current.current = options;
  const session = useRef<{ nonce: string; openedAt: string } | null>(null);
  const history = useRef<Turn[]>([]);
  const historyScope = useRef<string | null>(null);
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [undoRecord, setUndoRecord] = useState<Undo | null>(null);
  const [evidence, setEvidence] = useState<GovernedAdvisorReply["evidence"] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const surfaceIsOpen = () => current.current.active !== false;

  async function run(prompt: string, external: AdvisorRunContext = {}) {
    if (!surfaceIsOpen()) throw Error("Open the draft surface before asking its advisor.");
    if (!prompt.trim()) throw Error("Ask the advisor a question or request a draft edit.");
    if (active.current) throw Error("The advisor is already answering this request.");
    // Native snapshots may carry absent optional properties as undefined. Capture
    // their ordinary JSON wire representation before validating and binding it.
    const scope = assertAdvisorScope(JSON.parse(JSON.stringify({ ...current.current.getScope(), readOnly: Boolean(current.current.disabled) })));
    const captured = advisorScopeSnapshot(scope);
    const identity = advisorScopeIdentity(scope);
    if (historyScope.current !== identity) { history.current = []; historyScope.current = identity; setUndoRecord(null); }
    const controller = new AbortController();
    const abortExternal = () => controller.abort();
    if (external.signal?.aborted) throw Error("Advisor request cancelled. No draft was changed.");
    external.signal?.addEventListener("abort", abortExternal, { once: true });
    active.current = controller; setBusy(true); setNotice(null); setEvidence(null);
    const timeout = setTimeout(() => controller.abort(), 180_000);
    try {
      session.current ??= { nonce: crypto.randomUUID(), openedAt: new Date().toISOString() };
      const conversation = (external.conversation ?? history.current).slice(-6).map((turn) => ({ ...turn, text: turn.text.slice(0, 2000) }));
      async function invoke(): Promise<GovernedAdvisorReply> {
        if (current.current.transport) return current.current.transport(scope, prompt, controller.signal, conversation);
        const response = await fetch("/api/advisor-interaction", { method: "POST", cache: "no-store", signal: controller.signal,
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope, prompt, session: external.session ?? session.current, invocationNonce: crypto.randomUUID(), conversation }) });
        const data = await response.json();
        if (!response.ok) throw Error(typeof data.error === "string" ? data.error : "Governed advisor unavailable.");
        return data;
      }
      const result = await Promise.race([invoke(), new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => reject(Error("Advisor request cancelled or timed out. No draft was changed.")), { once: true });
      })]);
      if (controller.signal.aborted) throw Error("Advisor request cancelled. No draft was changed.");
      if (!surfaceIsOpen()) throw Error("The draft surface was closed. No edits were applied.");
      if (advisorScopeIdentity(current.current.getScope()) !== identity) throw Error("The selected record changed. The previous reply was not applied to this record.");
      const reply = assertAdvisorReply({ intent: result.intent, message: result.message, edits: result.edits }, scope);
      if (!result.evidence || !result.evidence.profileId || !result.evidence.auditRef || !result.evidence.contextRef) {
        throw Error("The advisor returned no matching governed evidence. No draft was changed.");
      }
      setEvidence(result.evidence);
      if (!external.conversation) history.current = [...history.current, { role: "operator", text: prompt }, { role: "advisor", text: reply.message }].slice(-8) as Turn[];
      if (reply.intent === "draft") {
        if (current.current.disabled || advisorScopeSnapshot({ ...current.current.getScope(), readOnly: false }) !== captured) {
          setNotice("The draft or selected context changed while the advisor answered. Its proposal was not applied.");
          return { ...result, message: `${reply.message}\n\nThe draft or selected context changed; no edits were applied.` };
        }
        const before = reply.edits.map((edit) => ({ field: edit.field, value: structuredClone(scope.fields.find((field) => field.key === edit.field)!.value) }));
        // Domain validates the complete batch before its first setter; return the
        // materialized values so later undo preserves subsequent manual changes.
        const after = current.current.apply(reply.edits);
        setUndoRecord({ identity: advisorScopeIdentity(scope), before, after: structuredClone(after) });
        setNotice(`${reply.edits.length} requested draft edit${reply.edits.length === 1 ? "" : "s"} applied. Final decisions remain yours.`);
      }
      return result;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Advisor unavailable. No draft was changed.");
      throw error;
    } finally {
      clearTimeout(timeout); active.current = null; setBusy(false);
      external.signal?.removeEventListener("abort", abortExternal);
    }
  }

  function undo() {
    if (!undoRecord || current.current.disabled || active.current) return;
    const scope = current.current.getScope();
    if (advisorScopeIdentity(scope) !== undoRecord.identity || undoRecord.after.some((edit) =>
      JSON.stringify(scope.fields.find((field) => field.key === edit.field)?.value) !== JSON.stringify(edit.value))) {
      setNotice("The edited fields changed afterward. Your later changes were preserved; review them before undoing."); return;
    }
    if (current.current.restore) current.current.restore(undoRecord.before);
    else current.current.apply(undoRecord.before);
    setUndoRecord(null); setNotice("Advisor draft edits undone.");
  }
  const cancel = () => active.current?.abort();
  useDraftScopeRegistration({ getScope: () => ({ ...current.current.getScope(), readOnly: Boolean(current.current.disabled) }), run, undo }, options.active !== false);
  return { busy, run, undo, canUndo: Boolean(undoRecord), evidence, notice, cancel,
    panelControls: { busy, canUndo: Boolean(undoRecord), onUndo: undo, onCancel: cancel, notice,
      evidenceLabel: evidence ? `Last governed reply: ${evidence.effectiveModel ?? evidence.profileId}` : null },
  };
}
