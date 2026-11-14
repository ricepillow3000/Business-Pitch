"use client";

import { AGENTS } from "@/lib/config";
import { hubLabelEls } from "@/lib/motion";

/** DOM callouts for the 5 agent hubs. Positioned every frame by Brain.tsx (3D → screen projection). */
export function HubLabels() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[6] overflow-hidden">
      {AGENTS.map((a, i) => (
        <div
          key={a.code}
          ref={(el) => {
            hubLabelEls[i] = el;
          }}
          className="absolute left-0 top-0 opacity-0 will-change-transform"
        >
          <div className="flex -translate-y-1/2 items-center gap-2 whitespace-nowrap font-label text-beige">
            <span className="inline-block h-2 w-2 border border-beige" />
            <span className="inline-block h-px w-8 bg-beige" />
            <span className="bg-flag/85 px-1.5 py-0.5">
              {a.code} · {a.name}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
