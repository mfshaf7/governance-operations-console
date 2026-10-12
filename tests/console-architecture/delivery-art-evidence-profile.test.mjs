import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const profileUrl = new URL(
  "../../contracts/delivery-art-work-session/evidence-profile.json",
  import.meta.url,
);

test("owner evidence profile covers real-git and sandbox-runtime semantic cases", async () => {
  const profile = JSON.parse(await readFile(profileUrl, "utf8"));
  const semanticCommands = profile.commands.filter(
    (command) => command.kind === "tests" &&
      command.args.join(" ") === "run test:semantics",
  );

  assert.deepEqual(
    semanticCommands.map((command) => command.fidelity).sort(),
    ["real-git", "sandbox-runtime"],
  );
  assert.ok(
    semanticCommands.every(
      (command) => command.conformance_binding === "matching-fidelity",
    ),
  );
});
