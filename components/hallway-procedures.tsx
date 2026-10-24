import catalog from "../lib/hallway/sops/templates.json";

/** Read-only operating standards, not customer records or an authorization UI. */
export default function HallwayProcedures() {
  return (
    <section aria-labelledby="hallway-procedures-heading" style={{margin:"30px 0",padding:20,border:"1px solid #524783",borderRadius:12,background:"#17152d"}}>
      <h2 id="hallway-procedures-heading" style={{color:"#e4c675"}}>Operating procedures inside Tay</h2>
      <p>Review the existing service procedures here without leaving Tay. Version {catalog.template_version}. These procedures remain pending owner review; reading a checklist does not approve a vendor, job or payment.</p>
      <p role="status">Live job records and checklist submissions are not connected. No customer data is loaded or saved by this section.</p>
      {catalog.templates.map(template => (
        <details key={template.id} style={{borderTop:"1px solid #524783",padding:"12px 0"}}>
          <summary style={{cursor:"pointer",color:"#e4c675"}}>{template.title} · {template.service === "all" ? "All services" : template.service.replaceAll("_"," ")} · v{template.version}</summary>
          <p>Reviewer: {template.signoff_role}. Status: {template.status.replaceAll("_"," ")}.</p>
          <ol>{template.steps.map(step => (
            <li key={step.id} style={{margin:"10px 0",lineHeight:1.55}}>
              {step.text}
              <small style={{display:"block",color:"#cfc4e4"}}>{step.required ? "Required" : "Conditional"} · Responsible: {step.role} · Evidence: {step.evidence.replaceAll("_"," ")}</small>
            </li>
          ))}</ol>
        </details>
      ))}
    </section>
  );
}
