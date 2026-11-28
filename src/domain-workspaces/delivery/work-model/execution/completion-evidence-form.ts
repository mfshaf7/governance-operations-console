import { completionEvidence, type ItemCompletionEvidence } from "../../live-runtime/delivery-item-completion-contract.ts";

export type CompletionResult = "PASS" | "FAIL" | "CHECK" | "NOT APPLICABLE" | "Attached artifact" | "";
const lines = (text: string) => text.split("\n").map(line => line.trim()).filter(Boolean);
const unbullet = (text: string) => text.replace(/^[-*]\s+/, "");
export function completionEvidenceFromForm(evidence: ItemCompletionEvidence, test: CompletionResult, validation: CompletionResult) {
  function result(text: string, selected: CompletionResult, allowed: string[], label: string) {
    return lines(text).map(line => {
      const content = unbullet(line);
      const recorded = allowed.find(prefix => content.startsWith(`${prefix}:`));
      if (recorded) {
        if (selected && selected !== recorded) throw Error(`${label}: the selected result conflicts with the evidence. Review both before submitting.`);
        return `- ${content}`;
      }
      if (!selected || !allowed.includes(selected)) throw Error(`Choose the ${label.toLowerCase()} for these evidence notes.`);
      return `- ${selected}: ${content}`;
    }).join("\n");
  }
  const changes = lines(evidence.changed_surfaces).map(unbullet);
  if (changes.some(change => /\b(?:PR|pull request)\s+#\d+\b/i.test(change.replace(/\[[^\]]+\]\([^)]+\)/g, "")))) {
    throw Error("In What changed?, paste the full pull request URL in place of a reference like PR #123.");
  }
  return completionEvidence({ ...evidence,
    completion_summary: evidence.completion_summary.trim().startsWith("- ") ? lines(evidence.completion_summary).map(unbullet).join(" ") : evidence.completion_summary,
    changed_surfaces: changes.map(line => `- ${line}`).join("\n"),
    test_result_evidence: result(evidence.test_result_evidence, test, ["PASS", "FAIL", "NOT APPLICABLE", "Attached artifact"], "Test result"),
    validation_evidence: result(evidence.validation_evidence, validation, ["PASS", "FAIL", "CHECK", "NOT APPLICABLE", "Attached artifact"], "Validation result"),
  });
}
