import Link from "next/link";

const stages = [
  { title: "1. Invite", copy: "Send an individual, relevant invitation to an eligible local professional. Confirm their address and consent before outreach." },
  { title: "2. Apply", copy: "Collect service area, experience, availability and insurance confirmation through the existing Hallway Cleaning application." },
  { title: "3. Review", copy: "Verify documentation and practical capability. Applications stay pending until the owner approves the vendor." },
  { title: "4. Offer work", copy: "Confirm scope, schedule, compensation and customer permission before assigning a job." },
  { title: "5. Deliver & collect", copy: "Track completion evidence, customer acceptance, the balance collected and any approved vendor payment." }
];

const campaign = [
  { label: "Introduction", subject: "Hallway Cleaning | Local vendor opportunities", body: `Hello,

Hallway Cleaning is building a network of independent cleaning and property-service professionals in Columbia, South Carolina and surrounding areas.

We're interested in learning which services you provide, the locations you cover, and whether you would be open to being considered for future projects as they become available.

You can find our information and vendor application here: https://hallwaycleaning.com/vendor-opportunities

Participation is optional, and applying does not guarantee assignments. Any potential project would be discussed with you before a commitment.

Would you be interested in connecting?

Best,
Hallway Cleaning
hallwaycleaningsc@gmail.com` },
  { label: "One respectful follow-up", subject: "Following up | Hallway Cleaning vendor network", body: `Hello,

I wanted to follow up on our invitation to connect with Hallway Cleaning's local vendor network.

If commercial cleaning, turnovers or related property-service work fits your business, you can review our application at https://hallwaycleaning.com/vendor-opportunities.

There is no obligation. If this isn't relevant or you would prefer not to hear from us, just let us know and we will not follow up again.

Best,
Hallway Cleaning
hallwaycleaningsc@gmail.com` }
];

export const metadata = { title: "Hallway Cleaning | Tay Business Workspace", description: "Hallway Cleaning coordination and vendor recruitment inside Tay Command." };

export default function HallwayWorkspace() {
  return (
    <main style={{minHeight:"100vh",color:"#f4f2fc",background:"linear-gradient(135deg,#090811,#1a1237 60%,#091942)",padding:"clamp(18px,4vw,50px)",fontFamily:"inherit"}}>
      <div style={{maxWidth:1060,margin:"auto"}}>
        <Link href="/" style={{color:"#f0d575"}}>← Back to Tay Command</Link>
        <p style={{marginTop:32,color:"#f0d575",fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontSize:12}}>Transcenlutions · Business division</p>
        <h1 style={{fontSize:"clamp(30px,5vw,48px)",lineHeight:1.1,margin:"10px 0 14px"}}>Hallway Cleaning</h1>
        <p style={{maxWidth:800,lineHeight:1.7,color:"#ddd7ef"}}>One command surface for professional vacation rental and apartment turnovers, offices, warehouses, estates, hotels, timeshares, pressure washing and larger projects. The customer intake and vendor application live in the separate Hallway Cleaning service; Tay does not silently copy or expose private customer data.</p>
        <section aria-label="Business tools" style={{display:"flex",flexWrap:"wrap",gap:12,margin:"26px 0"}}>
          {[
            ["Public site","https://hallwaycleaning.com"],
            ["Request a quote","https://hallwaycleaning.com/start"],
            ["Vendor recruiting page","https://hallwaycleaning.com/vendor-opportunities"],
            ["Vendor application","https://hallwaycleaning.com/vendors"],
            ["Private operator dashboard","https://hallwaycleaning.com/leads"]
          ].map(([label,url])=><a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{border:"1px solid #9c81d0",borderRadius:8,padding:"12px 16px",color:"#fff",textDecoration:"none"}}>{label} ↗</a>)}
        </section>
        <p style={{borderLeft:"3px solid #e0be67",paddingLeft:15,color:"#e8dba6"}}>Connection status: routes are references to the existing Hallway Cleaning app. Live deployment, database, email delivery, payments and cross-application identity sharing must be validated separately. Do not send customer records into Tay chat.</p>
        <h2 style={{marginTop:42,fontSize:25}}>Client acquisition · sales pipeline</h2>
        <p style={{lineHeight:1.6,color:"#ddd7ef"}}>Focus on Airbnb and vacation rental operators, apartment leasing teams, office and warehouse facility managers, estate managers, hotels, timeshares and pressure-washing customers. Each prospective buyer follows the existing Hallway Cleaning quoting process without copying private contact data to Tay.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12}}>
        {[
          ["1. Target", "Identify legitimate decision-makers by property type, service area and likely cleaning need."],
          ["2. Qualify", "Verify location, property size, vendor eligibility and appropriate contact channels."],
          ["3. Connect", "Send a relevant one-to-one introduction with a custom quote invitation, not bulk spam."],
          ["4. Capture", "Direct website, referral, email and call leads to Hallway Cleaning's existing /start intake."],
          ["5. Propose", "Collect photos or walkthrough details, review staffing and price, and issue an approved quote."],
          ["6. Close & grow", "Confirm payment and service readiness, complete work, request permission-based reviews and follow-up for recurring contracts."]
        ].map(([title,copy])=><article key={title} style={{background:"#17152d",border:"1px solid #524783",borderRadius:10,padding:17}}><h3 style={{color:"#e4c675"}}>{title}</h3><p style={{color:"#ddd7ef",lineHeight:1.55}}>{copy}</p></article>)}
        </div>
        <p style={{marginTop:18,color:"#e8dba6"}}>Acquisition status: structured workflow and quote-link routing ready for review. Prospect research, outreach delivery, CRM synchronization, automated follow-up and collected payments are not verified live. No customer or contractor is promised until capacity is confirmed.</p>
        <a href="https://hallwaycleaning.com/commercial-clients" target="_blank" rel="noopener noreferrer" style={{display:"inline-block",margin:"12px 0 28px",color:"#f0d575"}}>Commercial client acquisition landing page ↗</a>
        <h2 style={{marginTop:42,fontSize:25}}>Vendor recruitment workflow</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>
          {stages.map(s=><article key={s.title} style={{background:"#17152d",border:"1px solid #524783",borderRadius:12,padding:18}}><h3 style={{color:"#e4c675",fontSize:17}}>{s.title}</h3><p style={{lineHeight:1.55,color:"#ddd7ef"}}>{s.copy}</p></article>)}
        </div>
        <h2 style={{marginTop:42,fontSize:25}}>Reusable email campaign</h2>
        <p style={{lineHeight:1.6,color:"#ddd7ef"}}>Personalize for a verified recipient. Draft and review the offer before sending; no automated outreach is activated. Campaign copy is original and does not reproduce another company&apos;s proprietary content.</p>
        {campaign.map((item)=><section key={item.label} style={{marginTop:18,padding:20,background:"#131226",border:"1px solid #504470",borderRadius:12}}>
          <h3 style={{fontSize:19,color:"#e4c675"}}>{item.label}</h3>
          <p><strong>Subject:</strong> {item.subject}</p>
          <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",font:"inherit",lineHeight:1.6,color:"#e1dbea"}}>{item.body}</pre>
        </section>)}
        <p style={{marginTop:35,color:"#b6a8d7"}}>Implementation note: use the existing Hallway Cleaning leads and contractors records as the source of truth. Do not represent a prospective vendor as approved, a customer request as a booking, or a quote as a paid job.</p>
      </div>
    </main>
  );
}
