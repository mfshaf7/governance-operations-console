"use client";

import { useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasDialog, TerasDocument } from "@/teras";

type NotePart = { level: number; text: string };

function handoffNoteParts(note: string): NotePart[] {
  const headings = [];
  let fence = "";
  for (const line of note.matchAll(/^ {0,3}(?:(#{1,6})[ \t]+(\S[^\r\n]*)|(`{3,}|~{3,})([^\r\n]*))/gm)) {
    const delimiter = line[3];
    if (delimiter) {
      if (!fence) fence = delimiter;
      else if (delimiter[0] === fence[0] && delimiter.length >= fence.length && !line[4].trim()) fence = "";
    } else if (!fence) headings.push(line);
  }
  if (headings.length) {
    const parts: NotePart[] = [];
    let cursor = 0;
    for (const heading of headings) {
      const paragraph = note.slice(cursor, heading.index).trim();
      if (paragraph) parts.push({ level: 0, text: paragraph });
      parts.push({ level: heading[1].length, text: heading[2].trimEnd() });
      cursor = heading.index + heading[0].length;
    }
    const tail = note.slice(cursor).trim();
    if (tail) parts.push({ level: 0, text: tail });
    return parts;
  }

  // Older handoffs can use a standalone uppercase title and section labels
  // leading each paragraph. Ordinary unstructured notes stay plain text.
  const [title, ...sections] = note.trim().split(/\r?\n(?:[ \t]*\r?\n)+/);
  if (!sections.length || title.includes("\n") || title.length > 120 || title !== title.toUpperCase() || !/\p{Lu}/u.test(title)) {
    return [{ level: 0, text: note }];
  }
  return [{ level: 1, text: title }, ...sections.flatMap((section): NotePart[] => {
    const [label, ...lines] = section.split(/\r?\n/);
    if (!lines.length || label.length > 100 || /[.!?:;]$/.test(label) || !/^\p{Lu}/u.test(lines[0])) {
      return [{ level: 0, text: section }];
    }
    return [{ level: 2, text: label }, { level: 0, text: lines.join("\n") }];
  })];
}

export function WorkDesignHandoffNoteText({ note }: { note: string }) {
  return <TerasDocument ariaLabel="Handoff note" noteSections={handoffNoteParts(note)} data-work-design-handoff-note />;
}

export function WorkDesignHandoffNote({ note, title = "Handoff Note", actionLabel = "Read full note", dialogKicker = "Finalized Brief" }: {
  note: string; title?: string; actionLabel?: string; dialogKicker?: string;
}) {
  const [open, setOpen] = useState(false);
  const text = note.trim();
  const long = text.length > 360;
  const cut = long ? text.lastIndexOf(" ", 360) : text.length;
  const excerpt = long ? `${text.slice(0, cut > 240 ? cut : 360).trimEnd()}…` : text;
  return <>
    <TerasContentTray kicker={title}>
      <WorkDesignHandoffNoteText note={excerpt || "No note was retained."} />
      {long ? <TerasActionRow spacing="compact">
        <TerasActionButton onClick={() => setOpen(true)} treatment="tonal">{actionLabel}</TerasActionButton>
      </TerasActionRow> : null}
    </TerasContentTray>
    <TerasDialog open={open} onClose={() => setOpen(false)} title={title} kicker={dialogKicker}
      closeLabel={`Close ${title.toLowerCase()}`} contentOverflow="auto" height="content" width="large">
      <TerasContentTray><WorkDesignHandoffNoteText note={note} /></TerasContentTray>
    </TerasDialog>
  </>;
}
