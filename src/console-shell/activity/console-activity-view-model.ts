import type { ConsoleActivityEvent } from "../../console-integration/activity-contract.ts";
export function isRoutineActivityRead(event: ConsoleActivityEvent) {
    return !["blocked", "failed", "stale"].includes(event.outcome) && !event.nextActions?.length && event.source.owner === "workspace-governance-control-fabric" &&
        /(?:[.\s_-])read$/i.test(event.action.label);
}
function readableAction(value: string) {
    return value.replaceAll(/([a-z])([A-Z])/g, "$1 $2").replaceAll(/[._-]+/g, " ").replaceAll(/\s+/g, " ").trim();
}
export function activityPresentation(event: ConsoleActivityEvent) {
    const uri = /^[a-z][a-z0-9+.-]*:\/\//i.test(event.subject.label) || /^(?:sha256:)?[a-f0-9]{40,}$/i.test(event.subject.label);
    const ref = event.subject.ref;
    const subjectType = !uri ? event.subject.label
        : /\/artifacts\/delivery-art\//.test(ref) ? "Delivery planning evidence"
            : /art-readiness|delivery-art-readiness/.test(ref) ? "Delivery readiness evidence"
                : /prototype/.test(ref) ? "Prototype governance evidence"
                    : /\/receipts\//.test(ref) ? "Governance receipt"
                        : "Governance evidence";
    const digest = ref.match(/(?:sha256[:/])([a-f0-9]{16,64})(?:$|[/?#])/i)?.[1];
    const subject = uri && digest ? `${subjectType} · sha256:${digest.slice(0, 12)}…` : subjectType;
    const action = /artifact[.\s_-]+registry[.\s_-]+read/i.test(event.action.label) ? "Evidence registry read"
        : /artifact[.\s_-]+registry[.\s_-]+persisted/i.test(event.action.label) ? "Evidence saved"
            : readableAction(event.action.label);
    const summary = uri
        ? `${subjectType} has a recorded ${isRoutineActivityRead(event) ? "read" : "governance event"}. The event does not provide a project name. Inspect the original record for exact references and owner result.`
        : event.summary;
    const category = /(?:[.\s_-])read$/i.test(event.action.label) && event.source.owner === "workspace-governance-control-fabric"
        ? "Evidence access" : /artifact[.\s_-]+registry[.\s_-]+persisted/i.test(event.action.label) ? "Evidence storage" : readableAction(event.category);
    return { action, subject, summary, category, title: `${action} · ${subject}`, routine: isRoutineActivityRead(event) };
}
