import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

/**
 * Provider switch. Set LLM_PROVIDER=google to develop/verify on Gemini's free
 * tier; leave it unset (or =anthropic) for the production thesis — Sonnet 4.6
 * orchestration + Opus 4.7 multimodal adjudication (CLAUDE.md §7). Model ids are
 * overridable per-role via env so swapping is config, not code.
 */
const PROVIDER = process.env.LLM_PROVIDER ?? "anthropic";

/** Orchestrator — drives the agent tool-loop. */
export function orchestratorModel() {
  if (PROVIDER === "google") {
    return google(process.env.ORCHESTRATOR_MODEL ?? "gemini-3.1-flash-lite-preview");
  }
  return anthropic(process.env.ORCHESTRATOR_MODEL ?? "claude-sonnet-4-6");
}

/** Vision/judgement — the multimodal adjudication core. */
export function visionModel() {
  if (PROVIDER === "google") {
    return google(process.env.VISION_MODEL ?? "gemini-3.1-flash-lite-preview");
  }
  return anthropic(process.env.VISION_MODEL ?? "claude-opus-4-7");
}
