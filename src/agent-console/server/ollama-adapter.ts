import { readFileSync } from "node:fs";

type OllamaModel = {
  details?: {
    parameter_size?: string;
  };
  model?: string;
  name?: string;
  size?: number;
};

type OllamaTagsResponse = {
  models?: OllamaModel[];
};

export type OllamaChatMessage = {
  content: string;
  role: "assistant" | "system" | "user";
};

const CHAT_TIMEOUT_MS = 190_000;
const DEFAULT_TIMEOUT_MS = 45_000;
const STATUS_TIMEOUT_MS = 4_000;
const MAX_MODEL_TOKENS = 260;
const OLLAMA_PORT = 11_434;
const BALANCED_MODEL_PREFERENCE = [
  "llama3.1:8b",
  "qwen2.5:7b",
  "mistral-nemo:latest",
  "gemma3:12b",
  "mistral-small:latest",
];

function linuxGatewayHexToIp(gatewayHex: string) {
  const bytes = gatewayHex.match(/[0-9a-fA-F]{2}/g);

  if (bytes?.length !== 4) {
    return null;
  }

  return bytes
    .reverse()
    .map((byte) => Number.parseInt(byte, 16))
    .join(".");
}

function wslGatewayBaseUrl() {
  try {
    const routeTable = readFileSync("/proc/net/route", "utf8");
    const defaultRoute = routeTable
      .trim()
      .split("\n")
      .slice(1)
      .map((line) => line.trim().split(/\s+/))
      .find((columns) => columns[1] === "00000000" && columns[2] !== "00000000");
    const gatewayIp = defaultRoute ? linuxGatewayHexToIp(defaultRoute[2] ?? "") : null;

    return gatewayIp ? `http://${gatewayIp}:${OLLAMA_PORT}` : null;
  } catch {
    return null;
  }
}

function candidateBaseUrls() {
  const candidates = [
    process.env.OLLAMA_BASE_URL,
    wslGatewayBaseUrl(),
    "http://host.docker.internal:11434",
    "http://127.0.0.1:11434",
  ];

  return [...new Set(candidates)]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/\/+$/, ""));
}

function parseParameterSize(raw: string | undefined) {
  const match = raw?.match(/([\d.]+)\s*([bBmM])?/);

  if (!match) {
    return 0;
  }

  const value = Number.parseFloat(match[1] ?? "0");
  const unit = (match[2] ?? "b").toLowerCase();

  return unit === "m" ? value / 1_000 : value;
}

function modelName(model: OllamaModel) {
  return model.model ?? model.name ?? "";
}

function chooseModel(models: OllamaModel[]) {
  const configuredModel = process.env.OLLAMA_MODEL?.trim();

  if (configuredModel && models.some((model) => modelName(model) === configuredModel)) {
    return configuredModel;
  }

  const availableModels = new Set(models.map(modelName));
  const preferredModel = BALANCED_MODEL_PREFERENCE.find((model) => availableModels.has(model));

  if (preferredModel) {
    return preferredModel;
  }

  return [...models]
    .sort((left, right) => {
      const rightParameters = parseParameterSize(right.details?.parameter_size);
      const leftParameters = parseParameterSize(left.details?.parameter_size);

      if (rightParameters !== leftParameters) {
        return rightParameters - leftParameters;
      }

      return (right.size ?? 0) - (left.size ?? 0);
    })
    .map(modelName)[0];
}

async function fetchJson<T>(url: string, init?: RequestInit & { timeoutMs?: number }) {
  const {
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...requestInit
  } = init ?? {};
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const response = await fetch(url, {
    ...requestInit,
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal,
  });

  if (!response.ok) {
    throw new Error(`request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchOllamaChatStream(
  baseUrl: string,
  selectedModel: string,
  messages: OllamaChatMessage[],
  requestSignal?: AbortSignal,
) {
  const timeoutSignal = AbortSignal.timeout(CHAT_TIMEOUT_MS);
  const response = await fetch(`${baseUrl}/api/chat`, {
    body: JSON.stringify({
      messages,
      model: selectedModel,
      options: {
        num_predict: MAX_MODEL_TOKENS,
        temperature: 0.2,
      },
      stream: true,
    }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: requestSignal
      ? AbortSignal.any([requestSignal, timeoutSignal])
      : timeoutSignal,
  });

  if (!response.ok) {
    throw new Error(`request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error("ollama returned no response stream");
  }

  return response.body;
}

export async function resolveOllama(requestSignal?: AbortSignal) {
  const errors: string[] = [];

  for (const baseUrl of candidateBaseUrls()) {
    try {
      const tags = await fetchJson<OllamaTagsResponse>(`${baseUrl}/api/tags`, {
        signal: requestSignal,
        timeoutMs: STATUS_TIMEOUT_MS,
      });
      const models = Array.isArray(tags.models) ? tags.models : [];
      const selectedModel = chooseModel(models);

      if (!selectedModel) {
        errors.push(`${baseUrl}: no models returned`);
        continue;
      }

      return {
        baseUrl,
        models,
        selectedModel,
      };
    } catch (error) {
      if (requestSignal?.aborted) {
        throw requestSignal.reason;
      }

      errors.push(`${baseUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(errors.join("; "));
}
