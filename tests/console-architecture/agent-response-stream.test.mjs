import assert from "node:assert/strict";
import test from "node:test";

import {
  createAgentResponseStream,
} from "../../src/agent-console/server/agent-response-stream.ts";

test("Agent response stream emits content and preserves a final line without a newline", async () => {
  const encoder = new TextEncoder();
  const upstream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode('{"message":{"content":"hello "}}\n'),
      );
      controller.enqueue(
        encoder.encode('{"done":true,"message":{"content":"world"}}'),
      );
      controller.close();
    },
  });

  const output = await new Response(
    createAgentResponseStream(upstream),
  ).text();

  assert.equal(output, "hello world");
});

test("Agent response stream rejects an upstream close without a completion event", async () => {
  const encoder = new TextEncoder();
  const upstream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode('{"message":{"content":"partial"}}\n'),
      );
      controller.close();
    },
  });
  const reader = createAgentResponseStream(upstream).getReader();
  const decoder = new TextDecoder();
  const firstChunk = await reader.read();

  assert.equal(decoder.decode(firstChunk.value), "partial");
  await assert.rejects(
    reader.read(),
    /ended before its completion event/,
  );
});

test("Agent response stream cancels Ollama after malformed provider output", async () => {
  const encoder = new TextEncoder();
  let cancelReason = null;
  const upstream = new ReadableStream({
    cancel(reason) {
      cancelReason = reason;
    },
    start(controller) {
      controller.enqueue(encoder.encode("not-json\n"));
    },
  });
  const reader = createAgentResponseStream(upstream).getReader();

  await assert.rejects(reader.read(), SyntaxError);
  assert.equal(cancelReason instanceof SyntaxError, true);
});

test("Agent response stream closes and releases Ollama after its done event", async () => {
  const encoder = new TextEncoder();
  let cancelReason = null;
  const upstream = new ReadableStream({
    cancel(reason) {
      cancelReason = reason;
    },
    start(controller) {
      controller.enqueue(
        encoder.encode(
          '{"done":true,"message":{"content":"complete"}}\n',
        ),
      );
    },
  });

  const output = await new Response(
    createAgentResponseStream(upstream),
  ).text();

  assert.equal(output, "complete");
  assert.equal(cancelReason, "ollama response complete");
});

test("Agent response stream propagates consumer cancellation upstream", async () => {
  let cancelReason = null;
  let resolveCancellation;
  const cancellation = new Promise((resolve) => {
    resolveCancellation = resolve;
  });
  const upstream = new ReadableStream({
    cancel(reason) {
      cancelReason = reason;
      resolveCancellation();
    },
  });
  const reader = createAgentResponseStream(upstream).getReader();

  await reader.cancel("operator cancelled");
  await cancellation;

  assert.equal(cancelReason, "operator cancelled");
});
