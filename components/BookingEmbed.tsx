"use client";

import { Arrow } from "@/components/Arrow";
import { useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Accepts what Google gives you, either form:
 *  - the inline "Website embed" code (<iframe src="https://calendar.google.com/calendar/appointments/schedules/…?gv=true" …>)
 *  - or just that src address.
 * Returns the address the iframe should load (with gv=true, Google's embed view).
 */
export function bookingSrc(raw: string) {
  const url = (raw.match(/src="([^"]+)"/)?.[1] ?? raw).trim().replace(/&amp;/g, "&");
  return url.includes("gv=true") ? url : `${url}${url.includes("?") ? "&" : "?"}gv=true`;
}

/**
 * The booking calendar: a week (Mon to Sun) of open times, straight from the owner's
 * Google Calendar appointment schedule. Opening hours, busy times and days off are all
 * set inside Google Calendar; visitors pick an open time and book it right here (Google
 * sends the confirmation). No email app, no new tab.
 *
 * Three states, all in the same HUD frame so the page never jumps:
 *  - soon     : no booking link yet. The week (days off hatched), saying online booking opens soon.
 *  - consent  : link set. One click shows the live calendar (nothing is loaded from Google
 *               before that, as the Privacy policy promises).
 *  - calendar : Google's live booking calendar inside the frame.
 */
export function BookingEmbed({ url, daysOff = [] }: { url: string | null; daysOff?: string[] }) {
  const [show, setShow] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const mode = !url ? "soon" : show ? "calendar" : "consent";

  return (
    <div className="space-y-4">
      {/* once the live calendar is showing, this whole area (plus a 2rem margin, so even a fast mouse
          is caught before it reaches Google's calendar) keeps the normal mouse pointer */}
      <div data-native-cursor={mode === "calendar" || undefined} className={mode === "calendar" ? "-m-8 p-8" : ""}>
      <div data-booking={mode} className="relative border border-slate-line">
        {/* viewfinder corners, the same shape as the cursor */}
        {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "right-0 bottom-0 border-r-2 border-b-2"].map((c) => (
          <span key={c} aria-hidden className={`pointer-events-none absolute z-10 -m-px h-3 w-3 border-beige ${c}`} />
        ))}

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-slate-line px-5 py-3 font-label">
          <p className="text-beige">// Available times</p>
          <p className="text-flag">
            Google Calendar
            {mode !== "calendar" && daysOff.length > 0 && (
              <>
                {" · "}
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="hatch inline-block h-3 w-3 border border-slate-line" />
                  Unavailable
                </span>
              </>
            )}
          </p>
        </div>

        {mode === "calendar" ? (
          <div className="relative h-[min(46rem,80svh)] min-h-[34rem] bg-beige">
            {!loaded && <p className="absolute inset-0 grid place-items-center font-label text-flag-deep">Loading the calendar…</p>}
            <iframe
              src={bookingSrc(url!)}
              title="Book a discovery call: available times (Google Calendar)"
              onLoad={() => setLoaded(true)}
              className="relative h-full w-full border-0"
            />
          </div>
        ) : (
          <div className="relative">
            {/* the week: days off hatched, open days left clear. Never made-up times: the exact
                open slots only come from Google Calendar once it is shown. */}
            <div className="grid grid-cols-7">
              {DAYS.map((d) => {
                const off = daysOff.includes(d);
                return (
                  <span key={d} data-day={d} data-off={off || undefined} className={`border-b border-l border-slate-line py-2.5 text-center font-label first:border-l-0 ${off ? "text-flag line-through" : "text-beige"}`}>
                    {d}
                    <span className="sr-only">{off ? ", unavailable" : ", open"}</span>
                  </span>
                );
              })}
              {Array.from({ length: 42 }, (_, i) => (
                <span key={i} aria-hidden className={`h-12 border-l border-slate-line/60 md:h-14 ${i % 7 === 0 ? "border-l-0" : ""} ${i >= 7 ? "border-t border-t-slate-line/40" : ""} ${daysOff.includes(DAYS[i % 7]) ? "hatch" : ""}`} />
              ))}
            </div>

            <div className="absolute inset-0 grid place-items-center p-4">
              <div className="quiet max-w-[40ch] space-y-5 border border-slate-line bg-slate p-6 md:p-8">
                {mode === "soon" ? (
                  <>
                    <p className="font-label text-beige">// Online booking opens soon</p>
                    <p className="text-flag">Open times will show here, straight from our calendar, and you will book in one step.</p>
                  </>
                ) : (
                  <>
                    <p className="text-flag">
                      Open times come straight from our Google Calendar. Showing them connects your browser to Google, which may set its own cookies. See our{" "}
                      <a href="/privacy#cookies" className="prose-link text-beige">Privacy policy</a>.
                    </p>
                    <button type="button" onClick={() => setShow(true)} className="chamfer inline-flex min-h-11 items-center bg-beige px-7 py-4 font-wide text-sm text-flag-deep">
                      Show available times
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      {mode === "calendar" && (
        <a href={bookingSrc(url!).replace(/[?&]gv=true/, "")} target="_blank" rel="noopener noreferrer" className="prose-link inline-flex min-h-11 items-center font-label text-flag">
          Open the calendar in a new tab &nbsp;<Arrow />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </div>
  );
}
