import type { Metadata } from "next";
import { NextSteps, SitePage } from "@/components/SitePage";
import { pageMeta, SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  "Pricing | JIDO",
  "Setup from $399 and plans from $199 a month. Scope, usage limits, support, fees and cancellation are agreed in writing first.",
  "/pricing",
);

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export default function Pricing() {
  const { setupFrom, monthlyFrom } = SITE.prices;
  return (
    <SitePage
      label="PRICING"
      title="Clear prices, agreed in writing."
      intro={
        <p>
          Setup from {usd(setupFrom)}. Plans from {usd(monthlyFrom)} a month. Every project starts with a discovery call.
        </p>
      }
    >
      <div className="grid gap-16 md:grid-cols-12">
        <div className="quiet space-y-5 md:col-span-6">
          <h2 className="font-wide text-[clamp(1.25rem,2vw,1.75rem)] text-beige">What sets the price.</h2>
          <p className="max-w-[52ch] text-flag">
            A single automation or a website chatbot sits at the lower end. Lead qualification, scheduling and integrations cost more. Voice
            agents and custom systems are quoted after discovery.
          </p>
          <p className="max-w-[52ch] text-flag">Setup covers building and testing. The monthly plan covers running, monitoring and support.</p>
        </div>
        <div className="quiet space-y-5 md:col-span-5 md:col-start-8">
          <h2 className="font-wide text-[clamp(1.25rem,2vw,1.75rem)] text-beige">Agreed before we start.</h2>
          <ul className="space-y-3 text-flag">
            {[
              "Exactly what is included.",
              "Monthly usage limits, and what happens above them.",
              "Support: how to reach us and how fast we reply.",
              "Third-party fees, such as AI and software accounts, and who pays them.",
              "Who owns what: your data and accounts stay yours.",
              "How to cancel.",
            ].map((t) => (
              <li key={t} className="relative pl-5 before:absolute before:top-[0.6em] before:left-0 before:h-1.5 before:w-1.5 before:bg-flag/70">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="quiet mt-16 max-w-[52ch] text-sm leading-relaxed text-flag">
        Prices shown are starting points, not an offer. The final scope and price are set out in a written agreement. We do not promise specific
        results.
      </p>
      <NextSteps />
    </SitePage>
  );
}
