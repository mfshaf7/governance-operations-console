import { Fragment, type HTMLAttributes, type ReactNode } from "react";
import { documentContentBlocks } from "./teras-document-content.ts";
import styles from "./teras-document.module.css";

function inlineText(text: string, renderText?: (text: string) => ReactNode) {
  return text.split(/(`[^`\n]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, index) => {
    if (part.startsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**")) {
      const label = part.slice(2, -2);
      return <strong key={index}>{renderText ? renderText(label) : label}</strong>;
    }
    const link = /^\[([^\]]+)\]\((https?:\/\/[^\s]+)\)$/.exec(part);
    if (link) {
      return <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer">
        {renderText ? renderText(link[1]) : link[1]}
      </a>;
    }
    return renderText ? <Fragment key={index}>{renderText(part)}</Fragment> : part;
  });
}

type TerasDocumentProps = {
  ariaLabel: string;
  renderText?: (text: string) => ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "children"> & (
  { content: string; noteSections?: never } |
  { content?: never; noteSections: ReadonlyArray<{ level: number; text: string }> }
);

export function TerasDocument({ content, ariaLabel, noteSections, renderText, ...props }: TerasDocumentProps) {
  if (noteSections) return (
    <article {...props} className={styles.note} aria-label={ariaLabel}>
      {noteSections.map(({ level, text }, index) => {
        const Part = level === 0 ? "p" : level === 1 ? "h4" : level === 2 ? "h5" : "h6";
        return <Part key={index}>{renderText ? renderText(text) : text}</Part>;
      })}
    </article>
  );
  const renderInline = (text: string) => inlineText(text, renderText);
  return (
      <article {...props} className={styles.description} aria-label={ariaLabel}>
        {documentContentBlocks(content).map((block, index) => block.kind === "heading" ? <h4 key={index}>{renderInline(block.lines[0])}</h4>
          : block.kind === "code" ? <pre key={index}><code>{block.lines.join("\n")}</code></pre>
          : block.kind === "list" ? <ul key={index}>{block.lines.map((line, n) => <li key={n}>{renderInline(line)}</li>)}</ul>
          : block.kind === "ordered" ? <ol key={index}>{block.lines.map((line, n) => <li key={n}>{renderInline(line)}</li>)}</ol>
          : block.kind === "quote" ? <blockquote key={index}>{renderInline(block.lines.join(" "))}</blockquote>
          : <p key={index}>{renderInline(block.lines.join(" "))}</p>)}
      </article>
  );
}
