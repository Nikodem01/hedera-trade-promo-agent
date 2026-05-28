"use client";
// Renders the agent's closing narrative as styled markdown — links auto-resolve
// (HashScan deep links land here) and headings are demoted to bold lines so the
// prose stays compact and never re-dumps the verdict's criteria as a table.
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const link = "underline decoration-dotted underline-offset-2";

export function ProseMarkdown({ children }: { children: string }) {
  return (
    <div className="text-[13.5px] leading-[1.6]" style={{ color: "var(--ink-2)", fontStyle: "normal" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className={link} style={{ color: "var(--emerald)" }}>{children}</a>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold" style={{ color: "var(--ink)" }}>{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
          code: ({ children }) => <code className="mono text-[12px] px-1 py-0.5 rounded-sm" style={{ background: "var(--paper-2)" }}>{children}</code>,
          h1: ({ children }) => <p className="font-semibold mb-1" style={{ color: "var(--ink)" }}>{children}</p>,
          h2: ({ children }) => <p className="font-semibold mb-1" style={{ color: "var(--ink)" }}>{children}</p>,
          h3: ({ children }) => <p className="font-semibold mb-1" style={{ color: "var(--ink)" }}>{children}</p>,
          table: ({ children }) => <div className="overflow-x-auto my-2"><table className="text-[12px] border-collapse">{children}</table></div>,
          th: ({ children }) => <th className="text-left px-2 py-1 mono text-[10px] uppercase tracking-[0.1em]" style={{ borderBottom: "1px solid var(--keyline-2)", color: "var(--ink-faint)" }}>{children}</th>,
          td: ({ children }) => <td className="px-2 py-1" style={{ borderBottom: "1px solid var(--keyline-soft)" }}>{children}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
