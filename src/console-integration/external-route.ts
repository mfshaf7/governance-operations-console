const allowedExternalProtocols = new Set(["http:", "https:"]);

export function parseExternalConsoleRoute(
  value: string | null | undefined,
): URL | null {
  if (!value) {
    return null;
  }

  try {
    const route = new URL(value);
    return allowedExternalProtocols.has(route.protocol) ? route : null;
  } catch {
    return null;
  }
}

export function openExternalConsoleRoute(
  value: string | null | undefined,
): boolean {
  const route = parseExternalConsoleRoute(value);
  if (!route || typeof window === "undefined") {
    return false;
  }

  window.open(route.href, "_blank", "noopener,noreferrer");
  return true;
}
