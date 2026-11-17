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
  return completionEvidence({ ...evidence,
    completion_summary: evidence.completion_summary.trim().startsWith("- ") ? lines(evidence.completion_summary).map(unbullet).join(" ") : evidence.completion_summary,
    changed_surfaces: lines(evidence.changed_surfaces).map(line => `- ${unbullet(line)}`).join("\n"),
    test_result_evidence: result(evidence.test_result_evidence, test, ["PASS", "FAIL", "NOT APPLICABLE", "Attached artifact"], "Test result"),
    validation_evidence: result(evidence.validation_evidence, validation, ["PASS", "FAIL", "CHECK", "NOT APPLICABLE", "Attached artifact"], "Validation result"),
  });
}
