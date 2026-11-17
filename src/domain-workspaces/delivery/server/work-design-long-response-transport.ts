import http from "node:http";
import https from "node:https";

/** The caller owns the whole response deadline, including long reasoning waits. */
export const workDesignJsonFetch: typeof fetch = async (input, init = {}) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (!["http:", "https:"].includes(url.protocol)) throw Error("Unsupported Work Design upstream protocol.");
  if (init.body !== undefined && typeof init.body !== "string") throw Error("Work Design expects a bounded JSON body.");
  const body = init.body;
  return new Promise<Response>((resolve, reject) => {
    let submitted = false;
    const fail = (error: Error) => {
      Object.assign(error, { requestSubmitted: submitted });
      reject(error);
    };
    const request = (url.protocol === "https:" ? https : http).request(url, {
      method: init.method ?? "POST", headers: Object.fromEntries(new Headers(init.headers)),
      signal: init.signal ?? undefined,
    }, response => {
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 1_048_576) { response.destroy(Error("Work Design upstream response exceeds its bound.")); return; }
        chunks.push(chunk);
      });
      response.on("error", fail);
      response.on("aborted", () => fail(Error("Work Design upstream response was interrupted.")));
      response.on("end", () => {
        const status = response.statusCode ?? 502;
        const headers = new Headers();
        for (const [key, value] of Object.entries(response.headers)) {
          if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        }
        resolve(new Response([204, 205, 304].includes(status) ? null : Buffer.concat(chunks), { status, headers }));
      });
    });
    request.on("finish", () => { submitted = true; });
    request.on("error", fail);
    request.end(body);
  });
};
