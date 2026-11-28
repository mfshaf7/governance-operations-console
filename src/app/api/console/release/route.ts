import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ release: process.env.NEXT_PUBLIC_CONSOLE_RELEASE }, {
    headers: { "Cache-Control": "no-store" },
  });
}
