/** Marathon-style section index: [01] ── TITLE ── meta */
export function Label({ n, children, meta, tone = "signal" }: { n: string; children: React.ReactNode; meta?: string; tone?: "signal" | "flag" }) {
  const c = tone === "signal" ? "text-signal" : "text-flag";
  const line = tone === "signal" ? "bg-signal/40" : "bg-flag/40";
  return (
    <div className={`flex items-center gap-3 font-label ${c}`}>
      <span>[{n}]</span>
      <span className={`h-px w-10 ${line}`} />
      <span>{children}</span>
      {meta && <span className={`ml-auto hidden opacity-70 md:inline`}>{meta}</span>}
    </div>
  );
}
