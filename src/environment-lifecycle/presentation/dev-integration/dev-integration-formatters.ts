export function formatDevIntegrationObservedAt(
  observedAt: string | null,
): string {
  return observedAt
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(observedAt))
    : "Not observed";
}
