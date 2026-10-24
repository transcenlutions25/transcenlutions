// Pure local validation, not an authenticated authorization boundary.
export function reviewChecklist(template, record) {
 const errors=[];
 if (!template || !record) return {ready:false,errors:['Missing template or record'],authorizationGranted:false};
 if(record.templateId!==template.id || record.version!==template.version) errors.push('Template version mismatch');
 if(!Number.isInteger(record.revision)||record.revision<1) errors.push('Positive record revision required');
 if(!record.jobId || !record.actorId) errors.push('Job and actor references required');
 const rows=Array.isArray(record.responses)?record.responses:[];
 const ids=rows.map(x=>x.stepId);
 if(new Set(ids).size!==ids.length) errors.push('Duplicate step response');
 if(ids.some(id=>!template.steps.some(x=>x.id===id))) errors.push('Unknown step response');
 const validDate=s=>typeof s==='string' && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(s) && Number.isFinite(Date.parse(s));
 for(const step of template.steps){
  const row=rows.find(x=>x.stepId===step.id);
  if(!row){if(step.required)errors.push(`Missing required step ${step.id}`);continue;}
  if(row.status==='blocked'){errors.push(`Blocked step ${step.id}`);continue;}
  if(row.status==='not_applicable'){
   if(step.required || !row.reason?.trim())errors.push(`Invalid skip ${step.id}`);
   continue;
  }
  if(row.status!=='complete') errors.push(`Invalid status ${step.id}`);
  if(row.role!==step.role || !row.actorId) errors.push(`Responsible role missing ${step.id}`);
  if(!validDate(row.completedAt))errors.push(`Invalid timestamp ${step.id}`);
  if(step.evidence==='record_reference' && (!Array.isArray(row.evidenceRefs)||!row.evidenceRefs.length||row.evidenceRefs.some(x=>typeof x!=='string'||!x.trim()))) errors.push(`Evidence reference missing ${step.id}`);
 }
 const sign=record.signoff;
 if(!sign ||sign.role!==template.signoff_role||!sign.actorId||!validDate(sign.at)||sign.version!==template.version||sign.revision!==record.revision)errors.push('Valid reviewer signoff required');
 return {ready:errors.length===0,errors,authorizationGranted:false,liveActivation:false};
}
export function coverageExpiry({verified, expiresAt}, now){
 if(verified!==true || !Number.isFinite(Date.parse(expiresAt)) || !Number.isFinite(Date.parse(now)))return 'review_required';
 const days=(Date.parse(expiresAt)-Date.parse(now))/86400000;
 return days<=0?'expired':days<=30?'renewal_review':'current_record';
}
export function chooseServiceTemplates(templates, service){
 const known=['airbnb','apartment','office','warehouse','estate','hotel','pressure_wash'];
 if(!known.includes(service))throw new Error('Unreviewed service');
 return templates.filter(t=>t.phase==='service'&&(t.service==='all'||t.service===service));
}
