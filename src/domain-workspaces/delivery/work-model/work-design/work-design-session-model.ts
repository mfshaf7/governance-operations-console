export const WORK_DESIGN_CONTEXT_NOTE_MAX_LENGTH = 8000;

export function defaultWorkDesignContextSessionName(sequence: number) {
  return `Context Session ${String(sequence).padStart(2, "0")}`;
}
