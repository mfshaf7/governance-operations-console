"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  TerasPlanning,
  TerasActionButton,
  TerasActionRow,
  TerasDialog,
  TerasEmptyState,
  TerasFieldGrid,
  TerasFieldStack,
  TerasMetadataList,
  TerasSelectField,
  TerasTechnicalDetails,
  TerasTextField,
  type TerasMetadataItem,
} from "@/teras";

export type SourceRevision = { repo: string; base_ref: string; commit: string };
type AuthorizationRef = { uri: string; digest: string };
type ActivationFact = { repo: string; revision: string; path: string; field: string; observed_value: boolean | string;
  observed_posture: "source-ready" | "owner-source-change-required" };
type SourceFact = SourceRevision | AuthorizationRef | ActivationFact;
type FactRow = { repo: string; status: "available" | "unavailable" | "pinned"; fact?: SourceFact };
type FactInput = {
  kind: "revision" | "activation" | "authorization" | "recorded-authorization";
  repo?: string; base_ref?: string; revision?: string; path?: string; field?: string; preserve_repositories?: string[];
};
export type PlanSourceFacts = {
  pins: SourceRevision[];
  live: boolean;
  read: (input: FactInput) => Promise<{ facts?: FactRow[]; refs?: AuthorizationRef[] }>;
};

export function isSourceRevision(value: unknown): value is SourceRevision {
  const pin = value as SourceRevision | null | undefined;
  return Boolean(pin && typeof pin.repo === "string" && typeof pin.base_ref === "string" && pin.base_ref &&
    typeof pin.commit === "string" && /^[0-9a-f]{40}$/.test(pin.commit));
}

export function sourceRevisionSummary(pin: SourceRevision) {
  return `${pin.base_ref.replace(/^origin\//, "")} · ${pin.commit.slice(0, 12)}`;
}

export async function readPlanFacts(deliveryId: string, work: string[], input: FactInput) {
  const response = await fetch("/api/delivery/architecture-packets/facts", {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(80_000),
    body: JSON.stringify({ input: { ...input, delivery_id: deliveryId, covered_work_item_ids: work } }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.mode !== "live" || payload.result?.delivery_id !== deliveryId || payload.result?.kind !== input.kind) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "The source connection could not confirm this information.");
  }
  return payload.result as Awaited<ReturnType<PlanSourceFacts["read"]>>;
}

function useMounted() {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  return mounted;
}

function ReadStatus({ message }: { message: string }) {
  return message ? <TerasPlanning.ReadStatus role="status">{message}</TerasPlanning.ReadStatus> : null;
}

export function TechnicalPlanSourceRevisions({ source, repositories, disabled, onPins, manual }: {
  source: PlanSourceFacts; repositories: string[]; disabled: boolean;
  onPins: (pins: SourceRevision[], replace: boolean) => void;
  manual: (header: { title: ReactNode; actions: ReactNode; description: string; kicker: string }) => ReactNode;
}) {
  const mounted = useMounted();
  const manageId = useId();
  const [managing, setManaging] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const movedFocus = useRef(false);
  useLayoutEffect(() => {
    if (managing || movedFocus.current) {
      document.getElementById(managing ? `${manageId}-heading` : manageId)?.focus();
    }
    movedFocus.current = managing;
  }, [manageId, managing]);
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("");
  const [commit, setCommit] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Record<string, FactRow["status"]>>({});
  const [verified, setVerified] = useState<Record<string, string>>({});
  const names = [...new Set([...repositories, ...source.pins.map(pin => pin.repo), ...Object.keys(status)])].sort();
  const unread = names.filter(name => !source.pins.some(pin => pin.repo === name));
  const label = (name: string) => {
    const pin = source.pins.find(item => item.repo === name);
    if (pin) return <span title={pin.commit}>{sourceRevisionSummary(pin)} · {
      verified[name] === `${pin.base_ref}:${pin.commit}` ? "Verified from source" : "Recorded pin"
    }</span>;
    return status[name] === "unavailable" ? "Source unavailable" : "Revision needed";
  };

  async function read(replace: boolean) {
    setBusy(true);
    setMessage(replace ? "Reading the selected branch…" : "Reading the repository branches…");
    try {
      const result = await source.read(replace ? { kind: "revision", repo, base_ref: branch.trim() || undefined, revision: commit.trim() || undefined } : {
        kind: "revision", preserve_repositories: source.pins.map(pin => pin.repo),
      });
      if (!mounted.current) return;
      const rows = Array.isArray(result.facts) ? result.facts : [];
      const pins = rows.flatMap(row => row.status === "available" && isSourceRevision(row.fact) && row.fact.repo === row.repo &&
        (!replace || row.repo === repo) ? [row.fact] : []);
      setStatus(previous => ({ ...previous, ...Object.fromEntries(rows.map(row => [row.repo, row.status])) }));
      if (pins.length) {
        setVerified(previous => ({ ...previous, ...Object.fromEntries(pins.map(pin => [pin.repo, `${pin.base_ref}:${pin.commit}`])) }));
        onPins(pins, replace);
      }
      setMessage(pins.length ? `${pins.length} ${pins.length === 1 ? "revision pinned" : "revisions pinned"}.` :
        rows.length ? "No new revision could be pinned. Check the repository connection or choose a branch." :
          "No repository ownership is recorded for the selected work.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Source revisions are unavailable."); }
    finally { setBusy(false); }
  }

  if (managing) return manual({
    kicker: "Pinned source",
    title: <span id={`${manageId}-heading`} tabIndex={-1}>{disabled ? "Recorded revisions" : "Manage recorded revisions"}</span>,
    description: disabled ? "Inspect the branch and commit recorded for each repository."
      : "Review recorded pins. Use the source reader to verify a branch or exact commit.",
    actions: <TerasActionButton emphasis="secondary" size="table-compact"
      onClick={() => setManaging(false)}>Back to revision status</TerasActionButton>,
  });

  const revisionFacts: TerasMetadataItem[] = names.map(name => ({
    label: name, value: label(name), tone: status[name] === "unavailable" ? "warn" : undefined,
  }));
  return <TerasPlanning.Sources spacing="compact">
    <TerasPlanning.SourceHeading kicker="Source coverage" title="Repositories in scope"
      description="See the branch and commit pinned for each repository." actionsLayout="inline"
      actions={<TerasActionRow spacing="compact">
        {unread.length ? <TerasActionButton emphasis="secondary" size="table-compact" busy={busy}
          disabled={disabled || busy || !source.live} onClick={() => void read(false)}>Read missing revisions</TerasActionButton> : null}
        <TerasActionButton id={manageId} emphasis="secondary" size="table-compact" disabled={busy}
          onClick={() => setManaging(true)}>{disabled ? "View revision details" : "Manage revisions"}</TerasActionButton>
      </TerasActionRow>} />
    {revisionFacts.length ? <TerasPlanning.Metadata presentation="revisions"
      role="group" aria-label="Repository revision status" items={revisionFacts} /> :
      <TerasEmptyState>Choose the work in this plan to identify its repositories.</TerasEmptyState>}
    <ReadStatus message={pinDialogOpen ? "" : message} />
    {names.length ? <TerasActionRow spacing="compact"><TerasActionButton emphasis="secondary" size="table-compact"
      aria-haspopup="dialog" disabled={disabled || busy}
      onClick={() => { setMessage(""); setPinDialogOpen(true); }}>Pin a revision</TerasActionButton></TerasActionRow> : null}
    {pinDialogOpen ? <TerasDialog open onClose={() => setPinDialogOpen(false)} kicker="Source revisions" title="Pin a source revision"
      width="standard" height="content" contentOverflow="auto"
      actions={<TerasActionButton busy={busy} disabled={disabled || busy || !source.live || !repo ||
        Boolean(commit.trim()) && (!branch.trim() || !/^[a-f0-9]{40}$/.test(commit.trim()))}
        onClick={() => void read(true)}>Read and pin revision</TerasActionButton>}>
      <TerasFieldStack spacing="normal">
        <TerasFieldGrid spacing="normal">
          <TerasSelectField label="Repository" value={repo} disabled={disabled || busy}
            options={[{ value: "", label: "Choose a repository" }, ...names.map(value => ({ value, label: value }))]} onValueChange={setRepo} />
          <TerasTextField label="Branch" helper="Leave blank to use the repository default." value={branch} disabled={disabled || busy} onValueChange={setBranch} />
        </TerasFieldGrid>
        <TerasTextField label="Exact commit (optional)" value={commit} onValueChange={setCommit} disabled={disabled || busy}
          helper="Leave blank to pin the branch head. To verify a specific commit, enter its full ID and branch." />
        <ReadStatus message={message} />
      </TerasFieldStack>
    </TerasDialog> : null}
  </TerasPlanning.Sources>;
}

export function TechnicalPlanActivationEvidence({ source, owner, evidence, disabled, onRead, manual }: {
  source: PlanSourceFacts; owner: unknown; evidence: Record<string, unknown>; disabled: boolean;
  onRead: (fact: ActivationFact) => void; manual: ReactNode;
}) {
  const pin = source.pins.find(item => item.repo === owner);
  const mounted = useMounted();
  const [file, setFile] = useState(typeof evidence.path === "string" ? evidence.path : "");
  const [field, setField] = useState(typeof evidence.field === "string" ? evidence.field : "");
  const [verified, setVerified] = useState<ActivationFact | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const observed = typeof evidence.observed_value === "boolean" || typeof evidence.observed_value === "string" && Boolean(evidence.observed_value);
  const belongs = Boolean(pin && evidence.repo === pin.repo && evidence.revision === pin.commit);
  const sourceRead = verified !== null && Object.entries(verified).every(([key, value]) => evidence[key] === value);
  async function read() {
    if (!pin) return;
    const path = file.trim(), setting = field.trim();
    setBusy(true);
    setMessage("Reading the setting at the pinned revision…");
    try {
      const result = await source.read({ kind: "activation", repo: pin.repo, revision: pin.commit, base_ref: pin.base_ref, path, field: setting });
      const value = result.facts?.find(row => row.repo === pin.repo && row.status === "available")?.fact as ActivationFact | undefined;
      if (value?.repo !== pin.repo || value.revision !== pin.commit || value.path !== path || value.field !== setting ||
          !(typeof value.observed_value === "boolean" || ["source-ready", "owner-source-change-required"].includes(value.observed_value)) ||
          !["source-ready", "owner-source-change-required"].includes(value.observed_posture)) {
        throw Error("The setting could not be verified. Check the path, setting name and availability of the pinned commit.");
      }
      if (!mounted.current) return;
      setVerified(value);
      onRead(value);
      setMessage("Setting read from the pinned revision.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The setting is unavailable."); }
    finally { setBusy(false); }
  }
  const sourceFacts: TerasMetadataItem[] = pin ? [
    { label: "Pinned commit", value: <span title={pin.commit}>{pin.commit.slice(0, 12)}</span> },
    ...(observed ? [{ label: belongs ? sourceRead ? "Read from source" : "Recorded value" : "Value from a different revision", value: String(evidence.observed_value) }] : []),
    ...(observed && belongs && evidence.observed_posture ? [{ label: sourceRead ? "Verified activation" : "Recorded activation decision",
      value: evidence.observed_posture === "source-ready" ? "Ready at the pinned revision" : "A source change must land first" }] : []),
  ] : [];
  return <TerasPlanning.FactsTray title="Read the activation setting"
    actions={<TerasActionButton emphasis="secondary" size="table-compact" busy={busy}
      disabled={disabled || busy || !pin || !source.live || !file.trim() || !field.trim()} onClick={() => void read()}>Read setting</TerasActionButton>}>
    <TerasFieldStack spacing="normal">
      {sourceFacts.length ? <TerasPlanning.Metadata items={sourceFacts} /> :
        <TerasEmptyState>Select a source repository with a pinned revision.</TerasEmptyState>}
      {pin && observed && !belongs ? <TerasEmptyState>Read the setting again before using this evidence with the current pin.</TerasEmptyState> : null}
      <TerasFieldGrid spacing="normal">
        <TerasTextField label="Configuration file" value={file} placeholder="config/runtime.yaml" disabled={disabled || busy} onValueChange={setFile} />
        <TerasTextField label="Setting name" helper="Choose the setting that enables activation when true." value={field} placeholder="runtime.enabled" disabled={disabled || busy} onValueChange={setField} />
      </TerasFieldGrid>
      <ReadStatus message={message} />
      <TerasActionRow spacing="compact"><TerasActionButton emphasis="secondary" size="table-compact" aria-haspopup="dialog"
        onClick={() => setManualOpen(true)}>Enter independently verified evidence</TerasActionButton></TerasActionRow>
      {manualOpen ? <TerasDialog open onClose={() => setManualOpen(false)} kicker="Activation order" title="Record activation evidence"
        description="Enter the setting and value you verified in the pinned revision."
        width="standard" height="content" contentOverflow="auto">{manual}</TerasDialog> : null}
    </TerasFieldStack>
  </TerasPlanning.FactsTray>;
}

export function isAuthorizationRef(value: unknown): value is AuthorizationRef {
  const ref = value as AuthorizationRef | null | undefined;
  return Boolean(ref && typeof ref.uri === "string" && ref.uri.trim() &&
    typeof ref.digest === "string" && /^sha256:[0-9a-f]{64}$/.test(ref.digest));
}

function githubAuthorizationDocument(value: string) {
  const match = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/blob\/([a-f0-9]{40})\/([\w./-]{1,240})(?:#L[0-9]+(?:-L[0-9]+)?)?$/.exec(value);
  if (!match || !validDocumentPath(match[4])) return null;
  const [, account, repository, commit, path] = match;
  return { account: account.toLowerCase(), repository: repository.toLowerCase(), commit, path };
}

function validDocumentPath(value: string) {
  return /^[A-Za-z0-9._/-]{1,240}$/.test(value) && value.split("/").every(part => part && part !== "." && part !== "..");
}

function referenceKey(ref: AuthorizationRef) {
  return JSON.stringify([ref.uri, ref.digest]);
}

function referenceLabel(uri: string) {
  const document = githubAuthorizationDocument(uri);
  return document ? `${document.path} · ${document.repository}` : uri.split("/").at(-1) || uri;
}

function documentLookupKey(pin: SourceRevision, path: string, link: ReturnType<typeof githubAuthorizationDocument>) {
  return JSON.stringify([pin.repo, pin.base_ref, pin.commit, path, link?.account, link?.repository]);
}

export function TechnicalPlanAuthorizationLookup({ source, disabled, onAdd }: {
  source: PlanSourceFacts; disabled: boolean; onAdd: (record: AuthorizationRef) => boolean;
}) {
  const [repo, setRepo] = useState("");
  const [file, setFile] = useState("");
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [locatedDocument, setLocatedDocument] = useState<{ key: string; reference: AuthorizationRef } | null>(null);
  const [recorded, setRecorded] = useState<AuthorizationRef[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [documentMessage, setDocumentMessage] = useState("");
  const input = file.trim();
  const link = githubAuthorizationDocument(input);
  const pastedLink = input.includes("://");
  const path = link?.path ?? input;
  const pin = link ? source.pins.find(item => item.repo === link.repository && item.commit === link.commit) :
    pastedLink ? undefined : source.pins.find(item => item.repo === repo) ?? (source.pins.length === 1 ? source.pins[0] : undefined);
  const lookupKey = pin && validDocumentPath(path) ? documentLookupKey(pin, path, link) : null;
  const confirmedReference = lookupKey && locatedDocument?.key === lookupKey ? locatedDocument.reference : null;
  const linkProblem = !input ? undefined : link && !pin
    ? "This link does not use a repository and revision pinned in this plan. Use the pinned revision or update Source revisions."
    : !validDocumentPath(path)
      ? "Enter a repository-relative path or a GitHub file permalink that includes its full commit ID." : undefined;

  async function readApproved() {
    setBusy(true);
    setMessage("Looking up approved references…");
    setRecorded([]);
    setSelected("");
    try {
      const result = await source.read({ kind: "recorded-authorization" });
      const refs = Array.isArray(result.refs) ? result.refs.filter(isAuthorizationRef) : [];
      setRecorded([...new Map(refs.map(ref => [referenceKey(ref), ref])).values()]);
      setMessage(refs.length ? "Choose a reference from the approved plan." : "The approved plan has no recorded authorization references.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Authorization records are unavailable."); }
    finally { setBusy(false); }
  }

  async function readDocument() {
    if (!pin || !lookupKey) return;
    setBusy(true);
    setLocatedDocument(null);
    setDocumentMessage("Reading the pinned document…");
    try {
      const result = await source.read({ kind: "authorization", repo: pin.repo, base_ref: pin.base_ref, revision: pin.commit, path });
      const value = result.facts?.find(row => row.repo === pin.repo && row.status === "available")?.fact;
      const observed = isAuthorizationRef(value) ? githubAuthorizationDocument(value.uri) : null;
      if (!isAuthorizationRef(value) || !observed || observed.commit !== pin.commit || observed.path !== path) {
        throw Error("The document could not be verified. Check the path and whether the pinned source is available.");
      }
      if (link && (observed.account !== link.account || observed.repository !== link.repository)) {
        throw Error("The source reader found a different repository from the link. Check the repository in your permalink.");
      }
      setLocatedDocument({ key: lookupKey, reference: value });
      setDocumentMessage("Document found. Check that it authorizes this work.");
    } catch (error) { setDocumentMessage(error instanceof Error ? error.message : "Authorization records are unavailable."); }
    finally { setBusy(false); }
  }

  const choice = recorded.find(record => referenceKey(record) === selected);
  const referenceFacts: TerasMetadataItem[] = choice ? [
    { label: "Document", value: choice.uri }, { label: "SHA-256", value: choice.digest },
  ] : [];
  function useReference(reference: AuthorizationRef) {
    const added = onAdd(reference);
    setSelected("");
    setMessage(added ? "Authorization reference added to the draft." : "This authorization reference is already in the draft.");
  }
  return <TerasFieldStack spacing="compact">
    <TerasActionRow spacing="compact">
      <TerasActionButton emphasis="secondary" size="table-compact" busy={busy && !documentDialogOpen} disabled={disabled || !source.live || busy}
        onClick={() => void readApproved()}>Find approved references</TerasActionButton>
      <TerasActionButton emphasis="secondary" size="table-compact" aria-haspopup="dialog" disabled={disabled || busy || !source.live}
        onClick={() => { setLocatedDocument(null); setDocumentMessage(""); setDocumentDialogOpen(true); }}>Find a document in pinned source</TerasActionButton>
    </TerasActionRow>
    {documentDialogOpen ? <TerasDialog open onClose={() => setDocumentDialogOpen(false)} kicker="Authorization" title="Find an authorization document"
      description="Paste a GitHub permalink or enter a path in a pinned repository. The Console reads the file and fills the link and digest."
      width="standard" height="content" contentOverflow="auto"
      actions={<>
        <TerasActionButton emphasis="secondary" busy={busy} disabled={disabled || !source.live || busy || !lookupKey}
          onClick={() => void readDocument()}>Read document reference</TerasActionButton>
        {confirmedReference ? <TerasActionButton disabled={disabled || busy}
          onClick={() => {
            useReference(confirmedReference);
            setDocumentDialogOpen(false);
          }}>Use authorization reference</TerasActionButton> : null}
      </>}>
      <TerasFieldStack spacing="normal">
        <TerasTextField label="Document path or GitHub permalink" value={file} disabled={disabled || busy}
          helper={linkProblem} onValueChange={value => {
            setFile(value);
            setLocatedDocument(null);
            setDocumentMessage("");
          }} />
        {source.pins.length > 1 && !pastedLink ? <TerasSelectField label="Repository" value={pin?.repo ?? ""} disabled={disabled || busy}
          options={[{ value: "", label: "Choose a pinned repository" }, ...source.pins.map(pin => ({ value: pin.repo, label: pin.repo }))]}
          onValueChange={value => { setRepo(value); setLocatedDocument(null); setDocumentMessage(""); }} /> : null}
        {pin ? <TerasMetadataList shape="list" items={[
          { label: "Pinned repository", value: pin.repo },
          { label: "Pinned revision", value: <span title={pin.commit}>{sourceRevisionSummary(pin)}</span> },
        ]} /> : !source.pins.length ? <TerasEmptyState>Pin a repository revision in Source revisions, then return here.</TerasEmptyState> : null}
        {confirmedReference ? <TerasTechnicalDetails summary="View exact reference" items={[
          { label: "Document", value: confirmedReference.uri }, { label: "SHA-256", value: confirmedReference.digest },
        ]} /> : null}
        <ReadStatus message={documentMessage} />
      </TerasFieldStack>
    </TerasDialog> : null}
    {recorded.length ? <>
      <TerasPlanning.LookupFields align="end" spacing="compact">
        <TerasSelectField label="Authorization reference" value={selected} disabled={disabled || busy}
          options={[{ value: "", label: "Choose a reference" }, ...recorded.map(record => ({ value: referenceKey(record), label: referenceLabel(record.uri) }))]}
          onValueChange={setSelected} />
        <TerasActionRow spacing="compact"><TerasActionButton emphasis="secondary" disabled={disabled || busy || !choice}
          onClick={() => { if (choice) useReference(choice); }}>Use authorization reference</TerasActionButton></TerasActionRow>
      </TerasPlanning.LookupFields>
      {referenceFacts.length ? <TerasTechnicalDetails summary="View exact reference" items={referenceFacts} /> : null}
    </> : null}
    <ReadStatus message={message} />
  </TerasFieldStack>;
}
