import Link from "next/link";

const sbdcSignupUrl = "https://scsbdc.ecenterdirect.com/signup?centerid=3";

const readinessItems = [
  "Register with the South Carolina SBDC so an SSBCI consultant can schedule the initial meeting.",
  "Prepare a Personal Financial Statement and current personal credit report for loan-readiness review.",
  "Gather recent tax returns plus Transcenlutions corporate registration, licensing, and formation records.",
  "Build acquisition-ready financial projections: income statement, balance sheet, cash flow, KPIs, break-even analysis, and benchmarking.",
  "For each target business, preserve seller and broker claims separately from document-supported facts and unresolved unknowns.",
  "Model seller financing, third-party equity, lender debt service, working capital, management replacement cost, and owner independence before advancing a deal.",
] as const;

const consultantSupport = [
  ["Business planning", "Business plan development, review, and fine-tuning."],
  ["Financial projections", "Comprehensive income statement, balance sheet, cash-flow projections, KPI development, sales break-even analysis, and benchmarking."],
  ["Accounting support", "QuickBooks or other software implementation, periodic financial and operational reviews, and coordination with CPAs and advisors."],
  ["Market research", "Research support using tools such as Vertical IQ and IBISWorld."],
  ["Legal awareness", "Business-structure formation, licensing and registrations, contract-review resources, and referrals including Turner Padgett and USC Law School resources."],
  ["Education", "Financial-literacy workshops plus the SBDC library of webinars and tools."],
  ["Loan preparation", "Financial-health assessment, documentation review, bank and lender coordination, and relationship follow-up."],
] as const;

const consultationQuestions = [
  "Can SC SSBCI-supported lenders finance the acquisition of an operating service business, and what equity injection, credit, revenue, collateral, or experience do they require?",
  "How will seller notes, earn-outs, and third-party equity be treated in the capital stack?",
  "Which conventional, community-bank, or asset-based options fit the deal if a personal guarantee is limited or unavailable?",
  "Which seller records should be obtained before prequalification, and which lenders actively finance acquisitions at the target size?",
  "Which no-cost acquisition, succession-planning, technical-assistance, or market-research resources should Transcenlutions use before committing capital?",
] as const;

export default function AcquisitionPage() {
  return (
    <main className="info-shell">
      <Link className="info-back" href="/">Back to Tay command room</Link>
      <article className="info-panel">
        <p className="eyebrow">Transcenlutions Acquisition OS</p>
        <h1>Acquisition & Funding Readiness</h1>
        <p className="info-intro">
          This surface turns the October 8, 2026 SBDC/SSBCI consultant response into the next governed acquisition workflow for Transcenlutions.
          The goal is documented cash flow, affordable payments, adequate working capital, and owner independence — not aged shells, hidden liabilities, or unsupported funding claims.
        </p>

        <div className="info-review">
          <strong>Current owner action required</strong>
          <p>
            Rick Vander Weele advised Transcenlutions to register with the South Carolina SBDC first. After the intake is processed, he or another consultant will contact the company to schedule the initial meeting.
          </p>
          <a className="primary-button" href={sbdcSignupUrl} target="_blank" rel="noreferrer">Open SC SBDC intake</a>
        </div>

        <div className="info-section-grid">
          <section>
            <h2>Readiness queue</h2>
            <ol>{readinessItems.map(item => <li key={item}>{item}</li>)}</ol>
          </section>
          <section>
            <h2>Consultation agenda</h2>
            <ol>{consultationQuestions.map(item => <li key={item}>{item}</li>)}</ol>
          </section>
          <section>
            <h2>SBDC / SSBCI support now mapped into Tay</h2>
            <dl>
              {consultantSupport.map(([title, body]) => (
                <div key={title}>
                  <dt><strong>{title}</strong></dt>
                  <dd>{body}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h2>Governance</h2>
            <p>
              Tay may organize evidence, prepare projections, compare financing scenarios, build document requests, and prepare consultation questions. Owner approval remains required before credit pulls, lender applications, sharing sensitive financial information, accepting guarantees, paying fees, signing legal documents, or committing capital.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
