"use client";
import { useEffect, useRef } from "react";
import { TerasActionButton } from "./teras-action.tsx";

export function TerasFilePicker({ directory = false, disabled, label, onFiles }: {
  directory?: boolean; disabled: boolean; label: string; onFiles: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (directory) input.current?.setAttribute("webkitdirectory", ""); }, [directory]);
  return <><input ref={input} hidden type="file" multiple disabled={disabled} aria-label={label} onChange={event => {
    const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; onFiles(files);
  }} /><TerasActionButton disabled={disabled} emphasis="secondary" onClick={() => input.current?.click()}>{label}</TerasActionButton></>;
}
