import { NextResponse } from "next/server.js";

export const consoleCorrelationHeader = "x-console-correlation-id";

export function createConsoleCorrelationId() {
  return crypto.randomUUID();
}

export function consoleCorrelationIdForRequest(request: Request) {
  const value = request.headers.get(consoleCorrelationHeader)?.trim();
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : createConsoleCorrelationId();
}

export function bindConsoleCorrelation(
  response: Response,
  correlationId: string,
) {
  response.headers.set(consoleCorrelationHeader, correlationId);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function consoleOperationFailureResponse({
  code,
  correlationId,
  message,
  outcome,
  request,
  status,
}: {
  code: string;
  correlationId: string;
  message: string;
  outcome: "denied" | "failed";
  request: Request;
  status: number;
}) {
  return NextResponse.json(
    {
      code,
      correlationId,
      error: message,
      requestPath: new URL(request.url).pathname,
      status: outcome,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        [consoleCorrelationHeader]: correlationId,
      },
      status,
    },
  );
}
