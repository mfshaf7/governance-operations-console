import test from "node:test";
import assert from "node:assert/strict";
import { executionPackageNextAction, executionPackageWorkGroups, executionWorkChoices, executionBlockerApproach, executionPackageText, executionReadableTime } from "../../src/domain-workspaces/delivery/work-model/execution/execution-package-content.ts";
const node = (id, type, status, children = []) => ({ id: `node-${id}`, legacy_work_package_id: id, component_type: type, backend_status: status, title: `Work ${id}`, children });
const tree = node(1, "Epic", "in-progress", [node(2,"Feature","in-progress", [node(3,"User story","blocked"),node(4,"Task","ready"),node(5,"Defect","blocked")]),node(6,"User story","in-progress")]);
const groups = executionPackageWorkGroups(tree);
const action = type => ({ action_type: type, enabled: true, label: type });
const next = options => executionPackageNextAction({ status: "in-progress", closeoutPending: false, hasCloseout: false, actions: [], groups, ...options });

test("status summaries count runnable item types while all-work navigation retains the hierarchy", () => {
  assert.deepEqual(groups.map(group => [group.status,group.count]), [["in-progress",1],["blocked",2],["ready",1]]);
  assert.deepEqual(executionWorkChoices([tree],"blocked").map(item=>item.legacy_work_package_id),[3,5]);
  assert.deepEqual(executionWorkChoices([tree],"all").map(item=>item.legacy_work_package_id),[1,2,3,4,5,6]);
  assert.deepEqual(executionPackageWorkGroups(null).map(group=>group.count),[null,null,null]);
  const unidentified = node(7,"Task","blocked"); unidentified.legacy_work_package_id = null;
  assert.equal(executionPackageWorkGroups(node(1,"Epic","blocked",[unidentified]))[1].count,1);
  assert.deepEqual(executionWorkChoices([unidentified],"blocked"),[]);
});
test("next guidance follows recorded posture without inferring closeout or permission from counts", () => {
  assert.equal(next({}).filter,"in-progress");
  assert.equal(next({closeoutPending:true,hasCloseout:true}).kind,"closeout");
  assert.equal(next({closeoutPending:true,hasCloseout:false}).kind,"work");
  const blocker=action("clear-blocker"),resume=action("resume");
  assert.equal(next({status:"blocked",actions:[blocker]}).action,blocker);
  assert.equal(next({status:"parked",actions:[resume]}).action,resume);
  assert.equal(next({status:"blocked"}).action,undefined);
  assert.match(next({status:"retired"}).title,/retired/);
  assert.match(next({groups:executionPackageWorkGroups(node(1,"Epic","ready"))}).title,/Choose/);
});
test("plain blocker wording expands known field names and preserves undecided dates", () => {
  assert.equal(executionBlockerApproach({decision_path:"accept-risk"}),"Accept the risk");
  assert.equal(executionBlockerApproach({decision_path:"remove"}),"Resolve the cause");
  assert.equal(executionPackageText("Owner Repo is missing; owner_repo has not been set."),"Implementation repository is missing; implementation repository has not been set.");
  assert.equal(executionPackageText("Attach owner repo"),"Attach implementation repository");
  assert.equal(executionReadableTime("not-a-date"),"Time unavailable");
});
