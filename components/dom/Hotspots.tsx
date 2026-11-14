"use client";

import { INFO } from "@/lib/config";
import { hotspotEls, motion } from "@/lib/motion";
import { useStore, type PanelId } from "@/lib/store";

/**
 * "THIS IS CLICKABLE" — two real <button>s pinned to the orb and the storm.
 * MoonScene projects their 3D anchors to the screen every frame and writes the
 * transform/opacity/visibility directly (no React re-render). Pulsing ring + label,
 * keyboard-focusable, work on touch; hovering/focusing one also lights up the object.
 */
export function Hotspots() {
  const openPanel = useStore((s) => s.openPanel);
  const item = (id: PanelId, side: "right" | "left") => {
    const info = INFO[id];
    return (
      <button
        key={id}
        type="button"
        ref={(el) => {
          hotspotEls[id] = el;
        }}
        data-hotspot={id}
        data-cursor-label="OPEN"
        aria-label={`Open ${info.title}`}
        aria-haspopup="dialog"
        onClick={() => openPanel(id)}
        onPointerEnter={() => (motion.hover = id)}
        onPointerLeave={() => motion.hover === id && (motion.hover = "none")}
        onFocus={() => (motion.hover = id)}
        onBlur={() => motion.hover === id && (motion.hover = "none")}
        className="hotspot group pointer-events-auto invisible absolute left-0 top-0 opacity-0 outline-none will-change-transform"
      >
        <span className={`flex -translate-y-1/2 items-center gap-2.5 ${side === "left" ? "-translate-x-[calc(100%-11px)] flex-row-reverse" : "-translate-x-[11px]"}`}>
          {/* pulsing target */}
          <span className="relative grid h-[22px] w-[22px] shrink-0 place-items-center">
            <span className="hotspot-ring absolute inset-0 rounded-full border border-beige/80" />
            <span className="h-[7px] w-[7px] rounded-full bg-beige shadow-[0_0_10px_#f5f5dc] transition-transform duration-300 group-hover:scale-150 group-focus-visible:scale-150" />
          </span>
          <span className="h-px w-8 bg-beige/60 transition-all duration-300 group-hover:w-12 group-focus-visible:w-12" />
          <span className="whitespace-nowrap border border-beige/25 bg-void/70 px-2 py-1 font-label text-beige backdrop-blur-sm transition-colors duration-300 group-hover:bg-beige group-hover:text-flag group-focus-visible:bg-beige group-focus-visible:text-flag">
            ◉ {info.hotspot} <span className="text-signal group-hover:text-flag group-focus-visible:text-flag">· Click</span>
          </span>
        </span>
      </button>
    );
  };
  return (
    <div data-chrome className="pointer-events-none fixed inset-0 z-[20] overflow-hidden">
      {item("core", "right")}
      {item("engine", "left")}
    </div>
  );
}
