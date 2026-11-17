export type ContextBoardSequenceNode = { id: string; title: string; detail: string; kind: "change" | "work" | "approval"; facts: Record<string, unknown> };
export type ContextBoardSequenceEdge = { from: string; to: string; label: string };
export type ContextBoardSequence = { nodes: ContextBoardSequenceNode[]; edges: ContextBoardSequenceEdge[]; issues: string[] };
export function contextBoardSequenceLayout(plan: ContextBoardSequence) {
  const ids = new Set(plan.nodes.map(node => node.id)), ranks = new Map(plan.nodes.map(node => [node.id, 0]));
  const pending = new Set(ids), visited = new Set<string>();
  while (pending.size) {
    const ready = [...pending].filter(id => plan.edges.filter(edge => edge.to === id && ids.has(edge.from)).every(edge => visited.has(edge.from)));
    if (!ready.length) break;
    for (const id of ready) {
      ranks.set(id, Math.max(0, ...plan.edges.filter(edge => edge.to === id && ids.has(edge.from)).map(edge => (ranks.get(edge.from) ?? 0) + 1)));
      visited.add(id); pending.delete(id);
    }
  }
  const rows = new Map<number, number>(), positions = new Map<string,{x:number;y:number}>();
  for (const node of plan.nodes) {
    const rank = ranks.get(node.id) ?? 0, row = rows.get(rank) ?? 0; rows.set(rank,row+1);
    positions.set(node.id,{x:40+rank*350,y:45+row*155});
  }
  return { positions, width:Math.max(700,...[...positions.values()].map(point=>point.x+310)),height:Math.max(300,...[...positions.values()].map(point=>point.y+135)),cyclic:pending.size>0 };
}
export function contextBoardSequenceSvg(plan: ContextBoardSequence) {
  const layout=contextBoardSequenceLayout(plan), escape=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"})[char]!);
  // Full labels remain in adjacent readable details. Export has a title per node.
  const lines=(value:string)=>{ const all=value.match(/.{1,34}/g)??[""]; return all.slice(0,3).map((line,index)=>index===2&&all.length>3?line.slice(0,31)+"…":line); };
  const edges=plan.edges.map(edge=>{const a=layout.positions.get(edge.from),b=layout.positions.get(edge.to);return a&&b?`<path d="M ${a.x+270} ${a.y+45} C ${a.x+310} ${a.y+45}, ${b.x-40} ${b.y+45}, ${b.x} ${b.y+45}" fill="none" stroke="#b6a27a" stroke-width="2" marker-end="url(#arrow)"/><title>${escape(edge.label)}</title>`:"";}).join("");
  const nodes=plan.nodes.map(node=>{const p=layout.positions.get(node.id)!;return `<g><title>${escape(node.title+" — "+node.detail)}</title><rect x="${p.x}" y="${p.y}" width="270" height="115" rx="10" fill="#17202c" stroke="${node.kind==="approval"?"#e5b351":"#8197b5"}"/><text x="${p.x+14}" y="${p.y+24}" fill="#ffcc74" font-family="sans-serif" font-size="12">${escape(node.kind==="approval"?"REQUIRED APPROVAL":node.kind==="change"?"CHANGE GROUP":"WORK ITEM")}</text>${lines(node.title).map((line,index)=>`<text x="${p.x+14}" y="${p.y+49+index*16}" fill="#f4eee2" font-family="sans-serif" font-size="13">${escape(line)}</text>`).join("")}</g>`;}).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}"><title>Implementation sequence from the selected plan</title><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="#b6a27a"/></marker></defs><rect width="100%" height="100%" fill="#0d1119"/>${edges}${nodes}</svg>`;
}
