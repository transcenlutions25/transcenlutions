import { InfoPage } from "../../components/info-page";

export default function SupportPage() {
  return (
    <InfoPage
      eyebrow="Transcenlutions Support"
      title="Support"
      intro="Support should give buyers and users a clear route for help without pretending every external inbox is configured yet."
      sections={[
        {
          heading: "Primary support route",
          body: "The intended support inbox is support@transcenlutions.com. It must be created and verified before public launch.",
        },
        {
          heading: "Billing questions",
          body: "Payment, invoice, and receipt questions should route to a configured billing inbox before any live payment handoff is used.",
        },
        {
          heading: "What to include",
          body: "Support requests should include the buyer name, best contact email, offer purchased if any, issue summary, and the desired resolution.",
        },
        {
          heading: "Review status",
          body: "This starter support page must be reviewed and connected to a real inbox before public launch.",
        },
      ]}
    />
  );
}
