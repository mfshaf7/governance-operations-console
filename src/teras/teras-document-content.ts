export type DocumentContentBlock = { kind: "heading" | "paragraph" | "list" | "ordered" | "code" | "quote"; lines: string[] };
export function documentContentBlocks(source: string): DocumentContentBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n"), blocks: DocumentContentBlock[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^\s*```/.test(line)) {
      const body: string[] = []; i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      blocks.push({ kind: "code", lines: body }); if (i < lines.length) i++; continue;
    }
    if (/^\s*#{1,6}\s+/.test(line)) { blocks.push({ kind: "heading", lines: [line.replace(/^\s*#{1,6}\s+/, "")] }); i++; continue; }
    const kind = /^\s*[-*+]\s+/.test(line) ? "list" : /^\s*\d+[.)]\s+/.test(line) ? "ordered" : /^\s*>\s?/.test(line) ? "quote" : "paragraph";
    const body: string[] = [];
    while (i < lines.length && lines[i].trim()) {
      const next = lines[i];
      if (body.length && (/^\s*(#{1,6}\s|```)/.test(next) || (kind === "list" ? !/^\s*[-*+]\s+/.test(next) : kind === "ordered" ? !/^\s*\d+[.)]\s+/.test(next) : kind === "quote" ? !/^\s*>/.test(next) : /^\s*(?:[-*+]\s|\d+[.)]\s|>)/.test(next)))) break;
      body.push(kind === "list" ? next.replace(/^\s*[-*+]\s+/, "") : kind === "ordered" ? next.replace(/^\s*\d+[.)]\s+/, "") : kind === "quote" ? next.replace(/^\s*>\s?/, "") : next); i++;
    }
    blocks.push({ kind, lines: body });
  }
  return blocks;
}

export function documentSummary(source: string, limit = 160): string {
  const blocks = documentContentBlocks(source);
  const body = blocks.find(block => block.kind !== "heading" && block.kind !== "code");
  const text = (body ?? blocks.find(block => block.kind === "heading"))?.lines.join(" ") ?? "";
  const plain = text
    .replace(/!?\[([^\]\n]+)\]\((?:[^()\n]|\([^()\n]*\))*\)/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/(\*{1,3}|_{1,3}|~~)(\S(?:.*?\S)?)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= limit) return plain;
  const excerpt = plain.slice(0, limit - 1);
  const lastSpace = excerpt.lastIndexOf(" ");
  return `${lastSpace > limit / 2 ? excerpt.slice(0, lastSpace) : excerpt}…`;
}
