"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolOrDynamicToolName,
  isTextUIPart,
  isToolOrDynamicToolUIPart,
  type UIMessage,
} from "ai";

export type Scenario = {
  id: string;
  file: string;
  retailer: string;
  promo: string;
  imageRef: string;
  narrative: string;
  expect: string;
  contractText: string;
};

const HASHSCAN_RE = /(https:\/\/hashscan\.io\/\S+)/g;

/** Linkify HashScan URLs (and any url) inside streamed agent text. */
function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(HASHSCAN_RE);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((p, i) =>
        HASHSCAN_RE.test(p) ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-dotted underline-offset-2 hover:text-emerald-300"
          >
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}

function toolLabel(name: string) {
  return name.replace(/_tool$/, "").replace(/_/g, " ");
}

function ToolCard({ part }: { part: Record<string, unknown> }) {
  const name = getToolOrDynamicToolName(part as Parameters<typeof getToolOrDynamicToolName>[0]);
  const state = String(part.state ?? "");
  const output = part.output;
  const input = part.input;
  const done = state === "output-available";
  const errored = state === "output-error";

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 text-xs">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            errored ? "bg-red-500" : done ? "bg-emerald-500" : "bg-amber-400 animate-pulse"
          }`}
        />
        <span className="font-mono font-semibold text-zinc-200">{toolLabel(name)}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-zinc-500">{state}</span>
      </div>
      {input != null && (
        <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/40 p-2 text-[11px] text-zinc-400">
          {JSON.stringify(input, null, 2)}
        </pre>
      )}
      {done && output != null && (
        <pre className="mt-2 max-h-72 overflow-auto rounded bg-black/40 p-2 text-[11px] text-emerald-300/90">
          {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
        </pre>
      )}
      {errored && (
        <p className="mt-2 text-red-400">{String(part.errorText ?? "tool error")}</p>
      )}
    </div>
  );
}

function MessageView({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] space-y-2 rounded-2xl px-4 py-3 text-sm ${
          isUser ? "bg-sky-600/20 text-sky-100" : "bg-zinc-800/60 text-zinc-100"
        }`}
      >
        {message.parts.map((part, i) => {
          if (isTextUIPart(part)) {
            return part.text ? <LinkifiedText key={i} text={part.text} /> : null;
          }
          if (isToolOrDynamicToolUIPart(part)) {
            return <ToolCard key={i} part={part as unknown as Record<string, unknown>} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

export default function Console({ scenarios }: { scenarios: Scenario[] }) {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent" }),
  });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  function submitClaim(s: Scenario) {
    sendMessage({
      text:
        `New trade-promotion claim from ${s.retailer} — ${s.promo}. Adjudicate it.\n\n` +
        `CONTRACT:\n${s.contractText}\n\n` +
        `IMAGE_REF: ${s.imageRef}\n` +
        `NARRATIVE: ${s.narrative}`,
    });
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <header className="border-b border-zinc-800 pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
          PromoProof <span className="text-zinc-500">· trade-promotion settlement agent</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Adjudicates retailer proof-of-performance against bespoke contracts and settles on Hedera —
          HCS audit, HTS receipt, HBAR transfer. Settlement requires explicit approval.
        </p>
      </header>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Submit a claim
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => submitClaim(s)}
              disabled={busy}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-left transition hover:border-zinc-600 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="text-sm font-medium text-zinc-100">{s.promo}</div>
              <div className="text-xs text-zinc-400">{s.retailer}</div>
              <div className="mt-2 text-[11px] text-zinc-500">{s.expect}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-zinc-800 bg-black/20 p-4">
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-600">
            Pick a claim above to start an adjudication.
          </p>
        ) : (
          messages.map((m) => <MessageView key={m.id} message={m} />)
        )}
        {busy && <p className="text-xs text-zinc-500">PromoProof is working…</p>}
      </section>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && send()}
          placeholder="Approve & settle, or provide more evidence (e.g. a POS timestamp)…"
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
