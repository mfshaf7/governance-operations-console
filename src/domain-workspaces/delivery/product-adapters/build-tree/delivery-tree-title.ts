// Separate recorded work numbers from numbered draft titles without changing either source value.
export function deliveryTreeTitleParts(
  { kind, title }: { kind: string; title: string },
  recorded: number | undefined,
) {
  const label = kind === "User story" ? "User story|Story" : kind;
  const prefix = new RegExp(`^(?:${label})(?:\\s+(#?\\d+(?:\\.\\d+)*))?\\s*[:–—-]\\s*`, "i").exec(title);
  const recordedNumber = recorded && Number.isSafeInteger(recorded) && recorded > 0 ? recorded : undefined;
  const sequence = prefix?.[1]?.replace(/^#/, "");
  return {
    editable: (prefix ? title.slice(prefix[0].length) : title).trim(),
    reference: recordedNumber ? `#${recordedNumber}` : undefined,
    locked: !recordedNumber && sequence ? `Draft ${sequence}` : undefined,
  };
}
