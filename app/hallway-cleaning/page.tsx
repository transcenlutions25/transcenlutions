import Link from "next/link";
import HallwayProcedures from "../../components/hallway-procedures";
import "./hallway.css";

export const metadata = {
  title: "Hallway Cleaning | Tay by Transcenlutions",
  description: "Hallway Cleaning operating procedures and integration status inside Tay.",
};

const readiness = [
  ["Operating procedures", "Available for review", "Read the versioned service checklists, required evidence and responsible roles below. Owner review remains pending."],
  ["Customer intake", "Separate customer site", "Use the public Hallway Cleaning site for customer-facing information. Its deployment and intake delivery are not verified by this workspace."],
  ["Existing Tay records", "Hallway connector not connected", "Reuse Tay’s existing customer, delivery and task records together with the existing Hallway Leads database; do not create a replacement CRM or duplicate jobs and vendor storage. Schema mapping and authorized connectors are still needed before this page can read those records."],
  ["Scheduling and completion", "Not connected", "No reservation, assignment or checklist submission is created here. Recorded scope, capacity and reviewed completion evidence must come from the operational system."],
  ["Outreach and payments", "Inactive", "No messages, invoices, charges, transfers or vendor payouts are executed by this page."],
] as const;

export default function HallwayWorkspace() {
  return (
    <main className="hallway-workspace">
      <div className="hallway-content">
        <Link href="/" className="hallway-back">← Back to Tay Command</Link>
        <header>
          <p className="hallway-kicker">Transcenlutions · Business workspace</p>
          <h1>Hallway Cleaning</h1>
          <p>Professional cleaning operations, service standards and coordination inside Tay. Hallway Cleaning is a professional cleaning company, not a hallway-only service. The procedures below are review material, not a claim that every listed service is currently offered or bookable on the customer site.</p>
          <a className="hallway-site" href="https://hallwaycleaning.com" target="_blank" rel="noopener noreferrer">Open the public customer site ↗</a>
        </header>
        <section aria-labelledby="hallway-status-heading">
          <h2 id="hallway-status-heading">What is available here</h2>
          <p className="hallway-boundary">This is a procedure-reference workspace, not a connected private operator dashboard. Do not enter customer records into Tay chat. Reading a procedure does not approve a job, grant access or authorize a payment.</p>
          <div className="hallway-readiness">
            {readiness.map(([title, status, detail]) => <article key={title}><h3>{title}</h3><strong>{status}</strong><p>{detail}</p></article>)}
          </div>
        </section>
        <HallwayProcedures />
      </div>
    </main>
  );
}
