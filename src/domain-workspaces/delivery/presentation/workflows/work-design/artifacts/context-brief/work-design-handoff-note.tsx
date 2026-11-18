"use client";

import { useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasDialog } from "@/teras";

export function WorkDesignHandoffNote({ note }: { note: string }) {
  const [open, setOpen] = useState(false);
  const text = note.trim();
  const long = text.length > 360;
  const cut = long ? text.lastIndexOf(" ", 360) : text.length;
  const excerpt = long ? `${text.slice(0, cut > 240 ? cut : 360).trimEnd()}…` : text;
  return <>
    <TerasContentTray kicker="Handoff Note" description={excerpt || "No handoff note was retained."} descriptionFormat="lines">
      {long ? <TerasActionRow spacing="compact">
        <TerasActionButton onClick={() => setOpen(true)} treatment="tonal">Read full note</TerasActionButton>
      </TerasActionRow> : null}
    </TerasContentTray>
    <TerasDialog open={open} onClose={() => setOpen(false)} title="Handoff Note" kicker="Finalized Brief"
      closeLabel="Close handoff note" contentOverflow="auto" height="content" width="large">
      <TerasContentTray description={note} descriptionFormat="lines" />
    </TerasDialog>
  </>;
}
