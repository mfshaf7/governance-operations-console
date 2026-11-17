import test from "node:test";
import assert from "node:assert/strict";
import { completionEvidenceFromForm } from "../../src/domain-workspaces/delivery/work-model/execution/completion-evidence-form.ts";

const notes={completion_summary:"The planned review is complete.",changed_surfaces:"Reviewed the original decision\nLinked the signed receipt",test_result_evidence:"This was a documentation review, with no executable change.",validation_evidence:"Read the original work record and its signed receipt.",completion_note:""};
test("plain evidence is formatted only after explicit result selection",()=>{
  assert.throws(()=>completionEvidenceFromForm(notes,"",""),/Choose the test result/);
  const result=completionEvidenceFromForm(notes,"NOT APPLICABLE","PASS");
  assert.equal(result.changed_surfaces,"- Reviewed the original decision\n- Linked the signed receipt");
  assert.equal(result.test_result_evidence,`- NOT APPLICABLE: ${notes.test_result_evidence}`);
  assert.equal(result.validation_evidence,`- PASS: ${notes.validation_evidence}`);
  assert.equal(result.completion_summary,notes.completion_summary);
});
test("preformatted evidence retains its outcome and contradictory selections are rejected",()=>{
  const original={...notes,test_result_evidence:"- FAIL: Regression remains unresolved.",validation_evidence:"- PASS: Original readback verified."};
  assert.equal(completionEvidenceFromForm(original,"","").test_result_evidence,original.test_result_evidence);
  assert.throws(()=>completionEvidenceFromForm(original,"PASS","PASS"),/conflicts/);
  assert.equal(completionEvidenceFromForm(original,"FAIL","PASS").validation_evidence,original.validation_evidence);
});
