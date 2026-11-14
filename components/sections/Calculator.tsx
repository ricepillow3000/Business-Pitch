"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { Label } from "./Label";

function Slider({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block border-t border-signal/25 py-6">
      <div className="flex items-baseline justify-between">
        <span className="font-label text-signal">{label}</span>
        <span className="font-mono text-2xl tabular-nums text-beige">
          {unit === "$" ? `$${value}` : value}
          {unit !== "$" && <span className="ml-1 text-sm text-signal">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-4 h-6 w-full appearance-none bg-transparent [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-beige [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-beige"
        style={{ background: `linear-gradient(to right, #f5f5dc ${pct}%, rgba(110,155,240,.25) ${pct}%) center / 100% 2px no-repeat` }}
      />
    </label>
  );
}

/** 04 — Interactive cost-of-busywork calculator (high-intent conversion point). */
export function Calculator() {
  const [staff, setStaff] = useState(4);
  const [hours, setHours] = useState(8);
  const [rate, setRate] = useState(25);
  const [share, setShare] = useState(50);
  const out = useRef<HTMLSpanElement>(null);
  const back = useRef<HTMLSpanElement>(null);
  const shown = useRef({ a: 0, b: 0 });

  const annual = staff * hours * rate * 52;
  const reclaim = Math.round(annual * (share / 100));

  useEffect(() => {
    gsap.to(shown.current, {
      a: annual,
      b: reclaim,
      duration: 0.8,
      ease: "expo.out",
      onUpdate: () => {
        if (out.current) out.current.textContent = Math.round(shown.current.a).toLocaleString("en-US");
        if (back.current) back.current.textContent = Math.round(shown.current.b).toLocaleString("en-US");
      },
    });
  }, [annual, reclaim]);

  return (
    <section id="calculator" data-section="04 // Cost" className="relative py-[18vh]">
      <div className="poster-grid gap-y-12">
        <div className="col-span-12">
          <Label n="04" meta="ESTIMATE · YOUR NUMBERS">Price your busywork</Label>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <h2 data-split className="mb-10 font-poster text-h2 text-signal">
            What is repetitive work <span className="text-beige">costing you?</span>
          </h2>
          <Slider label="Staff doing admin" value={staff} min={1} max={40} unit="people" onChange={setStaff} />
          <Slider label="Repetitive hours / week each" value={hours} min={1} max={30} unit="hrs" onChange={setHours} />
          <Slider label="Hourly cost" value={rate} min={15} max={120} unit="$" onChange={setRate} />
          <Slider label="Share handed to agents" value={share} min={10} max={90} step={5} unit="%" onChange={setShare} />
        </div>

        <div className="col-span-12 flex flex-col justify-end lg:col-span-6 lg:col-start-7">
          <div data-mask="left" className="chamfer bg-beige p-7 text-flag md:p-10">
            <p className="font-label">Repetitive work / year</p>
            <p className="mt-3 font-poster text-[clamp(3rem,7.5vw,8rem)] leading-[0.85] tabular-nums">
              $<span ref={out}>0</span>
            </p>
            <div className="my-8 h-px bg-flag/25" />
            <p className="font-label">Back in your pocket at {share}%</p>
            <p className="mt-3 font-poster text-[clamp(2rem,4.5vw,4.5rem)] leading-[0.9] tabular-nums">
              $<span ref={back}>0</span>
            </p>
            <p className="mt-6 max-w-[48ch] font-body text-sm text-flag/75">
              A rough estimate from your inputs ({staff} × {hours} hrs × ${rate} × 52 weeks). We&rsquo;ll pin down the real number on the audit call.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
