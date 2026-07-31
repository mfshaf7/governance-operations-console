export function defaultWorkDesignContextSessionName(sequence: number) {
  return `Context Session ${String(sequence).padStart(2, "0")}`;
}
