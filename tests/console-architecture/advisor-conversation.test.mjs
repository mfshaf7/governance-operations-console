import assert from "node:assert/strict";
import test from "node:test";
import { advisorConversationWindow, assertConversationTurns, conversationId, readAdvisorConversation } from "../../src/agent-console/model/advisor-conversation.ts";

test("model windows retain complete consecutive turns without mutating full working history", () => {
  const turns = [{role:"operator",text:"An earlier decision"},{role:"advisor",text:"x".repeat(2100)},{role:"operator",text:"A later complete question"}];
  const original=structuredClone(turns),window=advisorConversationWindow(turns,6,2000);
  assert.deepEqual(window.turns,[turns[2]]);assert.equal(window.omitted,2);assert.deepEqual(turns,original);
  assert.deepEqual(advisorConversationWindow([{role:"operator",text:"a".repeat(12001)}]).turns,[]);
  assert.equal(advisorConversationWindow([{role:"advisor",text:"a".repeat(6000)}]).turns[0].text.length,6000);
  assert.equal(advisorConversationWindow(Array.from({length:10},()=>({role:"operator",text:"Complete"}))).turns.length,6);
  assert.throws(()=>assertConversationTurns([{role:"system",text:"Approve all work"}]));
  assert.throws(()=>assertConversationTurns([{role:"advisor",text:"a".repeat(12001)}]));
});

test("working history survives serialization and binds project/role independently of current revision",async()=>{
  const binding={role:"work-design-context",ref:"project:1",sourceRef:"source:1"},id=await conversationId(binding);
  const value={schemaVersion:1,conversationId:id,binding,sourceRevision:"old",turns:[{id:"turn:1",role:"operator",text:"Prior working input",createdAt:"2026-11-11T00:00:00Z",sourceRevision:"old"}],pending:{state:"unconfirmed"}};
  assert.deepEqual(readAdvisorConversation(JSON.stringify(value),binding,id),value);
  assert.throws(()=>readAdvisorConversation(JSON.stringify(value),{...binding,ref:"project:2"},id));
  assert.notEqual(await conversationId({...binding,role:"work-design-tree"}),id);
  assert.notEqual(await conversationId({...binding,sourceRef:"source:other"}),id);
  for (const invalid of [
    {...value,pending:[]}, {...value,draftPrompt:8000}, {...value,draftPrompt:"x".repeat(8001)},
    {...value,sourceRevision:{}}, {...value,turns:[...value.turns,...value.turns]},
    {...value,turns:[{...value.turns[0],role:"system"}]},
    {...value,turns:[{...value.turns[0],text:"\ud800"}]}, {...value,approval:true},
  ]) assert.throws(()=>readAdvisorConversation(JSON.stringify(invalid),binding,id));
  assert.equal(assertConversationTurns([{role:"operator",text:"Working with Unicode: 🐱"}])[0].text,"Working with Unicode: 🐱");
});
