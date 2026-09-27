import { NextRequest, NextResponse } from "next/server.js";

import {
  consoleCorrelationHeader,
  createConsoleCorrelationId,
} from "./console-integration/observability/console-operation-correlation.ts";

export function middleware(request: NextRequest) {
  const correlationId = createConsoleCorrelationId();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(consoleCorrelationHeader, correlationId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set(consoleCorrelationHeader, correlationId);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
