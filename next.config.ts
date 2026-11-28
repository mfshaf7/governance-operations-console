import { randomUUID } from "node:crypto";
import type { NextConfig } from "next";

const consoleRelease = randomUUID();

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  env: { NEXT_PUBLIC_CONSOLE_RELEASE: consoleRelease },
};

export default nextConfig;
