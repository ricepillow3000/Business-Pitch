import type { Metadata } from "next";
import { LegalPage, Mail } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy policy | JIDO" };

export default function Privacy() {
  return (
    <LegalPage
      label="PRIVACY"
      title="Privacy policy."
      updated="November 15, 2026"
      sections={[
        {
          heading: "The short version",
          body: [
            "This website does not use cookies, analytics or tracking tools, and it has no forms. We only receive information about you if you choose to email us.",
          ],
        },
        {
          heading: "What we collect",
          body: [
            "If you email us, we receive your email address, your name if your email shows it, and whatever you write in your message.",
            "If you use the Gmail option on this site, your email is sent through Google, which handles it under its own privacy policy.",
          ],
        },
        {
          heading: "What your browser keeps",
          body: [
            "To make the intro shorter on your next visit, this site saves one small note (named jido:intro) in your browser's session storage. It stays on your device, is never sent to us, and is cleared when you close the tab.",
            "Fonts are served from this website itself, not from a third party.",
          ],
        },
        {
          heading: "Hosting",
          body: [
            "The company that hosts this website may keep standard technical logs, such as IP address, browser type and the time of a visit, to keep the site secure and working. We do not use these logs to identify you.",
          ],
        },
        {
          heading: "How we use it",
          body: [
            "We use what you send us only to reply to you and to discuss work you ask us about. We do not sell, rent or share your information for advertising.",
          ],
        },
        {
          heading: "Keeping and deleting it",
          body: [
            "We keep emails while we are talking with you or working for you, and afterwards only as long as the law requires.",
            <>To see, correct or delete what we have about you, email <Mail /> and we will take care of it.</>,
          ],
        },
        {
          heading: "Children",
          body: ["This website is meant for businesses. It is not directed at children under 13, and we do not knowingly collect their information."],
        },
        {
          heading: "Changes",
          body: ["If we change this policy, we will update the date at the top of this page."],
        },
        {
          heading: "Contact",
          body: [<>Questions about privacy: <Mail /></>],
        },
      ]}
    />
  );
}
