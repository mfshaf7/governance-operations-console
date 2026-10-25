"use client";
import { useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { normalizedCodeText } from "./teras-code-text.ts";
import styles from "./teras-patterns.module.css";

/** A product-neutral text/diff field. No network, storage or source execution. */
export function TerasCodeEditor({ path, value, original, diff, readOnly, onValueChange, maxBytes = 65536 }: {
  path: string; value: string; original: string; diff: boolean; readOnly: boolean; onValueChange: (value: string) => void; maxBytes?: number;
}) {
  const host = useRef<HTMLDivElement>(null), view = useRef<EditorView | null>(null), raw = useRef(value), callback = useRef(onValueChange), replacing = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const readOnlyRef = useRef(readOnly), reconfigureReadOnly = useRef<((value: boolean) => void) | null>(null);
  const replaceText = useRef<((value: string) => void) | null>(null);
  readOnlyRef.current = readOnly;
  callback.current = onValueChange;
  useEffect(() => {
    let cancelled = false; setError(null); raw.current = value;
    void (async () => {
      const [{ EditorView, keymap }, { EditorState, Compartment }, { basicSetup }, { indentWithTab, temporarilySetTabFocusMode }, { unifiedMergeView }, { HighlightStyle, syntaxHighlighting }, { tags }] = await Promise.all([
        import("@codemirror/view"), import("@codemirror/state"), import("codemirror"), import("@codemirror/commands"), import("@codemirror/merge"),
        import("@codemirror/language"), import("@lezer/highlight"),
      ]);
      const extension = /\.(?:[cm]?[jt]sx?)$/i.test(path) ? (await import("@codemirror/lang-javascript")).javascript({ typescript: /\.[cm]?tsx?$/i.test(path), jsx: /\.[jt]sx$/i.test(path) })
        : /\.json$/i.test(path) ? (await import("@codemirror/lang-json")).json()
          : /\.css$/i.test(path) ? (await import("@codemirror/lang-css")).css()
            : /\.html?$/i.test(path) ? (await import("@codemirror/lang-html")).html()
              : /\.(?:md|mdx)$/i.test(path) ? (await import("@codemirror/lang-markdown")).markdown() : [];
      if (cancelled || !host.current) return;
      const { createBytePreservingCodeState } = await import("./teras-code-state.ts");
      if (cancelled || !host.current) return;
      const rawState = createBytePreservingCodeState(raw.current, maxBytes, setError);
      const editable = new Compartment(), editableState = (value: boolean) => [EditorState.readOnly.of(value), EditorView.editable.of(!value)];
      const editor = new EditorView({ parent: host.current, state: EditorState.create({ doc: normalizedCodeText(raw.current), extensions: [
        basicSetup, keymap.of([{ key: "Escape", run: temporarilySetTabFocusMode }, indentWithTab]), extension,
        syntaxHighlighting(HighlightStyle.define([
          { tag: tags.keyword, color: "var(--amber)" }, { tag: [tags.string, tags.regexp], color: "var(--green)" },
          { tag: [tags.number, tags.bool, tags.null], color: "var(--teal)" }, { tag: [tags.variableName, tags.propertyName, tags.function(tags.variableName)], color: "var(--blue)" },
          { tag: tags.comment, color: "var(--muted)", fontStyle: "italic" }, { tag: [tags.typeName, tags.className], color: "var(--amber)" },
        ])),
        editable.of(editableState(readOnlyRef.current)),
        rawState.extension, EditorState.transactionFilter.of(rawState.filter),
        EditorView.contentAttributes.of({ "aria-label": `${diff ? "Source diff" : "Source editor"}: ${path}`, spellcheck: "false" }),
        ...(diff ? unifiedMergeView({ original: normalizedCodeText(original), mergeControls: false, syntaxHighlightDeletions: false }) : []),
        EditorView.theme({
          "&": { height: "100%", minHeight: "20rem", backgroundColor: "rgba(0, 0, 0, 0.26)", color: "var(--text)" },
          ".cm-scroller": { overflow: "auto", fontFamily: '"IBM Plex Mono", monospace', fontSize: "13px" },
          ".cm-content": { caretColor: "var(--text)" },
          ".cm-gutters": { backgroundColor: "var(--canvas-soft)", color: "var(--muted)", borderColor: "var(--line)" },
          ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#24324955" },
          ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "#386a9970" },
          ".cm-panels": { backgroundColor: "var(--canvas-soft)", color: "var(--text)" },
        }, { dark: true }),
        EditorView.updateListener.of(update => {
          if (!update.docChanged || replacing.current) return;
          raw.current = rawState.value(update.state); callback.current(raw.current);
        }),
      ] }) });
      view.current = editor;
      reconfigureReadOnly.current = value => editor.dispatch({ effects: editable.reconfigure(editableState(value)) });
      replaceText.current = value => editor.dispatch({ effects: rawState.replace(editor.state, value), changes: { from: 0, to: editor.state.doc.length, insert: normalizedCodeText(value) } });
    })().catch(() => { if (!cancelled) setError("The code editor could not load. Your source buffer is retained; close and reopen this view to retry."); });
    return () => { cancelled = true; replaceText.current = null; reconfigureReadOnly.current = null; view.current?.destroy(); view.current = null; };
    // Value changes from typing must preserve cursor and undo state.
    // A parent remounts the field when explicitly replacing a buffer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, original, diff, maxBytes]);
  useEffect(() => { reconfigureReadOnly.current?.(readOnly); }, [readOnly]);
  useEffect(() => {
    if (raw.current === value) return;
    raw.current = value;
    const editor = view.current;
    if (editor) {
      replacing.current = true;
      try { replaceText.current?.(value); }
      finally { replacing.current = false; }
    }
  }, [value]);
  return <div className={styles.terasCodeEditor} data-teras-code-editor="true"><div ref={host} />{error ? <p role="alert">{error}</p> : null}</div>;
}
