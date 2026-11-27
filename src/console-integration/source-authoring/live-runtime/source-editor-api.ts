import type { SourceCapture, SourceDraft, SourceEditorState, OperatorDraftCommand } from "../source-editor-contract.ts";
export class SourceEditorRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) { super(message); this.status = status; this.code = code; }
}
export const expiredSourceEditorSession = (error: unknown) => error instanceof SourceEditorRequestError &&
  error.status === 401 && error.code === "console_session_projection_stale";
export const missingEditorDraft = (error: unknown) => error instanceof SourceEditorRequestError && error.status === 404 &&
  (error.code === "delivery_art_source_realization_draft_missing" || error.code === "prototype_source_authoring_draft_missing");
export const sourceDefinitiveSaveRejection = (error: unknown, receivedAcknowledgement: boolean) => !receivedAcknowledgement && error instanceof SourceEditorRequestError && [400, 403, 404, 409, 413, 422].includes(error.status);
export type SourceSaveAcknowledgement = { commandId: string; savedRevision: string; savedDigest: string; replayed: boolean; current: SourceEditorState };
export async function sourceEditorRequest<T>(path: string, input?: OperatorDraftCommand): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...(input ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) } : {}) });
  const body = await response.json();
  if (!response.ok || body.mode !== "live" || body.error || !body.projection) throw new SourceEditorRequestError(body.error ?? "The source owner did not confirm this request.", response.status, body.code);
  return body.projection as T;
}
export const readEditorDraft = (endpoint: string) => sourceEditorRequest<SourceDraft>(`${endpoint}/draft`);
export function readEditorFiles(endpoint: string, paths: string[] = [], startLine?: number) {
  const query = new URLSearchParams(); paths.forEach(path => query.append("path", path));
  if (startLine !== undefined) query.set("line", String(startLine));
  return sourceEditorRequest<{ capture: SourceCapture; current: SourceEditorState }>(`${endpoint}/files${query.size ? `?${query}` : ""}`);
}
export async function sourceObjectiveDigest(objective: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(objective)));
  return `sha256:${Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("")}`;
}
