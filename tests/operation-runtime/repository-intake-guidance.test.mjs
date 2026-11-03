import assert from 'node:assert/strict';
import test from 'node:test';
import {repositoryIntakeDraftFromCustody,repositoryIntakeMissingFields,repositoryIntakeRequiresCatalog,repositoryIntakeRoles,repositoryIntakeTypeDraft,repositoryIntakeTypes} from '../../src/domain-workspaces/repository/presentation/dialogs/admission/repository-intake-guidance.ts';
import {emptyRepositoryIntakeDraft,repositoryIntakeRecord} from '../../src/domain-workspaces/repository/presentation/dialogs/admission/repository-intake-candidate.ts';
const source={...emptyRepositoryIntakeDraft,repoClass:'product-source',graphRole:'product-runtime-source',notes:'Owns source and tests; shared runtime belongs to its existing owner.',validationPosture:'covered-by-owner-repo',validationNotes:'Run application behavior tests and source validation.',securityBinding:'false'};

test('repository presets derive classification metadata but do not guess check or security decisions',()=>{
 for(const option of repositoryIntakeTypes){
  const draft=repositoryIntakeTypeDraft({...emptyRepositoryIntakeDraft},option.value);
  assert.equal(draft.repoClass,option.repoClass);assert.equal(draft.graphRole,option.role);
  assert.ok(repositoryIntakeRoles('').some(role=>role.value===draft.graphRole));
  assert.equal(draft.securityBinding,'');assert.equal(draft.validationPosture,["application","product","prototype"].includes(option.value)?"covered-by-owner-repo":"");
 }
 assert.deepEqual(repositoryIntakeTypeDraft(source,'custom'),source);
 assert.deepEqual(repositoryIntakeRecord(source).validation_behavior.catalog_refs,[]);
});
test('only an existing creation description is prefilled, without inventing owner purpose for linked custody',()=>{
 const creation=repositoryIntakeDraftFromCustody({request:{action:'provision-new',provisioning:{description:'Existing reviewed creation description.'}}});
 assert.equal(creation.notes,'Existing reviewed creation description.');
 assert.equal(creation.repoClass,'');assert.equal(creation.graphRole,'');assert.equal(creation.securityBinding,'');
 assert.equal(repositoryIntakeDraftFromCustody({request:{action:'link-existing'}}).notes,'');
});
test('direct check approaches need real bindings, and limited profiles enforce the owner role combinations',()=>{
 for(const validationPosture of ['catalog-owner','profile-gated-external-owner','interface-contract-backed']){
  assert.equal(repositoryIntakeRequiresCatalog(validationPosture),true);
  assert.equal(repositoryIntakeRecord({...source,validationPosture}),null);
  assert.ok(repositoryIntakeRecord({...source,validationPosture,catalogRefs:'contract-model'}));
 }
 for(const [posture,validRole] of [['proposed-profile-gated','proposed-shared-platform-component'],['build-admitted-profile-gated','shared-platform-component']]){
  assert.equal(repositoryIntakeRecord({...source,validationPosture:posture}),null);
  assert.ok(repositoryIntakeRecord({...source,validationPosture:posture,graphRole:validRole}));
  assert.ok(repositoryIntakeRecord({...source,validationPosture:posture,graphRole:'context-packet-provider'}));
 }
 assert.equal(repositoryIntakeRecord({...source,validationPosture:'unknown'}),null);
 assert.equal(repositoryIntakeRecord({...source,graphRole:'unknown'}),null);
});
test('errors name the missing user decision while security-bound and custom categories remain explicit',()=>{
 assert.ok(repositoryIntakeMissingFields(emptyRepositoryIntakeDraft).some(text=>text.includes('security binding')));
 assert.equal(repositoryIntakeRecord({...source,securityBinding:''}),null);
 assert.equal(repositoryIntakeRecord({...source,securityBinding:'true'}),null);
 assert.equal(repositoryIntakeRecord({...source,repoClass:'another-owner-class',securityBinding:'true',securityOwner:'security-architecture'}).security_owner,'security-architecture');
 assert.equal(repositoryIntakeRecord({...source,securityOwner:'old-unselected-owner'}).security_owner,null);
});

test('repository-owned source registration derives governance notes without asking for an application test plan',()=>{
 const draft={...source,validationNotes:''};
 assert.deepEqual(repositoryIntakeMissingFields(draft),[]);
 const record=repositoryIntakeRecord(draft);
 assert.match(record.validation_behavior.notes,/Application verification may be configured later/);
 assert.match(record.validation_behavior.notes,/not application acceptance/);
});
