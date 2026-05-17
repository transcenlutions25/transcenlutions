import { InfoPage } from "../../components/info-page";

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Transcenlutions Terms"
      title="Terms of Service"
      intro="These starter terms describe the operating boundaries for using Tay and Transcenlutions services."
      sections={[
        {
          heading: "Use of Tay",
          body: "Tay helps users clarify ideas, plan work, prepare offers, route launch setup, and log visible actions. The user remains responsible for decisions, approvals, and real-world execution.",
        },
        {
          heading: "No guaranteed outcomes",
          body: "Transcenlutions can support planning, delivery, and execution, but does not guarantee income, business results, relationship results, audience growth, or platform success.",
        },
        {
          heading: "Approvals and external services",
          body: "Payment handoff, sent communication, outside services, publishing, automation, and destructive actions require explicit approval or are blocked by governance.",
        },
        {
          heading: "Review status",
          body: "These starter terms must be reviewed and finalized before public launch or live payments.",
        },
      ]}
    />
  );
}
