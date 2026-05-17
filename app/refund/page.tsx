import { InfoPage } from "../../components/info-page";

export default function RefundPage() {
  return (
    <InfoPage
      eyebrow="Transcenlutions Refunds"
      title="Refund Policy"
      intro="Refund expectations must be clear before a buyer is sent to checkout or invoice handoff."
      sections={[
        {
          heading: "Scope-first payments",
          body: "A buyer should see the offer scope, timeline, delivery format, and support route before payment is requested.",
        },
        {
          heading: "Refund review",
          body: "Refund requests should be reviewed against the paid scope, delivery status, buyer communication, and any agreed support terms.",
        },
        {
          heading: "No direct refunds inside Tay",
          body: "Tay does not move money, issue refunds, collect card details, or touch wallet funds inside the command room.",
        },
        {
          heading: "Review status",
          body: "This starter refund copy must be reviewed and finalized before public launch or live payments.",
        },
      ]}
    />
  );
}
