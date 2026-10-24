/** Pure planning gate. Does not query accounts, write records, or authorize execution. */
export const EXISTING_CRM=Object.freeze({
 customers:{table:'tay_customers',identity:['id','project_id'],fields:['name','email','stage','notes']},
 deliveries:{table:'tay_deliveries',identity:['id','project_id','customer_id'],fields:['offer','status','artifact_path']},
 tasks:{table:'tay_tasks',identity:['id','project_id'],fields:['title','description','status','priority','assigned_agent_id','due_at']}
});
const gaps=Object.freeze(['property_site_details','vendor_eligibility','availability','quote_booking','sop_evidence','incidents','durable_opt_out']);
export function assessHallwayReuse({inventory=EXISTING_CRM,required=gaps,mappingVerified=false,connectorVerified=false,capacityEvidence=null}={}){
 const reusable=Object.keys(EXISTING_CRM).filter(k=>inventory[k]?.table===EXISTING_CRM[k].table);
 const missingInventory=Object.keys(EXISTING_CRM).filter(k=>!reusable.includes(k));
 const measurements=capacityEvidence?.measured===true&&typeof capacityEvidence?.source==='string'&&capacityEvidence.source.length>0;
 // Missing wiring, absent measurements, hypothetical demand and marketing claims are NOT capacity failures.
 const capacityGap=measurements&&capacityEvidence.limitExceeded===true;
 const decision=missingInventory.length?'verify-existing-inventory':capacityGap?'optimize-existing-first':'reuse-existing';
 return Object.freeze({decision,reusable,missingInventory,extensions:[...new Set(required.filter(x=>gaps.includes(x)))],
  capacity:measurements?(capacityGap?'measured-limit-needs-optimization-review':'measured-within-limit'):'not-measured-no-replacement-justification',
  mappingVerified,connectorVerified,operational:mappingVerified&&connectorVerified&&required.length===0,
  replacementAuthorized:false,writeAuthorized:false,
  blockers:[...(!mappingVerified?['business-project-binding-unverified']:[]),...(!connectorVerified?['existing-crm-write-connector-unverified']:[]),...(required.length?['required-workflow-extensions-unverified']:[])]});
}

/** Global build preflight: applies equally to CRM, UI, runtime, queue, hosting or other capability. */
export function assessCapabilityReuse({capability,existing=[],requirements=[],evidence={}}={}){
 if(typeof capability!=='string'||!capability.trim())throw Error('Name the capability before proposing implementation.');
 const verified=existing.filter(x=>x&&x.verified===true&&typeof x.id==='string');
 const uncovered=requirements.filter(r=>!verified.some(x=>Array.isArray(x.supports)&&x.supports.includes(r)));
 const measuredLimit=evidence.measured===true&&evidence.limitExceeded===true&&typeof evidence.source==='string'&&evidence.source.length>0;
 return {capability,reuse:verified.map(x=>x.id),uncovered,
  decision:verified.length?(measuredLimit?'optimize-existing-first':uncovered.length?'extend-existing':'reuse-existing'):'inventory-before-build',
  newSystemAuthorized:false,reason:measuredLimit?'Measured capacity needs optimization review.':'Missing connection or unknown capacity is not evidence for replacement.'};
}
