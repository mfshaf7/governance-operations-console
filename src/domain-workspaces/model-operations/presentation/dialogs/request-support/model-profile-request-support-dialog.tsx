'use client';
import{TerasContentTray,TerasDialog,TerasFieldStack,TerasTechnicalDetails}from'@/teras';
import{modelProfileRequestCapability}from'../../../work-model/profile-requests/model-profile-request-capability.ts';
import{modelProfileRequestMetadata,modelProfileRequestRequirementRows}from'./model-profile-request-support-view-model.ts';
export function ModelProfileRequestSupportDialog({onClose,open}:{onClose:()=>void;open:boolean}){
 return <TerasDialog contentOverflow="auto" height="content" width="standard" kicker="Purpose profiles" title="Profile request requirements" description="What you provide, what the system prepares and what happens next." open={open} onClose={onClose}>
  <TerasFieldStack spacing="normal">{modelProfileRequestRequirementRows().map(row=><TerasContentTray key={row.id} kicker={row.label} description={row.detail}/>)}<TerasTechnicalDetails items={modelProfileRequestMetadata(modelProfileRequestCapability)}/></TerasFieldStack>
 </TerasDialog>;
}
