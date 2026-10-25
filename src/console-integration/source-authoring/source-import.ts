import { byteLength, sourceEditorLimits, sourcePathIssue, type SourceEditorTarget } from "./source-editor-contract.ts";

export type ImportFile = { path: string; size: number; read: () => Promise<ArrayBuffer> };
export type ImportRow = ImportFile & { target: string; issue: string | null };
export const excludedImportFolder = (name: string) => /^(?:\.git|\.hg|\.svn|node_modules|vendor|\.venv|venv|__pycache__|\.next|dist|build|coverage|target|\.cache|\.turbo|\.parcel-cache|\.idea)$/i.test(name);

export function mapSourceImports(files: ImportFile[], targetFolder: string, scope: SourceEditorTarget["scope"]): ImportRow[] {
  if (files.length > sourceEditorLimits.treePaths) throw new Error("Select a smaller source folder: the import tree exceeds 5,000 entries.");
  if (targetFolder && sourcePathIssue(`${targetFolder}/source-file`, scope) && !scope) throw new Error("Use a safe relative target folder without credentials or parent traversal.");
  const rows = files.map(file => {
    const target = targetFolder ? `${targetFolder}/${file.path}` : file.path;
    const issue = file.path.split("/").slice(0, -1).some(excludedImportFolder) ? "Dependency, build or repository folder excluded"
      : sourcePathIssue(target, scope) ?? (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > sourceEditorLimits.fileBytes ? "Exceeds the 64 KiB per-file limit" : null);
    return { ...file, target, issue };
  });
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.target, (counts.get(row.target) ?? 0) + 1);
  return rows.map(row => counts.get(row.target)! > 1 ? { ...row, issue: "Multiple selected files map to this path; choose them separately" } : row);
}
export function decodeImportedSource(buffer: ArrayBuffer): string {
  if (buffer.byteLength > sourceEditorLimits.fileBytes) throw new Error("File exceeds 64 KiB.");
  let content: string;
  try { content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buffer); }
  catch { throw new Error("Invalid UTF-8 or binary input; convert this file to UTF-8 text before import."); }
  if (content.includes("\0") || byteLength(content) !== buffer.byteLength) throw new Error("Binary or non-round-tripping source text is excluded.");
  return content;
}
export function browserImportFiles(files: File[], folder: boolean): ImportFile[] {
  return files.map(file => {
    const relative = folder ? file.webkitRelativePath : file.name;
    // The folder chosen in the picker is a container, not part of the target.
    const path = folder ? relative.slice(relative.indexOf("/") + 1) : relative;
    return { path, size: file.size, read: () => file.arrayBuffer() };
  });
}

type PickedFile = { kind: "file"; name: string; getFile(): Promise<File> };
type PickedDirectory = { kind: "directory"; name: string; values(): AsyncIterable<PickedFile | PickedDirectory> };
type DirectoryPickerWindow = Window & { showDirectoryPicker?: (options: { mode: "read" }) => Promise<PickedDirectory> };
export function hasDirectoryPicker() { return typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function"; }
export async function pickSourceDirectory(): Promise<{ files: ImportFile[]; excluded: string[] }> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) throw new Error("Use the folder file-picker fallback in this browser.");
  const root = await picker({ mode: "read" }), files: ImportFile[] = [], excluded: string[] = [];
  let visited = 0;
  async function visit(directory: PickedDirectory, prefix: string) {
    for await (const entry of directory.values()) {
      if (++visited > sourceEditorLimits.treePaths) throw new Error("Select a smaller folder: inspection exceeded 5,000 entries. No files were imported.");
      const path = `${prefix}${entry.name}`;
      if (entry.kind === "directory") {
        if (excludedImportFolder(entry.name)) { excluded.push(`${path}/ — dependency, build or repository folder excluded`); continue; }
        await visit(entry, `${path}/`);
      } else {
        try { const file = await entry.getFile(); files.push({ path, size: file.size, read: () => file.arrayBuffer() }); }
        catch { excluded.push(`${path} — file is unreadable`); }
      }
    }
  }
  await visit(root, "");
  return { files, excluded };
}
