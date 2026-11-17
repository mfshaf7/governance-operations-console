export type ConversationBinding = { role: string; ref: string; sourceRef: string };
export type ConversationTurn = { id: string; role: "operator" | "advisor"; text: string; createdAt: string; sourceRevision: string | null };
export type AdvisorConversation = { schemaVersion: 1; conversationId: string; binding: ConversationBinding;
  sourceRevision: string | null; turns: ConversationTurn[]; pending: Record<string, unknown> | null; draftPrompt?: string };
export const conversationBindingText = (value: ConversationBinding) => JSON.stringify([value.role, value.ref, value.sourceRef]);
const wellFormed = (value: string) => !/[\uD800-\uDFFF]/u.test(value);
export function assertConversationTurns(value: unknown) {
  if (!Array.isArray(value) || value.length > 8 || value.some(turn => !turn || typeof turn !== "object" ||
      Object.keys(turn).sort().join() !== "role,text" || !["operator", "advisor"].includes(turn.role) ||
      typeof turn.text !== "string" || !wellFormed(turn.text) || turn.text.length > 12000))
    throw Error("Conversation must contain complete bounded working messages.");
  return value as Array<{ role: "operator" | "advisor"; text: string }>;
}
export async function conversationId(binding: ConversationBinding) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(conversationBindingText(binding)));
  return `chat:${Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("")}`;
}
export function readAdvisorConversation(raw: string | null, binding: ConversationBinding, id: string): AdvisorConversation | null {
  if (raw === null) return null;
  const value = JSON.parse(raw) as AdvisorConversation;
  const exact = (item: unknown, keys: string[]) => item !== null && typeof item === "object" && !Array.isArray(item) &&
    Object.keys(item).sort().join() === keys.sort().join();
  const revision = (item: unknown) => item === null || typeof item === "string" && item.length <= 512;
  if (!value || value.schemaVersion !== 1 || value.conversationId !== id ||
      new TextEncoder().encode(raw).length > 2 * 1024 * 1024 ||
      !exact(value, ["schemaVersion", "conversationId", "binding", "sourceRevision", "turns", "pending", ...(Object.hasOwn(value, "draftPrompt") ? ["draftPrompt"] : [])]) ||
      !exact(value.binding, ["role", "ref", "sourceRef"]) || conversationBindingText(value.binding) !== conversationBindingText(binding) ||
      ![value.binding.role, value.binding.ref, value.binding.sourceRef].every(item => typeof item === "string" && item.length > 0 && item.length <= 2048) ||
      !revision(value.sourceRevision) || value.draftPrompt !== undefined &&
        (typeof value.draftPrompt !== "string" || !wellFormed(value.draftPrompt) || value.draftPrompt.length > 8000) ||
      value.pending !== null && (!value.pending || typeof value.pending !== "object" || Array.isArray(value.pending)) ||
      !Array.isArray(value.turns) || value.turns.length > 1000 || value.turns.some(turn =>
        !exact(turn, ["id", "role", "text", "createdAt", "sourceRevision"]) || !["operator", "advisor"].includes(turn.role) ||
        typeof turn.text !== "string" || !wellFormed(turn.text) || turn.text.length > 64000 ||
        typeof turn.id !== "string" || !turn.id || !revision(turn.sourceRevision) ||
        typeof turn.createdAt !== "string" || !Number.isFinite(Date.parse(turn.createdAt))) ||
      new Set(value.turns.map(turn => turn.id)).size !== value.turns.length) {
    throw Error("Saved conversation does not match this advisor and project. Its original content is retained.");
  }
  return value;
}

/** Keep complete consecutive recent turns. Storage never uses this model window. */
export function advisorConversationWindow(turns: ReadonlyArray<Pick<ConversationTurn, "role" | "text">>, maxTurns = 6, maxTurnChars = 12000, maxTotalChars = 12000) {
  const selected: Array<{ role: "operator" | "advisor"; text: string }> = [];
  let used = 0;
  for (let index = turns.length - 1; index >= 0 && selected.length < maxTurns; index--) {
    const turn = turns[index];
    if (turn.text.length > maxTurnChars || used + turn.text.length > maxTotalChars) break;
    selected.unshift({ role: turn.role, text: turn.text });
    used += turn.text.length;
  }
  return { turns: selected, omitted: turns.length - selected.length,
    coverage: "Complete recent working conversation only. Earlier messages may be omitted; conversation is not accepted project authority. Current supplied source facts take precedence." };
}
