"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Mark } from "./Logo";

const INPUTS = ["Calls", "Email", "Forms"];
const OUTPUTS = ["Invoicing", "Scheduling", "CRM"];
const X = [100, 300, 500];

// cubic connectors into the top of the hub, and out of its bottom
const inWire = (x: number) => `M${x} 62 C${x} 150 300 140 300 218`;
const outWire = (x: number) => `M300 302 C300 380 ${x} 370 ${x} 458`;
const WIRES = [...X.map(inWire), ...X.map(outWire)];

function Node({ x, y, label, below }: { x: number; y: number; label: string; below?: boolean }) {
  return (
    <g data-node style={{ transformOrigin: `${x}px ${y}px` }}>
      <rect x={x - 6} y={y - 6} width="12" height="12" className="fill-slate stroke-flag" />
      <text x={x} y={below ? y + 34 : y - 22} textAnchor="middle" className="fill-flag font-mono text-[15px] tracking-[0.04em]">
        {label}
      </text>
    </g>
  );
}

/**
 * Abstract automation map: three inputs feed one system, which fans out to
 * three workflows. Wires draw on when scrolled into view; Flag Blue packets
 * then circulate forever (pure CSS, see .packet in globals.css).
 */
export function WorkflowGraph() {
  const root = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top 75%" } });
      tl.from("[data-node]", { scale: 0, duration: 0.9, stagger: 0.06 })
        .from("[data-hub]", { scale: 0, duration: 1.2 }, 0.1)
        .fromTo("[data-wire]", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: "expo.inOut", stagger: 0.07 }, 0.2)
        .from(".packet", { autoAlpha: 0, duration: 0.6 }, "-=0.4");
    },
    { scope: root },
  );

  return (
    <svg ref={root} viewBox="0 0 600 520" className="h-auto w-full overflow-visible" role="img" aria-label="Calls, email and forms flow into JIDO, which runs invoicing, scheduling and CRM workflows.">
      {WIRES.map((d, i) => (
        <g key={d} fill="none" className="stroke-flag">
          <path data-wire d={d} pathLength={1} strokeDasharray="1" strokeOpacity="0.45" />
          <path
            d={d}
            pathLength={1}
            strokeWidth="2.5"
            strokeLinecap="square"
            className="packet"
            style={{ "--d": `${2.2 + (i % 3) * 0.4}s`, "--delay": `${i < 3 ? -i * 0.7 : 1.1 - i * 0.5}s` } as React.CSSProperties}
          />
        </g>
      ))}

      {INPUTS.map((label, i) => <Node key={label} x={X[i]} y={56} label={label} />)}
      {OUTPUTS.map((label, i) => <Node key={label} x={X[i]} y={464} label={label} below />)}

      <g data-hub style={{ transformOrigin: "300px 260px" }}>
        <circle cx="300" cy="260" r="66" fill="none" className="origin-center animate-[spin_24s_linear_infinite] stroke-flag/60 [transform-box:fill-box]" strokeDasharray="2 8" />
        <rect x="258" y="218" width="84" height="84" className="fill-slate stroke-flag" />
        <Mark x={276} y={236} width={48} height={48} className="text-beige" />
      </g>
    </svg>
  );
}
