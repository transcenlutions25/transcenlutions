import { InfoPage } from "../../components/info-page";

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Transcenlutions Privacy"
      title="Privacy Policy"
      intro="Transcenlutions should only collect information that helps Tay provide a clear, visible, governed experience."
      sections={[
        {
          heading: "Information we expect to collect",
          body: "The platform may use contact details, user requests, buyer context, support messages, payment handoff metadata, and visible session activity needed to operate the service.",
        },
        {
          heading: "How information is used",
          body: "Information should be used to provide Tay command-room features, support buyer delivery, improve workflows, keep records visible, and protect the operator from unsafe or unclear actions.",
        },
        {
          heading: "Payment information",
          body: "Transcenlutions does not collect or store card numbers inside Tay. Payments must route through approved external payment providers or invoice handoff.",
        },
        {
          heading: "Review status",
          body: "This starter privacy copy must be reviewed and finalized before public launch.",
        },
      ]}
    />
  );
}
