import type { Metadata } from "next";
import { LegalPage, Mail } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of service | JIDO" };

export default function Terms() {
  return (
    <LegalPage
      label="TERMS"
      title="Terms of service."
      updated="November 15, 2026"
      sections={[
        {
          heading: "Using this website",
          body: ["By using this website you agree to these terms. If you do not agree, please do not use the site."],
        },
        {
          heading: "Information only",
          body: [
            "Everything on this website is general information about our services. It is not a promise of specific results, and it is not legal, tax or financial advice.",
          ],
        },
        {
          heading: "Our work together",
          body: [
            "Any automation work we do for you is covered by a separate written agreement, such as a proposal or contract, that sets out the scope, price and timing. If that agreement and these terms disagree, the agreement wins.",
          ],
        },
        {
          heading: "Content and brand",
          body: [
            "The JIDO name, logo, text, graphics and code on this website belong to JIDO. You may view and share our pages, but you may not copy or reuse them for another business without our permission.",
          ],
        },
        {
          heading: "Other websites",
          body: [
            "Some links, like the Gmail option, take you to services run by other companies. We do not control them, and their own terms and privacy policies apply.",
          ],
        },
        {
          heading: "No warranty",
          body: ['We work to keep this website accurate and available, but it is provided "as is", without warranties of any kind.'],
        },
        {
          heading: "Limit of liability",
          body: [
            "To the fullest extent the law allows, JIDO is not liable for any indirect or consequential loss that comes from using this website.",
          ],
        },
        {
          heading: "Changes",
          body: ["We may update these terms. The date at the top of this page shows the latest version."],
        },
        {
          heading: "Contact",
          body: [<>Questions about these terms: <Mail /></>],
        },
      ]}
    />
  );
}
