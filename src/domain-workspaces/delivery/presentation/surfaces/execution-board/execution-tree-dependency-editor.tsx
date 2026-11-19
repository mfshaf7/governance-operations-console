"use client";
import { useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasFieldStack, TerasList, TerasRecordMetaText, TerasSelectField, TerasSignalItem } from "@/teras";
import { executionDependencyNodes, executionDependencyReference } from "../../../work-model/execution/execution-tree-dependencies.ts";
import type { ExecutionTreeDraftNode } from "./execution-board-view-model.ts";

export function ExecutionTreeDependencyEditor({tree,node,disabled,onChange}: {
  tree:ExecutionTreeDraftNode;node:ExecutionTreeDraftNode;disabled:boolean;onChange:(ids:string[])=>void;
}) {
  const [selected,setSelected]=useState("");
  const nodes=executionDependencyNodes(tree), current=node.dependsOnIds??[], target=executionDependencyReference(node);
  const label=(ref:string)=>{
    const found=nodes.find(item=>executionDependencyReference(item)===ref);
    return found?`${found.kind}${found.legacyWorkPackageId?` ${found.legacyWorkPackageId}`:" · new"} · ${found.title}`:ref.replace("work-item-","Work item ")+" · outside this package";
  };
  const options=nodes.filter(item=>executionDependencyReference(item)!==target&&!current.includes(executionDependencyReference(item)))
    .map(item=>({value:executionDependencyReference(item),label:label(executionDependencyReference(item))}));
  return <TerasContentTray title="Work prerequisites" description="Choose work that must finish before this item can proceed. Changes stay in this draft until Review and Apply.">
    <TerasFieldStack spacing="compact">
      {current.length?<TerasList frame="contained" scrollHeight="short" ariaLabel="Selected prerequisites">
        {current.map(ref=><TerasSignalItem key={ref} label="Required work" title={label(ref)} textOverflow="wrap"
          actions={<TerasActionButton emphasis="secondary" disabled={disabled} aria-label={`Remove prerequisite ${label(ref)}`} onClick={()=>onChange(current.filter(id=>id!==ref))}>Remove</TerasActionButton>}/>)}
      </TerasList>:<TerasRecordMetaText>No prerequisites selected.</TerasRecordMetaText>}
      <TerasSelectField label="Prerequisite work item" disabled={disabled||!options.length} value={selected}
        options={[{value:"",label:options.length?"Choose work from this package":"No other work available"},...options]} onValueChange={setSelected}/>
      <TerasActionRow spacing="compact"><TerasActionButton emphasis="secondary" disabled={disabled||!selected||!options.some(item=>item.value===selected)}
        onClick={()=>{onChange([...current,selected]);setSelected("");}}>Add prerequisite</TerasActionButton></TerasActionRow>
      <TerasRecordMetaText>Existing links to other packages are retained. The backend checks the final dependency rules.</TerasRecordMetaText>
    </TerasFieldStack>
  </TerasContentTray>;
}
