import { readFileSync, statfsSync } from "fs";
import os from "os";
import type {
  WslCpuCounters,
  WslNetworkCounters,
  WslResourceSnapshot,
} from "../model/runtime-readiness-model";

function readMemoryInfoEntries() {
  return Object.fromEntries(
    readFileSync("/proc/meminfo", "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [key, value] = line.split(":");
        return [key, Number.parseInt(value.trim().split(/\s+/)[0], 10) * 1024];
      }),
  );
}

function readCpuCounters(): WslCpuCounters {
  const cpuLine = readFileSync("/proc/stat", "utf8")
    .split("\n")
    .find((line) => line.startsWith("cpu "));

  if (!cpuLine) {
    throw new Error("unable to read aggregate CPU counters");
  }

  const values = cpuLine
    .trim()
    .split(/\s+/)
    .slice(1)
    .map((value) => Number.parseInt(value, 10));
  const idle = (values[3] ?? 0) + (values[4] ?? 0);
  const total = values.slice(0, 8).reduce((sum, value) => sum + value, 0);

  return { idle, total };
}

function readMemory(entries: Record<string, number>) {
  const totalBytes = entries.MemTotal ?? os.totalmem();
  const availableBytes = entries.MemAvailable ?? os.freemem();
  const usedBytes = totalBytes - availableBytes;

  return {
    availableBytes,
    totalBytes,
    usedBytes,
    usedPercent: totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0,
  };
}

function readVirtualMemory(entries: Record<string, number>) {
  const commitLimitBytes = entries.CommitLimit ?? 0;
  const committedBytes = entries.Committed_AS ?? 0;
  const swapTotalBytes = entries.SwapTotal ?? 0;
  const swapFreeBytes = entries.SwapFree ?? 0;
  const swapUsedBytes = Math.max(0, swapTotalBytes - swapFreeBytes);

  return {
    commitLimitBytes,
    commitPercent: commitLimitBytes > 0 ? (committedBytes / commitLimitBytes) * 100 : 0,
    committedBytes,
    swapTotalBytes,
    swapUsedBytes,
    swapUsedPercent: swapTotalBytes > 0 ? (swapUsedBytes / swapTotalBytes) * 100 : 0,
  };
}

function readDisk() {
  const stats = statfsSync("/");
  const totalBytes = stats.blocks * stats.bsize;
  const availableBytes = stats.bavail * stats.bsize;
  const usedBytes = totalBytes - availableBytes;

  return {
    availableBytes,
    mount: "/",
    totalBytes,
    usedBytes,
    usedPercent: totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0,
  };
}

function readNetworkCounters(): WslNetworkCounters {
  const interfaceRows = readFileSync("/proc/net/dev", "utf8")
    .split("\n")
    .slice(2)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawInterface, rawCounters] = line.split(":");
      const counters = rawCounters.trim().split(/\s+/).map((value) => Number.parseInt(value, 10));
      return {
        interfaceName: rawInterface.trim(),
        rxBytes: counters[0] ?? 0,
        txBytes: counters[8] ?? 0,
      };
    })
    .filter((row) => row.interfaceName !== "lo");
  const totals = interfaceRows.reduce(
    (sum, row) => ({
      rxBytes: sum.rxBytes + row.rxBytes,
      txBytes: sum.txBytes + row.txBytes,
    }),
    { rxBytes: 0, txBytes: 0 },
  );

  return {
    interfaces: interfaceRows
      .filter((row) => row.rxBytes + row.txBytes > 0)
      .sort((left, right) => right.rxBytes + right.txBytes - (left.rxBytes + left.txBytes))
      .slice(0, 4)
      .map((row) => row.interfaceName),
    rxBytes: totals.rxBytes,
    totalBytes: totals.rxBytes + totals.txBytes,
    txBytes: totals.txBytes,
  };
}

function detectWsl() {
  const distro = process.env.WSL_DISTRO_NAME;

  if (distro) {
    return distro;
  }

  try {
    const version = readFileSync("/proc/version", "utf8");
    if (/microsoft|wsl/i.test(version)) {
      return "WSL";
    }
  } catch {
    return "Linux";
  }

  return "Linux";
}

export function readWslResourceSnapshot(): WslResourceSnapshot {
  const [load1, load5, load15] = os.loadavg();
  const cores = os.cpus().length || 1;
  const memoryInfoEntries = readMemoryInfoEntries();

  return {
    capturedAt: new Date().toISOString(),
    cpu: {
      cores,
      counters: readCpuCounters(),
      load1,
      load5,
      load15,
      pressurePercent: Math.min(100, (load1 / cores) * 100),
    },
    disk: readDisk(),
    host: {
      hostname: os.hostname(),
      platform: detectWsl(),
      uptimeSeconds: Math.max(0, Math.floor(os.uptime())),
    },
    memory: readMemory(memoryInfoEntries),
    network: readNetworkCounters(),
    source: "local-next-api:/proc",
    virtualMemory: readVirtualMemory(memoryInfoEntries),
  };
}
