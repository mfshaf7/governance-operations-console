import assert from 'node:assert/strict';
import test from 'node:test';
import {classificationResultGuidance, classificationNextAction, classificationResultTitle} from '../../src/console-integration/workspace-intake/workspace-intake-classification-display.ts';
import {registryResponsibilities} from '../../src/workspace-registry/presentation/workspace-registry-copy.ts';
import {componentClassLabel} from '../../src/console-integration/workspace-intake/workspace-intake-display-options.ts';

test('completed classifications preserve distinct admission, planning and exclusion outcomes', () => {
  const result={status:'succeeded',next_action:'complete'};
  assert.equal(classificationResultTitle(result.status),'Classification recorded');
  assert.match(classificationResultGuidance(result,'admitted'),/does not activate/);
  assert.equal(classificationNextAction(result,'admitted'),'Review activation');
  assert.match(classificationResultGuidance(result,'proposed'),/not active/);
  assert.equal(classificationNextAction(result,'proposed'),'Complete planning before admission');
  assert.match(classificationResultGuidance(result,'out-of-scope'),/no activation/);
  assert.equal(classificationNextAction(result,'out-of-scope'),'No activation required');
  assert.equal(classificationNextAction(result,'unselected'),'Check current Registry status');
});
test('pending, failed and source-review requests never claim a completed classification',()=>{
 for(const status of ['accepted','evaluating','preparing','review-required','requires-action','rejected','cancelled']) {
  const result={status,next_action:status==='requires-action'?'restore-dependency-and-retry':'continue',review:null};
  assert.notEqual(classificationResultTitle(status),'Classification recorded');
  assert.notEqual(classificationNextAction(result,'admitted'),'Review activation');
 }
 assert.match(classificationResultGuidance({status:'requires-action',next_action:'restore-dependency-and-retry'},'admitted'),/same request/);
});
test('mixed responsibility references display known products separately without altering source bindings',()=>{
 const refs=Object.freeze(['synthetic-runtime','synthetic-security','synthetic-product']);
 assert.deepEqual(registryResponsibilities(refs,['synthetic-product']),{repositories:['synthetic-runtime','synthetic-security'],products:['synthetic-product']});
 assert.deepEqual(refs,['synthetic-runtime','synthetic-security','synthetic-product']);
 assert.deepEqual(registryResponsibilities(['same-name'],['same-name'],['same-name']),{repositories:['same-name'],products:[]});
 // Unknown references are retained, never silently discarded or guessed to be products.
 assert.deepEqual(registryResponsibilities(['legacy-reference'],[]),{repositories:['legacy-reference'],products:[]});
});
test('component types remain readable and custom legacy values remain visible',()=>{
 assert.equal(componentClassLabel('shared-platform'),'Shared infrastructure service');
 assert.equal(componentClassLabel('custom-existing-class'),'custom-existing-class');
 assert.equal(componentClassLabel(null),'Not in scope');
});
