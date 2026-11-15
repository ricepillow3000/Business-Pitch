import type { Metadata } from "next";
import { BookingEmbed } from "@/components/BookingEmbed";
import { SitePage } from "@/components/SitePage";
import { pageMeta, SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  "Book a discovery call | JIDO",
  "Book a short discovery call with JIDO to talk through where your business loses time and what could run on its own.",
  "/book",
);

export default function Book() {
  return (
    <SitePage
      label="BOOK A CALL"
      title="Book a discovery call."
      intro={<p>A short call. You tell us where time goes each week; we tell you honestly what can be automated, and what cannot.</p>}
    >
      <div className="grid gap-16 md:grid-cols-12">
        <div className="md:col-span-7">
          <BookingEmbed url={SITE.bookingUrl} />
        </div>
        <div className="quiet space-y-4 md:col-span-4 md:col-start-9">
          <h2 className="font-wide text-[clamp(1.125rem,1.6vw,1.5rem)] text-beige">On the call.</h2>
          <ul className="space-y-3 text-flag">
            {["Which tasks take the most time.", "The tools you already use.", "What a first project could look like.", "Clear next steps."].map((t) => (
              <li key={t} className="relative pl-5 before:absolute before:top-[0.6em] before:left-0 before:h-1.5 before:w-1.5 before:bg-flag/70">
                {t}
              </li>
            ))}
          </ul>
          <p className="pt-4 text-flag">
            Prefer to write? <a href="/contact" className="text-beige">Send a message</a>.
          </p>
        </div>
      </div>
    </SitePage>
  );
}
