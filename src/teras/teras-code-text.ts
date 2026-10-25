// CodeMirror positions use normalized line endings. Keep the original bytes
// outside its document so an edit never rewrites untouched CRLF/mixed lines.
export function normalizedCodeText(value: string) { return value.replace(/\r\n?|\n/g, "\n"); }
export function codeLineEnding(value: string) { return /\r\n|\r|\n/.exec(value)?.[0] ?? "\n"; }
export function codeLineEndingLabel(value: string) {
  const endings = new Set(value.match(/\r\n|\r|\n/g) ?? []);
  return endings.size > 1 ? "mixed line endings" : endings.has("\r\n") ? "CRLF" : endings.has("\r") ? "CR" : "LF";
}
export function rawCodeOffset(value: string, normalizedOffset: number) {
  let raw = 0, position = 0;
  while (raw < value.length && position < normalizedOffset) {
    if (value[raw] === "\r" && value[raw + 1] === "\n") raw++;
    raw++; position++;
  }
  if (position !== normalizedOffset) throw new Error("Editor change position is outside its source text.");
  return raw;
}
export function applyCodeTextChanges(value: string, changes: Array<{ from: number; to: number; inserted: string }>) {
  return applyRawCodeChanges(value, rawCodeChanges(value, changes));
}
export type RawCodeChange = { from: number; to: number; inserted: string };
export function rawCodeChanges(value: string, changes: RawCodeChange[]): RawCodeChange[] {
  const ending = codeLineEnding(value);
  return changes.map(change => ({ from: rawCodeOffset(value, change.from), to: rawCodeOffset(value, change.to), inserted: normalizedCodeText(change.inserted).replace(/\n/g, ending) }));
}
export function applyRawCodeChanges(value: string, changes: RawCodeChange[]) {
  let result = "", cursor = 0;
  for (const change of changes) {
    if (change.from < cursor || change.to < change.from || change.to > value.length) throw new Error("Editor changes overlap or escape the text.");
    result += value.slice(cursor, change.from) + change.inserted; cursor = change.to;
  }
  return result + value.slice(cursor);
}
export function invertRawCodeChanges(value: string, changes: RawCodeChange[]): RawCodeChange[] {
  let shift = 0;
  return changes.map(change => {
    const inverse = { from: change.from + shift, to: change.from + shift + change.inserted.length, inserted: value.slice(change.from, change.to) };
    shift += change.inserted.length - (change.to - change.from); return inverse;
  });
}
