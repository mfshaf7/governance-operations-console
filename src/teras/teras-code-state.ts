import { StateEffect, StateField, type EditorState, type Transaction } from "@codemirror/state";
import { invertedEffects } from "@codemirror/commands";
import { applyRawCodeChanges, invertRawCodeChanges, normalizedCodeText, rawCodeChanges, type RawCodeChange } from "./teras-code-text.ts";

/** Preserve raw newline bytes through CodeMirror's normalized undo history. */
export function createBytePreservingCodeState(initial: string, maxBytes: number, onLimit: (message: string | null) => void) {
  const restore = StateEffect.define<RawCodeChange[]>();
  function changes(transaction: Transaction): RawCodeChange[] {
    const result: RawCodeChange[] = [];
    transaction.changes.iterChanges((from, to, _fromB, _toB, inserted) => result.push({ from, to, inserted: inserted.toString() }));
    return result;
  }
  function nextRaw(value: string, transaction: Transaction) {
    let restored = value, direct = false;
    for (const effect of transaction.effects) if (effect.is(restore)) { restored = applyRawCodeChanges(restored, effect.value); direct = true; }
    if (direct) return restored;
    if (!transaction.docChanged) return value;
    return applyRawCodeChanges(value, rawCodeChanges(value, changes(transaction)));
  }
  const raw = StateField.define<string>({ create: () => initial, update: nextRaw });
  return {
    extension: [raw, invertedEffects.of(transaction => {
      if (!transaction.docChanged) return [];
      let value = transaction.startState.field(raw);
      const inverse: RawCodeChange[][] = [];
      for (const effect of transaction.effects) if (effect.is(restore)) {
        inverse.unshift(invertRawCodeChanges(value, effect.value)); value = applyRawCodeChanges(value, effect.value);
      }
      // Keep byte deltas, not a full source snapshot for every keystroke.
      if (!inverse.length) inverse.push(invertRawCodeChanges(value, rawCodeChanges(value, changes(transaction))));
      return inverse.map(value => restore.of(value));
    })],
    value: (state: EditorState) => state.field(raw),
    replace: (state: EditorState, value: string) => restore.of([{ from: 0, to: state.field(raw).length, inserted: value }]),
    filter: (transaction: Transaction) => {
      const value = nextRaw(transaction.startState.field(raw), transaction);
      if (new TextEncoder().encode(value).length > maxBytes) { onLimit(`This edit exceeds the ${maxBytes} byte text-file limit. The previous buffer is retained.`); return []; }
      if (normalizedCodeText(value) !== transaction.newDoc.toString()) throw new Error("The editor's raw and displayed source text diverged.");
      onLimit(null); return transaction;
    },
  };
}
