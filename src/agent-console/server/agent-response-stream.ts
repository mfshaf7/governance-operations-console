type OllamaStreamEvent = {
  done?: boolean;
  message?: {
    content?: string;
  };
};

function emitOllamaEvent(
  line: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
) {
  const trimmed = line.trim();

  if (!trimmed) {
    return false;
  }

  const event = JSON.parse(trimmed) as OllamaStreamEvent;
  const content = event.message?.content;

  if (content) {
    controller.enqueue(encoder.encode(content));
  }

  return event.done === true;
}

export function createAgentResponseStream(
  ollamaStream: ReadableStream<Uint8Array>,
) {
  let cancelled = false;
  let upstreamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  return new ReadableStream<Uint8Array>({
    async cancel(reason) {
      cancelled = true;

      if (upstreamReader) {
        await upstreamReader.cancel(reason).catch(() => undefined);
      }
    },
    async start(controller) {
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      const reader = ollamaStream.getReader();
      let buffer = "";
      let providerDone = false;

      upstreamReader = reader;

      try {
        while (!cancelled && !providerDone) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (cancelled) {
              break;
            }

            providerDone = emitOllamaEvent(line, controller, encoder);

            if (providerDone) {
              break;
            }
          }
        }

        if (!cancelled && !providerDone) {
          buffer += decoder.decode();
          providerDone = emitOllamaEvent(buffer, controller, encoder);
        }

        if (!cancelled && !providerDone) {
          throw new Error(
            "ollama response stream ended before its completion event",
          );
        }

        if (providerDone && !cancelled) {
          await reader.cancel("ollama response complete").catch(() => undefined);
        }

        if (!cancelled) {
          controller.close();
        }
      } catch (error) {
        if (!cancelled) {
          await reader.cancel(error).catch(() => undefined);
          controller.error(error);
        }
      } finally {
        upstreamReader = null;
        reader.releaseLock();
      }
    },
  });
}
