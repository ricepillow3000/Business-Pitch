import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import { A, LegalPage, Note, P, Ul } from "@/components/LegalPage";

export const metadata: Metadata = pageMeta(
  "AI disclosure | JIDO",
  "How JIDO uses AI, what it can and cannot do, and when a person takes over. Draft pending legal review.",
  "/ai-disclosure",
);

export default function AiDisclosure() {
  return (
    <LegalPage
      href="/ai-disclosure"
      label="AI DISCLOSURE"
      intro={<p>Businesses use our AI receptionist to answer questions and book appointments on their websites. Here is what that means for you, in plain words.</p>}
      sections={[
        {
          id: "you-may-be-talking-to-ai",
          heading: "You may be talking to an AI",
          body: (
            <P>
              The front desk assistant on a business&apos;s website may be an AI assistant, not a person. If you are not sure, ask it. It is set up
              to tell you that it is an AI.
            </P>
          ),
        },
        {
          id: "what-it-collects",
          heading: "What it may collect",
          body: (
            <>
              <P>To answer you and book an appointment, the assistant may ask for:</P>
              <Ul items={["Your name.", "Your email address.", "Your phone number (optional).", "Why you are getting in touch.", "Which day and time suit you."]} />
              <P>
                This information goes to the business you contacted. Read more in our <A href="/privacy">Privacy policy</A>.
              </P>
            </>
          ),
        },
        {
          id: "mistakes",
          heading: "It can make mistakes",
          body: (
            <P>
              AI replies can be wrong or incomplete. Treat them as helpful information, not as a promise from the business. Appointment times
              come from the business&apos;s calendar, and nothing is booked until you confirm a specific time.
            </P>
          ),
        },
        {
          id: "ask-for-a-person",
          heading: "You can ask for a person",
          body: <P>Ask for a person at any time. The assistant will pass your request to the business, and a team member will follow up.</P>,
        },
        {
          id: "not-advice",
          heading: "Not professional advice",
          body: (
            <P>
              The assistant does not give medical, legal or financial advice, and it cannot help in an emergency. If you need urgent help, call
              your local emergency number.
            </P>
          ),
        },
        {
          id: "sensitive",
          heading: "Please keep sensitive information out",
          body: (
            <>
              <P>Do not share sensitive information in the chat unless the business has told you the service is specifically set up and authorised to handle it.</P>
              <Note label="Do not share in the chat">
                <Ul
                  items={[
                    "Medical history, diagnoses or treatment details.",
                    "Insurance information.",
                    "Social Security numbers.",
                    "Payment card information.",
                    "Passwords or login codes.",
                  ]}
                />
              </Note>
              <P>
                Our current setup is a demonstration with a fictional dental office. It is not HIPAA compliant and is not approved for protected
                health information. Using it with a real healthcare provider would first need a separate compliance assessment and, where
                applicable, Business Associate Agreements.
              </P>
            </>
          ),
        },
      ]}
    />
  );
}
