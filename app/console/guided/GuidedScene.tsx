"use client";
// Presentational primitives for the guided tour. Tokens-only — reuses the existing
// design language (paper/ink/emerald, hairlines, mono labels, the timeline-dot motif,
// anim-reveal) so the tour looks native, not bolted on. No data, no business logic:
// it just frames whatever artifact a scene hands it and keeps the viewer oriented.
import type { ReactNode } from "react";
import { ExternalIcon } from "../primitives";
import type { SceneCopy, Annotation as Ann } from "./narration";

export type RunMode = "verified" | "live";

/** The global run-mode controller — the single switch that drives the whole vertical
 * timeline. "Verified run" replays the frozen on-chain capture instantly; "Live testnet
 * sandbox" calls the real LLM + Hedera and streams each Agent Kit call as it happens.
 * Sticky at the top of the viewport so it stays reachable anywhere in the scroll. */
export function RunModeBar({ mode, onChange }: { mode: RunMode; onChange: (m: RunMode) => void }) {
  const Btn = ({ m, label, sub, accent }: { m: RunMode; label: string; sub: string; accent: string }) => {
    const active = mode === m;
    return (
      <button
        onClick={() => onChange(m)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-[3px]"
        style={{
          background: active ? "var(--paper)" : "transparent",
          boxShadow: active ? "inset 0 0 0 1px var(--keyline-2), 0 1px 2px rgba(0,0,0,0.04)" : "none",
          cursor: "pointer",
        }}
      >
        <i
          className={"block w-1.5 h-1.5 rounded-full" + (active && m === "live" ? " pulse-dot" : "")}
          style={{ background: active ? accent : "var(--ink-faint)" }}
        />
        <span className="flex flex-col items-start leading-tight">
          <span className="mono text-[10.5px] uppercase tracking-[0.12em] font-semibold" style={{ color: active ? "var(--ink)" : "var(--ink-faint)" }}>
            {label}
          </span>
          <span className="mono text-[8.5px] uppercase tracking-[0.12em]" style={{ color: "var(--ink-faint)" }}>{sub}</span>
        </span>
      </button>
    );
  };
  return (
    <div className="sticky top-0 z-30 hairline-b" style={{ background: "var(--paper-2)", backdropFilter: "blur(6px)" }}>
      <div className="max-w-[1100px] mx-auto px-6 md:px-8 py-2 flex items-center gap-3 flex-wrap">
        <span className="mono text-[9.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>View</span>
        <div className="inline-flex items-center gap-0.5 rounded-[4px] p-0.5" style={{ background: "var(--paper-sunken)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
          <Btn m="verified" label="Verified run" sub="cached anchor" accent="var(--emerald)" />
          <Btn m="live" label="Live testnet sandbox" sub="real run" accent="var(--blue)" />
        </div>
        <span className="text-[11.5px] leading-snug hidden md:inline max-w-[440px]" style={{ color: "var(--ink-mute)" }}>
          {mode === "verified"
            ? "A real end-to-end run, frozen from captured Hedera artifacts — replays instantly."
            : "Calls the live LLM and Hedera testnet, streaming each Agent Kit call as it runs."}
        </span>
      </div>
    </div>
  );
}

/** A small inline loading spinner for the live run. */
export function Spinner({ size = 13, color = "var(--blue)" }: { size?: number; color?: string }) {
  return (
    <span
      className="anim-spin inline-block rounded-full align-[-2px]"
      style={{ width: size, height: size, border: "2px solid var(--keyline-2)", borderTopColor: color }}
    />
  );
}

/** A calm one-idea aside under the artifact. Used sparingly — workflow first. */
export function Annotation({ ann }: { ann: Ann }) {
  return (
    <div
      className="rounded-[4px] px-4 py-3 mt-4 flex flex-col gap-1"
      style={{ background: "var(--paper-2)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}
    >
      <span className="mono text-[9.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--emerald)" }}>
        {ann.tag}
      </span>
      <span className="text-[12.5px] leading-[1.55]" style={{ color: "var(--ink-2)" }}>
        {ann.body}
      </span>
    </div>
  );
}

/** A clickable on-chain proof chip — same affordance as the settlement receipt's
 * HashScan links, so "real, verifiable" reads consistently across the app. */
export function ProofLink({ label, id, sub, href }: { label: string; id: string; sub?: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="hashscan-link rounded-[3px] px-3 py-2.5 flex flex-col gap-1 group"
      style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.14em] mono font-semibold" style={{ color: "var(--emerald)" }}>
          {label}
        </span>
        <span style={{ color: "var(--ink-faint)" }}>
          <ExternalIcon size={11} />
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="mono text-[11.5px] truncate" style={{ color: "var(--ink)" }}>
          {id}
        </span>
        {sub && (
          <span className="mono text-[9.5px] uppercase tracking-[0.16em]" style={{ color: "var(--ink-faint)" }}>
            {sub}
          </span>
        )}
      </div>
    </a>
  );
}

/** The teaching frame around one scene's artifact: step label + warm heading + one or
 * two plain sentences, then the artifact, then an optional aside. `key`ed on phase by
 * the parent so each scene reveals smoothly. */
export function SceneFrame({
  copy,
  stepIndex,
  stepCount,
  children,
}: {
  copy: SceneCopy;
  stepIndex: number;
  stepCount: number;
  children: ReactNode;
}) {
  return (
    <section className="max-w-[1100px] w-full mx-auto px-6 md:px-8 pt-3 pb-10 anim-reveal">
      <div className="flex items-baseline gap-3 mb-2.5">
        <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--emerald)" }}>
          {copy.stepLabel}
        </span>
        <span className="mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>
          Step {stepIndex + 1} of {stepCount}
        </span>
      </div>
      <h2 className="text-[20px] md:text-[23px] font-semibold tracking-[-0.015em] leading-[1.2] max-w-[820px]">
        {copy.heading}
      </h2>
      <p className="text-[14.5px] leading-[1.6] mt-2.5 max-w-[680px]" style={{ color: "var(--ink-mute)" }}>
        {copy.plain}
      </p>
      <div className="mt-5">{children}</div>
      {copy.annotation && <Annotation ann={copy.annotation} />}
    </section>
  );
}

export function LegalDisclaimer() {
  return (
    <aside className="max-w-[1100px] mx-auto px-6 md:px-8 pb-24 md:pb-20">
      <div
        className="rounded-[4px] px-4 py-3 text-[11.5px] leading-[1.55]"
        style={{ background: "var(--paper-2)", color: "var(--ink-faint)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}
      >
        <span className="mono uppercase tracking-[0.14em] font-medium" style={{ color: "var(--ink-mute)" }}>
          Disclaimer:
        </span>{" "}
        This application is a technical prototype built solely for hackathon demonstration purposes. All brand names,
        logos, and storefront images are utilized as functional placeholders to test computer vision capabilities.
        This project has no official affiliation with, endorsement from, or partnership with these brands.
      </div>
    </aside>
  );
}
