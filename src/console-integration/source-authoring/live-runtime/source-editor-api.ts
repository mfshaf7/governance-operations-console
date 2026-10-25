import type { SourceCapture, SourceDraft, SourceEditorState, OperatorDraftCommand } from "../source-editor-contract.ts";
export class SourceEditorRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export const sourceDefinitiveSaveRejection = (error: unknown, receivedAcknowledgement: boolean) => !receivedAcknowledgement && error instanceof SourceEditorRequestError && [400, 403, 404, 409, 413, 422].includes(error.status);
export type SourceSaveAcknowledgement = { commandId: string; savedRevision: string; savedDigest: string; replayed: boolean; current: SourceEditorState };
export async function sourceEditorRequest<T>(path: string, input?: OperatorDraftCommand): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...(input ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) } : {}) });
  const body = await response.json();
  if (!response.ok || body.mode !== "live" || body.error || !body.projection) throw new SourceEditorRequestError(body.error ?? "The source owner did not confirm this request.", response.status);
  return body.projection as T;
}
export const readEditorDraft = (endpoint: string) => sourceEditorRequest<SourceDraft>(`${endpoint}/draft`);
export function readEditorFiles(endpoint: string, paths: string[] = []) {
  const query = new URLSearchParams(); paths.forEach(path => query.append("path", path));
  return sourceEditorRequest<{ capture: SourceCapture; current: SourceEditorState }>(`${endpoint}/files${query.size ? `?${query}` : ""}`);
}
export async function sourceObjectiveDigest(objective: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(objective)));
  return `sha256:${Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("")}`;
}
