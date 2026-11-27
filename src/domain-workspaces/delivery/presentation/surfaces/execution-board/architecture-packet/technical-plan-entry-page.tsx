"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { TerasPlanning, TerasActionButton, TerasSelectableRow } from "@/teras";
import { TechnicalPlanWorkTitle } from "./technical-plan-overview.tsx";

export function TechnicalPlanEntryRow({ entryKey, label, detail, onOpen }: {
  entryKey: string | number;
  label: ReactNode;
  detail?: ReactNode;
  onOpen: () => void;
}) {
  return <TerasSelectableRow label={<TerasPlanning.ItemTitle>{label}</TerasPlanning.ItemTitle>}
    detail={detail ? <TerasPlanning.ItemDetail>{detail}</TerasPlanning.ItemDetail> : undefined}
    aria-pressed={undefined}
    data-plan-entry-key={entryKey} onSelect={onOpen} />;
}

export function useTechnicalPlanEntryPage<Key extends string | number>(keys: readonly Key[]) {
  const [selection, setSelection] = useState<Key | null>(null);
  const selected = selection !== null && keys.includes(selection) ? selection : null;
  const browse = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLSpanElement>(null);
  const returnPoint = useRef<{ key: string; listTop: number; regionTop: number } | null>(null);

  useLayoutEffect(() => {
    if (selected !== null && heading.current) {
      heading.current.focus({ preventScroll: true });
      heading.current.closest("section")?.scrollIntoView({ block: "start", inline: "nearest" });
    } else if (returnPoint.current && browse.current) {
      const { key, listTop, regionTop } = returnPoint.current;
      returnPoint.current = null;
      const list = browse.current.querySelector("[data-teras-list]");
      if (list) list.scrollTop = listTop;
      const region = browse.current.closest("[data-scroll='true']");
      if (region) region.scrollTop = regionTop;
      const control = Array.from(browse.current.querySelectorAll<HTMLElement>("[data-plan-entry-key]"))
        .find(element => element.dataset.planEntryKey === key);
      const target = control && !control.matches(":disabled") ? control : browse.current;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [selected]);

  function open(key: Key) {
    returnPoint.current = {
      key: String(key),
      listTop: browse.current?.querySelector("[data-teras-list]")?.scrollTop ?? 0,
      regionTop: browse.current?.closest("[data-scroll='true']")?.scrollTop ?? 0,
    };
    setSelection(key);
  }

  function back(removed = false) {
    if (removed && returnPoint.current) returnPoint.current.key = "";
    setSelection(null);
  }

  return { selected, browse, heading, open, back };
}

export function TechnicalPlanEntryPage({ title, category, heading, onBack, children, entryPath, framed = false, reviewRoot = false }: {
  title: string;
  category: string;
  heading: ReturnType<typeof useTechnicalPlanEntryPage>["heading"];
  onBack: () => void;
  children: ReactNode;
  entryPath?: string;
  framed?: boolean;
  reviewRoot?: boolean;
}) {
  const titleId = useId();
  const content = <>
    <TerasPlanning.EntryHeading kicker={category} actionsLayout="inline"
      title={<span id={titleId} ref={heading} tabIndex={-1}><TechnicalPlanWorkTitle label={title} /></span>}
      actions={<TerasActionButton emphasis="secondary" size="table-compact" onClick={() => onBack()}>Back to entries</TerasActionButton>} />
    {children}
  </>;
  return framed ? <TerasPlanning.EntryPanel treatment="neutral" frame="padded" density="compact" spacing="normal"
    aria-labelledby={titleId} data-plan-entry-path={entryPath} data-plan-review-entry={reviewRoot || undefined}>{content}</TerasPlanning.EntryPanel> :
    <TerasPlanning.EntryDetails data-plan-entry-path={entryPath}>{content}</TerasPlanning.EntryDetails>;
}

export function TechnicalPlanFormDialog({ title, width, description, actions, onClose, children }: {
  title: string;
  width: "compact" | "standard" | "large";
  description?: string;
  actions: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return <TerasPlanning.FormDialog open onClose={onClose} kicker="Plan the changes" title={title}
    width={width} height="content" contentOverflow="auto" description={description} actions={actions}>
    {children}
  </TerasPlanning.FormDialog>;
}

export function TechnicalPlanAddDialog({ title, width = "standard", actionLabel = "Add to draft", disabled, onClose, onAdd, children }: {
  title: string;
  width?: "compact" | "standard" | "large";
  actionLabel?: string;
  disabled: boolean;
  onClose: () => void;
  onAdd: () => void;
  children: ReactNode;
}) {
  return <TechnicalPlanFormDialog title={title} width={width} onClose={onClose} actions={<>
    <TerasActionButton emphasis="secondary" onClick={onClose}>Cancel</TerasActionButton>
    <TerasActionButton emphasis="primary" disabled={disabled} onClick={onAdd}>{actionLabel}</TerasActionButton>
  </>}>
    {children}
  </TechnicalPlanFormDialog>;
}
