import type { Metadata } from "next";
import { A, LegalPage, P, Ph, Ul } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Legal contact | JIDO" };

export default function LegalContact() {
  return (
    <LegalPage
      href="/legal-contact"
      label="LEGAL CONTACT"
      intro={<p>How to reach us about privacy, your information, or anything legal.</p>}
      sections={[
        {
          id: "what-you-can-ask",
          heading: "What you can contact us about",
          body: (
            <Ul
              items={[
                "Privacy questions.",
                "A copy of the information we hold about you (access request).",
                "Fixing information that is wrong (correction request).",
                "Deleting your information, where that applies (deletion request).",
                "General legal questions.",
              ]}
            />
          ),
        },
        {
          id: "how-to-reach-us",
          heading: "How to reach us",
          body: (
            <Ul
              items={[
                <>Legal business name: <Ph k="businessName" /></>,
                <>Mailing address: <Ph k="mailingAddress" /></>,
                <>Privacy and data requests: <Ph k="privacyEmail" /></>,
                <>General questions: <Ph k="generalEmail" /></>,
              ]}
            />
          ),
        },
        {
          id: "what-to-include",
          heading: "What to include",
          body: (
            <>
              <Ul
                items={[
                  "What you are asking for (for example access, correction or deletion).",
                  "The name and email address or phone number you used.",
                  "If you talked to an AI receptionist, the business you contacted and roughly when.",
                ]}
              />
              <P>Please do not send sensitive information, such as medical details, ID numbers or card numbers, with your request.</P>
            </>
          ),
        },
        {
          id: "what-happens-next",
          heading: "What happens next",
          body: (
            <>
              <P>
                We may need to confirm your identity before we act on a request. If we hold your information on behalf of a business you contacted,
                we may pass your request to that business, because it decides how its customers&apos; information is used.
              </P>
              <P>
                Some copies held by our service providers may not be removed right away. See <A href="/privacy#your-rights">Your choices and requests</A>{" "}
                in our Privacy policy.
              </P>
            </>
          ),
        },
      ]}
    />
  );
}
