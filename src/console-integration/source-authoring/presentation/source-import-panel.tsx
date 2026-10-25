"use client";
import { useEffect, useMemo, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasEmptyState, TerasFieldStack, TerasFilePicker, TerasList, TerasPanel, TerasPanelHeader, TerasSignalItem, TerasTextField } from "@/teras";
import type { SourceEditorTarget } from "../source-editor-contract.ts";
import { browserImportFiles, decodeImportedSource, hasDirectoryPicker, mapSourceImports, pickSourceDirectory, type ImportFile } from "../source-import.ts";

export function SourceImportPanel({ disabled, scope, onImport }: {
  disabled: boolean; scope: SourceEditorTarget["scope"]; onImport: (files: Array<{ path: string; content: string }>) => Promise<unknown>;
}) {
  const [files, setFiles] = useState<ImportFile[]>([]), [folder, setFolder] = useState(scope?.source_root ?? ""), [selected, setSelected] = useState<Set<string>>(new Set());
  const [excluded, setExcluded] = useState<string[]>([]), [readErrors, setReadErrors] = useState<Record<string, string>>({});
  const [prepared, setPrepared] = useState<Array<{ path: string; content: string }> | null>(null), [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null);
  const [nativePicker, setNativePicker] = useState(false), [page, setPage] = useState(0);
  useEffect(() => { setNativePicker(hasDirectoryPicker()); }, []);
  const mapping = useMemo(() => { try { return { rows: mapSourceImports(files, folder, scope), error: null }; } catch (error) { return { rows: [], error: error instanceof Error ? error.message : "Invalid import mapping." }; } }, [files, folder, scope?.source_root, scope?.design_profile]);
  const rows = mapping.rows, eligible = rows.filter(row => !row.issue), locked = disabled || pending;
  function choose(values: ImportFile[], exclusions: string[] = []) {
    try {
      const rows = mapSourceImports(values, folder, scope), allowed = rows.filter(row => !row.issue);
      setFiles(values); setExcluded(exclusions); setReadErrors({}); setPrepared(null); setPage(0); setError(null);
      setSelected(new Set(allowed.length <= 64 ? allowed.map(row => row.target) : []));
    } catch (error) { setError(error instanceof Error ? error.message : "The selected input is outside the import bounds."); }
  }
  async function directory() {
    setPending(true); setError(null);
    try { const result = await pickSourceDirectory(); choose(result.files, result.excluded); }
    catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setError(error instanceof Error ? error.message : "The folder could not be read."); }
    finally { setPending(false); }
  }
  async function prepare() {
    setPending(true); setError(null); setPrepared(null);
    try {
      const chosen = rows.filter(row => selected.has(row.target) && !row.issue);
      if (!chosen.length || chosen.length > 64 || chosen.reduce((n, row) => n + row.size, 0) > 524288) throw new Error("Select 1–64 text files totalling at most 512 KiB.");
      const values: Array<{ path: string; content: string }> = [], errors: Record<string, string> = {};
      for (const row of chosen) {
        try { values.push({ path: row.target, content: decodeImportedSource(await row.read()) }); }
        catch (error) { errors[row.target] = error instanceof Error ? error.message : "File is unreadable."; }
      }
      setReadErrors(errors); setPrepared(values);
    } catch (error) { setError(error instanceof Error ? error.message : "Selected files could not be prepared."); }
    finally { setPending(false); }
  }
  return <TerasPanel frame="padded" treatment="neutral">
    <TerasPanelHeader kicker="Import from your computer" title="Review file mapping before importing"
      description="Choose files edited in VS Code or a source folder. Missing files never become deletions. Import replaces only the mapped local buffers; saving and source acceptance remain separate." />
    <TerasFieldStack spacing="normal">
      <TerasTextField label="Target folder in source (empty means repository root)" value={folder} disabled={locked} maxLength={240} onValueChange={value => { setFolder(value); setSelected(new Set()); setPrepared(null); setReadErrors({}); }} />
      <TerasActionRow>
        <TerasFilePicker label="Choose files" disabled={locked} onFiles={values => choose(browserImportFiles(values, false))} />
        {nativePicker ? <TerasActionButton emphasis="secondary" disabled={locked} onClick={() => void directory()}>Choose source folder</TerasActionButton>
          : <TerasFilePicker label="Choose source folder" directory disabled={locked} onFiles={values => choose(browserImportFiles(values, true))} />}
        <TerasActionButton emphasis="secondary" disabled={locked || !eligible.length || eligible.length > 64} onClick={() => { setSelected(new Set(eligible.map(row => row.target))); setPrepared(null); }}>Select all supported files</TerasActionButton>
        <TerasActionButton emphasis="secondary" disabled={locked || !selected.size} onClick={() => { setSelected(new Set()); setPrepared(null); }}>Clear selection</TerasActionButton>
      </TerasActionRow>
      {error || mapping.error ? <TerasEmptyState>{error ?? mapping.error}</TerasEmptyState> : null}
      {rows.length ? <>
        <TerasPanelHeader kicker={`${selected.size} selected / ${rows.length} mapped`} title={`Files ${page * 100 + 1}–${Math.min(rows.length, (page + 1) * 100)}`}
          description={eligible.length > 64 ? "Choose up to 64 supported files. No files were silently truncated or imported." : "Excluded and unreadable input remains visible below."} />
        <TerasList frame="contained" scrollHeight="medium">{rows.slice(page * 100, (page + 1) * 100).map((row, index) => <TerasSignalItem key={`${row.target}:${index}`} label={`${row.size} bytes`} title={row.target}
          detail={row.issue ?? readErrors[row.target] ?? `From ${row.path}`} tone={row.issue || readErrors[row.target] ? "warn" : "info"}
          actions={<TerasActionButton emphasis="secondary" disabled={locked || !!row.issue || selected.size >= 64 && !selected.has(row.target)} aria-pressed={selected.has(row.target)} onClick={() => {
            setSelected(current => { const next = new Set(current); if (next.has(row.target)) next.delete(row.target); else if (next.size < 64) next.add(row.target); return next; }); setPrepared(null);
          }}>{selected.has(row.target) ? "Selected" : "Select file"}</TerasActionButton>} />)}</TerasList>
        <TerasActionRow>
          <TerasActionButton emphasis="secondary" disabled={locked || page === 0} onClick={() => setPage(page - 1)}>Previous import page</TerasActionButton>
          <TerasActionButton emphasis="secondary" disabled={locked || (page + 1) * 100 >= rows.length} onClick={() => setPage(page + 1)}>Next import page</TerasActionButton>
          <TerasActionButton disabled={locked || !selected.size} onClick={() => void prepare()}>Read and validate selected text</TerasActionButton>
        </TerasActionRow>
      </> : null}
      {excluded.length ? <TerasList frame="contained" scrollHeight="short">{excluded.slice(0, 100).map(value => <TerasSignalItem key={value} label="Excluded" title={value} tone="warn" />)}{excluded.length > 100 ? <TerasSignalItem label="Additional exclusions" title={`${excluded.length - 100} more excluded folders/files; no content was read from them`} tone="warn" /> : null}</TerasList> : null}
      {prepared ? <>
        <TerasPanelHeader kicker="Prepared text only" title={`${prepared.length} valid files / ${Object.keys(readErrors).length} rejected files`} description="Review the mapping and exclusions above. This action stages the valid files in your local buffers; it does not save, accept or deliver source." />
        <TerasActionButton disabled={locked || !prepared.length} onClick={() => { setPending(true); void onImport(prepared).finally(() => setPending(false)); }}>Import prepared files into mapped buffers</TerasActionButton>
      </> : null}
    </TerasFieldStack>
  </TerasPanel>;
}
