import type { CommandCenterAttentionCandidate } from "../read-model/command-center-attention.ts";
export function priorityTitle(candidate: CommandCenterAttentionCandidate) {
    return candidate.subject.title.startsWith("profile:")
        ? `${candidate.subject.title.slice("profile:".length)} profile`
        : candidate.subject.title;
}
export function priorityMove(candidate: CommandCenterAttentionCandidate) {
    return candidate.requiredMove.label === "request-correction"
        ? "Review requested correction"
        : candidate.requiredMove.label;
}
export function priorityExplanation(candidate: CommandCenterAttentionCandidate) {
    if (candidate.requiredMove.label === "request-correction" && /source credential/i.test(candidate.reason)) {
        return "Platform reports a failed source-credential operation. Review the original request and its required source version before retrying. The owner explanation is available in Source details.";
    }
    return candidate.reason;
}
