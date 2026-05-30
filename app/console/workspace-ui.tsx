// Shared chrome for the workspace views: a section intro and an operator-gated notice.
export function WorkspaceIntro({ title, body }: { title: string; body: string }) {
  return (
    <section className="max-w-[1100px] w-full mx-auto px-6 md:px-8 pt-5 pb-1">
      <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{title}</h2>
      <p className="text-[12.5px] leading-snug mt-1 max-w-[660px]" style={{ color: "var(--ink-mute)" }}>{body}</p>
    </section>
  );
}

export function OperatorOnly({ feature }: { feature: string }) {
  return (
    <section className="max-w-[1100px] w-full mx-auto px-6 md:px-8 pt-2 pb-4">
      <div className="rounded-[5px] px-5 py-4 mono text-[10.5px] uppercase tracking-[0.12em]" style={{ color: "var(--ink-mute)", background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
        {feature} · operator access required
      </div>
    </section>
  );
}
