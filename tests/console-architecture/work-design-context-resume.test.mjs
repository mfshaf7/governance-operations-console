import assert from "node:assert/strict";
import test from "node:test";
import { workDesignResumeContextSession,workDesignArchivedContextSession,workDesignRetainedBrief } from "../../src/domain-workspaces/delivery/local-runtime/persistence/work-design-context-resume.ts";

const session = (id, fingerprint, note, count = 1) => ({
  id, fingerprint, note, name: id, savedAt: "2026-10-27T01:00:00Z", sequence: 1, decision: "proceed",
  snapshot: { customItems: Array.from({ length: count }, (_, index) => ({ id: `note-${index}`, kind: "note", label: `Note ${index}`, detail: "Retained local content", x: 120.5 + index, y: 320.125 })),
    connections: [], positions: {}, removedCoreIds: [], sketchStrokes: [], templateTrays: [], style: "architecture" },
});

test("archive uses the exact finalized board and note, even when the same named session was later edited",()=>{
 const original=session("named","original","Original accepted note",13),edited=session("named","later","Later draft",1);
 const version={briefVersionId:"v1",savedSessionId:"named",finalizedFingerprint:original.fingerprint,snapshot:original.snapshot,decision:original.decision,finalizedAt:original.savedAt,name:"Original brief",versionLabel:"v1",boardSnapshotRef:"board:v1",metadataPacketRef:"metadata:v1"};
 const retained=workDesignArchivedContextSession(version,[edited,original]);
 assert.equal(retained.snapshot,original.snapshot);assert.equal(retained.note,original.note);assert.equal(retained.snapshot.customItems.length,13);assert.equal(edited.note,"Later draft");
 const missing=workDesignArchivedContextSession(version,[edited]);assert.equal(missing.note,"");assert.equal(missing.snapshot,original.snapshot);
 const legacy=workDesignRetainedBrief(version,edited);assert.equal(legacy.note,"");assert.deepEqual(legacy.systemChecks,[]);assert.match(legacy.diagramSummary,/not retained/);assert.equal(legacy.diagramNodes.length,13);
});

test("complete retained brief content remains the selected historical version rather than current metadata",()=>{
 const original=session("saved","original","Accepted note");
 const brief={note:original.note,name:"Original title",diagramSummary:"Original agreed scope",systemChecks:[{label:"Original check",status:"ready"}]};
 const version={briefVersionId:"v1",savedSessionId:original.id,finalizedFingerprint:original.fingerprint,snapshot:original.snapshot,decision:original.decision,finalizedAt:original.savedAt,name:"Original brief",versionLabel:"v1",boardSnapshotRef:"board:v1",metadataPacketRef:"metadata:v1",finalizedBrief:brief};
 const changed=session("saved","new","Changed current note");
 assert.equal(workDesignArchivedContextSession(version,[changed]).note,"Accepted note");
 assert.equal(workDesignRetainedBrief(version,changed),brief);assert.equal(brief.name,"Original title");assert.equal(changed.note,"Changed current note");
});

test("reopening restores the newer autosaved note and complete diagram ahead of the named baseline", () => {
  const named = session("named", "old", "Prior checkpoint");
  const current = session("autosave", "new", "Current operator and advisor edits", 13);
  const result = workDesignResumeContextSession({ seededSession: null, currentSession: current, loadedSessionId: named.id, savedSessions: [named] });
  assert.equal(result, current);
  assert.equal(result.snapshot.customItems.length, 13);
  assert.equal(named.snapshot.customItems.length, 1);
  assert.equal(named.note, "Prior checkpoint");
});

test("an authoritative context seed keeps priority over local autosave and checkpoints", () => {
  const seed = session("canonical", "source", "Authoritative handoff");
  const current = session("autosave", "new", "Unrelated local edit", 13);
  assert.equal(workDesignResumeContextSession({ seededSession: seed, currentSession: current, loadedSessionId: "named", savedSessions: [session("named", "old", "Old checkpoint")] }), seed);
});

test("unchanged content retains its selected checkpoint identity and normal fallback behavior", () => {
  const named = session("named", "same", "Saved content");
  const current = { ...named, id: "autosave", name: "Autosaved Workspace" };
  assert.equal(workDesignResumeContextSession({ seededSession: null, currentSession: current, loadedSessionId: named.id, savedSessions: [named] }), named);
  assert.equal(workDesignResumeContextSession({ seededSession: null, currentSession: null, loadedSessionId: named.id, savedSessions: [named] }), named);
  assert.equal(workDesignResumeContextSession({ seededSession: null, currentSession: null, loadedSessionId: null, savedSessions: [named] }), named);
  assert.equal(workDesignResumeContextSession({ seededSession: null, currentSession: current, loadedSessionId: "missing", savedSessions: [] }), current);
  assert.equal(workDesignResumeContextSession({ seededSession: null, currentSession: null, loadedSessionId: null, savedSessions: [] }), null);
});
