export type SourcePreviewSnapshot = {
  subjectId: string;
  state: "running" | "stopped" | "stale";
  endpoint: string | null;
  instanceId: string | null;
  sourceRevision: string;
  sourceDigest: string;
  embeddingOrigins: string[];
};
export type SourcePreviewAdapter = {
  id: string;
  label: string;
  read: (signal: AbortSignal) => Promise<SourcePreviewSnapshot>;
};

export function sourcePreviewEndpoint(value: string, consoleOrigin: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || !url.port ||
      Number(url.port) < 1024 || url.username || url.password || url.search || url.hash || url.origin === consoleOrigin) {
    throw Error("The runtime did not provide an isolated loopback preview address.");
  }
  return url.href;
}

export function assertSourcePreview(value: SourcePreviewSnapshot, subjectId: string, consoleOrigin: string) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.subjectId !== subjectId || !["running", "stale", "stopped"].includes(value.state) ||
      (typeof value.sourceRevision !== "string" || !/^[a-f0-9]{40}$/.test(value.sourceRevision)) || (typeof value.sourceDigest !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value.sourceDigest)) ||
      !Array.isArray(value.embeddingOrigins) || value.embeddingOrigins.length > 8 ||
      new Set(value.embeddingOrigins).size !== value.embeddingOrigins.length) throw Error("The preview response does not match this project.");
  for (const origin of value.embeddingOrigins) {
    const url = new URL(origin);
    if (typeof origin !== "string" || url.origin !== origin || url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || !url.port || Number(url.port) < 1024) throw Error("The preview has invalid embedding permissions.");
  }
  if (value.state === "running") {
    if (typeof value.endpoint !== "string" || !value.endpoint || typeof value.instanceId !== "string" || !value.instanceId || value.instanceId.length > 128) throw Error("The running preview has no confirmed instance.");
    sourcePreviewEndpoint(value.endpoint, consoleOrigin);
  } else if (value.endpoint !== null || value.instanceId !== null) throw Error("The inactive preview returned a running address.");
  return value;
}
