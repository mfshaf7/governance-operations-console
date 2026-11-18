import { documentContentBlocks } from "./teras-document-content.ts";
import styles from "./teras-document.module.css";

function inlineText(text: string) {
  return text.split(/(`[^`\n]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, index) => {
    if (part.startsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    const link = /^\[([^\]]+)\]\((https?:\/\/[^\s]+)\)$/.exec(part);
    return link ? <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a> : part;
  });
}

export function TerasDocument({ content, ariaLabel }: { content: string; ariaLabel: string }) {
  return (
      <article className={styles.description} aria-label={ariaLabel}>
        {documentContentBlocks(content).map((block, index) => block.kind === "heading" ? <h4 key={index}>{inlineText(block.lines[0])}</h4>
          : block.kind === "code" ? <pre key={index}><code>{block.lines.join("\n")}</code></pre>
          : block.kind === "list" ? <ul key={index}>{block.lines.map((line, n) => <li key={n}>{inlineText(line)}</li>)}</ul>
          : block.kind === "ordered" ? <ol key={index}>{block.lines.map((line, n) => <li key={n}>{inlineText(line)}</li>)}</ol>
          : block.kind === "quote" ? <blockquote key={index}>{inlineText(block.lines.join(" "))}</blockquote>
          : <p key={index}>{inlineText(block.lines.join(" "))}</p>)}
      </article>
  );
}
