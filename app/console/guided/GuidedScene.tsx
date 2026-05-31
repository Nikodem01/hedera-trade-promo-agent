"use client";
// Presentational primitives for the guided tour. Tokens-only — reuses the existing
// design language (paper/ink/emerald, hairlines, mono labels, the timeline-dot motif,
// anim-reveal) so the tour looks native, not bolted on. No data, no business logic:
// it just frames whatever artifact a scene hands it and keeps the viewer oriented.
import type { ReactNode } from "react";
import { ExternalIcon } from "../primitives";
import type { SceneCopy, Annotation as Ann } from "./narration";

/** The persistent "you are here / what's next" map. Pure indicator (not clickable) so
 * a recording can never desync — there is one obvious way forward (Continue). */
export function JourneyRail({ labels, current }: { labels: string[]; current: number }) {
  return (
    <nav className="max-w-[1100px] mx-auto px-6 md:px-8 w-full pt-5 pb-1">
      <ol className="flex items-center gap-1.5 flex-wrap">
        {labels.map((label, i) => {
          const state = i < current ? "done" : i === current ? "current" : "upcoming";
          const dot =
            state === "current"
              ? { bg: "var(--emerald)", ring: "rgba(11,93,59,0.18)" }
              : state === "done"
                ? { bg: "var(--ink-mute)", ring: "var(--keyline-2)" }
                : { bg: "var(--paper)", ring: "var(--keyline-2)" };
          return (
            <li key={i} className="flex items-center gap-1.5">
              <span className="flex items-center gap-1.5">
                <i
                  className={"block w-2 h-2 rounded-full" + (state === "current" ? " pulse-dot" : "")}
                  style={{ background: dot.bg, boxShadow: `0 0 0 3px var(--paper), 0 0 0 4px ${dot.ring}` }}
                />
                <span
                  className="mono text-[9.5px] uppercase tracking-[0.12em] whitespace-nowrap"
                  style={{
                    color: state === "current" ? "var(--ink)" : "var(--ink-faint)",
                    fontWeight: state === "current" ? 600 : 500,
                  }}
                >
                  {label}
                </span>
              </span>
              {i < labels.length - 1 && (
                <i className="block w-5 h-px" style={{ background: "var(--keyline-2)" }} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
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

/** Sticky bottom controls — the single obvious way forward. Mirrors the old composer's
 * placement so the page rhythm is unchanged. Continue becomes Replay on the last scene. */
export function TourFooter({
  stepIndex,
  stepCount,
  onBack,
  onContinue,
  onRestart,
}: {
  stepIndex: number;
  stepCount: number;
  onBack: () => void;
  onContinue: () => void;
  onRestart: () => void;
}) {
  const isLast = stepIndex >= stepCount - 1;
  const isFirst = stepIndex <= 0;
  return (
    <div className="hairline-t sticky bottom-0 z-10" style={{ background: "var(--paper-2)" }}>
      <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          disabled={isFirst}
          className="mono text-[11px] uppercase tracking-[0.14em] font-medium px-3.5 py-2.5 rounded-[3px]"
          style={{
            background: "transparent",
            color: isFirst ? "var(--ink-faint)" : "var(--ink-mute)",
            boxShadow: "inset 0 0 0 1px var(--keyline-2)",
            cursor: isFirst ? "not-allowed" : "pointer",
            opacity: isFirst ? 0.5 : 1,
          }}
        >
          ← Back
        </button>

        <div className="flex-1 flex items-center gap-2.5">
          <div className="flex-1 h-[5px] rounded-full overflow-hidden max-w-[320px]" style={{ background: "var(--paper-sunken)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${((stepIndex + 1) / stepCount) * 100}%`, background: "var(--emerald)", transition: "width .35s cubic-bezier(.2,.7,.2,1)" }}
            />
          </div>
          <span className="mono text-[10px] uppercase tracking-[0.14em] hidden sm:inline" style={{ color: "var(--ink-faint)" }}>
            {stepIndex + 1} / {stepCount}
          </span>
        </div>

        {isLast ? (
          <button
            onClick={onRestart}
            className="mono text-[11px] uppercase tracking-[0.14em] font-semibold px-4 py-2.5 rounded-[3px]"
            style={{ background: "var(--ink)", color: "var(--paper)", cursor: "pointer" }}
          >
            ↺ Replay
          </button>
        ) : (
          <button
            onClick={onContinue}
            className="btn-primary mono text-[11px] uppercase tracking-[0.14em] font-semibold px-5 py-2.5 rounded-[3px] inline-flex items-center gap-2"
            style={{ background: "var(--emerald)", color: "white", boxShadow: "0 6px 18px rgba(11,93,59,0.18), inset 0 -1px 0 rgba(0,0,0,0.18)", cursor: "pointer" }}
          >
            Continue
            <span style={{ opacity: 0.85 }}>→</span>
          </button>
        )}
      </div>
    </div>
  );
}
