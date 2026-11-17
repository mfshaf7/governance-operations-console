"use client";
import { useState, type ReactNode } from "react";
import { TerasActionButton, TerasActionRow, TerasContentRegion, TerasEmptyState, TerasFieldStack, TerasMediaSnapshotViewerDialog, TerasPanel, TerasPanelHeader, TerasTechnicalDetails } from "@/teras";
import { contextBoardSequenceLayout, contextBoardSequenceSvg, type ContextBoardSequence, type ContextBoardSequenceNode } from "./context-board-sequence.ts";
import styles from "./context-board-sequence.module.css";
export function ContextBoardSequenceView({plan,sourceLabel,controls,renderDetails,fit="content"}:{fit?:"content"|"workspace";plan:ContextBoardSequence;sourceLabel:string;controls:ReactNode;renderDetails:(node:ContextBoardSequenceNode)=>ReactNode}) {
  const [selected,setSelected]=useState(""),[zoom,setZoom]=useState(1),[full,setFull]=useState(false);
  const layout=contextBoardSequenceLayout(plan);
  const current=plan?.nodes.find(node=>node.id===selected)??plan?.nodes[0];
  const svg=plan?contextBoardSequenceSvg(plan):null;
  return <TerasFieldStack spacing="normal" className={styles.workspace} data-fit={fit}>
    <TerasPanelHeader kicker={sourceLabel} title="Implementation sequence" description="Arrows show the dependencies and approvals supplied by this plan. They describe implementation order; execution progress is tracked on the board."/>
    {controls}
    {!plan.nodes.length?<TerasEmptyState>No sequence is recorded in this plan yet. Add the relevant change groups or work dependencies in Prepare Plan, or ask the advisor to draft them.</TerasEmptyState>:plan&&layout?<>
      <TerasActionRow spacing="compact">
        <TerasActionButton emphasis="secondary" disabled={zoom<=0.5} onClick={()=>setZoom(value=>Math.max(.5,value-.25))}>Zoom out</TerasActionButton>
        <TerasActionButton emphasis="secondary" disabled={zoom>=2} onClick={()=>setZoom(value=>Math.min(2,value+.25))}>Zoom in</TerasActionButton>
        <TerasActionButton emphasis="secondary" onClick={()=>setZoom(1)}>Reset view</TerasActionButton>
        <TerasActionButton emphasis="secondary" onClick={()=>setFull(true)}>Open full diagram</TerasActionButton>
      </TerasActionRow>
      <TerasContentRegion scroll className={styles.sequenceCanvas} aria-label="Implementation sequence canvas" tabIndex={0}>
        <svg width={layout.width*zoom} height={layout.height*zoom} viewBox={`0 0 ${layout.width} ${layout.height}`} role="group" aria-label="Select a change or work item">
          <defs><marker id="technical-plan-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>
          {plan.edges.map((edge,index)=>{const a=layout.positions.get(edge.from),b=layout.positions.get(edge.to);return a&&b?<path key={index} className={styles.sequenceEdge} d={`M ${a.x+270} ${a.y+45} C ${a.x+310} ${a.y+45}, ${b.x-40} ${b.y+45}, ${b.x} ${b.y+45}`} markerEnd="url(#technical-plan-arrow)"><title>{edge.label}</title></path>:null;})}
          {plan.nodes.map(node=>{const at=layout.positions.get(node.id)!;const lines=node.title.match(/.{1,34}/g)??[""];return <g key={node.id} role="button" tabIndex={0} aria-label={`Inspect ${node.title}`} aria-pressed={current?.id===node.id}
            className={styles.sequenceNode} onClick={()=>setSelected(node.id)} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();setSelected(node.id);}}}>
            <title>{node.title} — {node.detail}</title><rect x={at.x} y={at.y} width={270} height={115} rx={10} data-kind={node.kind} data-selected={current?.id===node.id}/>
            <text x={at.x+14} y={at.y+24} className={styles.sequenceKicker}>{node.kind==="approval"?"REQUIRED APPROVAL":node.kind==="change"?"CHANGE GROUP":"WORK ITEM"}</text>
            {lines.slice(0,3).map((line,index)=><text key={index} x={at.x+14} y={at.y+49+index*16} className={styles.sequenceLabel}>{index===2&&lines.length>3?line.slice(0,31)+"…":line}</text>)}
          </g>;})}
        </svg>
      </TerasContentRegion>
      {layout.cyclic?<TerasEmptyState>This draft contains a dependency cycle. The diagram is available for inspection; approval still requires owner validation.</TerasEmptyState>:null}
      {plan.issues.length?<TerasTechnicalDetails summary="Sequence issues" items={plan.issues.map((issue,index)=>({label:`Issue ${index+1}`,value:issue}))}/>:null}
      {current?<TerasPanel frame="padded" spacing="normal" treatment="neutral"><TerasPanelHeader kicker={current.kind==="approval"?"Required approval":"Selected plan element"} title={current.title} description={current.detail}/><TerasTechnicalDetails summary="Selected element details" items={[]}>{renderDetails(current)}</TerasTechnicalDetails></TerasPanel>:null}
    </>:null}
    {svg?<TerasMediaSnapshotViewerDialog open={full} onClose={()=>setFull(false)} kicker={sourceLabel} title="Implementation sequence" toolbarTitle="Implementation sequence" imageSrc={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} imageAlt="Implementation sequence from recorded plan facts"/>:null}
  </TerasFieldStack>;
}
