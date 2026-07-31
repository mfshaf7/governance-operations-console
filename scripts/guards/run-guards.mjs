#!/usr/bin/env node

import { guardRegistry } from "./guard-registry.mjs";

function usage() {
  return [
    "Usage:",
    "  node scripts/guards/run-guards.mjs --all",
    "  node scripts/guards/run-guards.mjs --shared",
    "  node scripts/guards/run-guards.mjs --domain delivery",
    "  node scripts/guards/run-guards.mjs --list",
  ].join("\n");
}

function guardSpecsForArgs(args) {
  if (args.includes("--list")) {
    console.log("Shared guards:");
    for (const guardSpec of guardRegistry.shared) {
      console.log(`- ${guardSpec}`);
    }
    console.log("Domain guards:");
    for (const [domainId, guardSpecs] of Object.entries(guardRegistry.domains)) {
      console.log(`- ${domainId}`);
      for (const guardSpec of guardSpecs) {
        console.log(`  - ${guardSpec}`);
      }
    }
    process.exit(0);
  }

  if (args.includes("--shared")) {
    return guardRegistry.shared;
  }

  const domainArgIndex = args.indexOf("--domain");
  if (domainArgIndex >= 0) {
    const domainId = args[domainArgIndex + 1];
    const guardSpecs = guardRegistry.domains[domainId];

    if (!guardSpecs) {
      console.error(`Unknown domain "${domainId}".`);
      console.error(usage());
      process.exit(2);
    }

    return guardSpecs;
  }

  if (args.includes("--all") || args.length === 0) {
    return [
      ...guardRegistry.shared,
      ...Object.values(guardRegistry.domains).flat(),
    ];
  }

  console.error(usage());
  process.exit(2);
}

const guardSpecs = guardSpecsForArgs(process.argv.slice(2));
const allFailures = [];

for (const guardSpec of guardSpecs) {
  let guard;

  try {
    const guardModule = await import(new URL(guardSpec, import.meta.url));
    guard = guardModule.default ?? guardModule.guard;
  } catch (error) {
    allFailures.push(
      `${guardSpec}: guard could not load (${error instanceof Error ? error.message : String(error)})`,
    );
    continue;
  }

  if (!guard?.id || typeof guard.run !== "function") {
    allFailures.push(`${guardSpec}: guard module must export { id, run }`);
    continue;
  }

  let failures;

  try {
    failures = guard.run();
  } catch (error) {
    allFailures.push(
      `${guard.id}: guard could not complete (${error instanceof Error ? error.message : String(error)})`,
    );
    continue;
  }

  if (failures.length === 0) {
    console.log(`${guard.id} passed.`);
    continue;
  }

  allFailures.push(...failures.map((failure) => `${guard.id}: ${failure}`));
}

if (allFailures.length > 0) {
  console.error("Architecture guards failed:");
  for (const failure of allFailures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Architecture guards passed.");
