export function openGovernedAgentConsole() {
  window.dispatchEvent(new CustomEvent("governance-console:open-agent", {
    detail: { mode: "focused", note: "Opened from Delivery Home. Inspect the current owner context and enter a manual request; opening does not invoke a model." },
  }));
}
