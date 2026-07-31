import { NextResponse } from "next/server";
import { readWslResourceSnapshot } from "./wsl-resource-adapter";

export async function GET() {
  return NextResponse.json(readWslResourceSnapshot(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
