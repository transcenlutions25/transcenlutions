/* Local inspection mockup following ApprovalCard/ChangeSlideshow structure.
 * Decisions here never authorize, install or execute a tool. */
(function () {
  'use strict';
  const projects=new Map();let current=null,sequence=0;
  const labels={purpose:'Purpose and expected result',actions:'Proposed actions',data:'Data read, changed or retained',accounts:'Accounts and people affected',permissions:'Requested permissions',costs:'Costs and financial effects',risks:'Risks and safeguards',tests:'Test results and evidence',limitations:'Limitations and missing information',rollback:'Rollback and recovery',jurisdiction:'Jurisdiction and action applicability',policy:'Reviewed policy and exact version',sources:'Cited review evidence',uncertainty:'Uncertainty and unresolved questions',reviewer:'Required independent reviewer'};
  const unknown={actions:'Not specified — inspection required.',data:'Not specified — no data access granted.',accounts:'Not specified — no account connected.',permissions:'Not specified — no permissions granted.',costs:'Unknown for the proposed tool. No spending or financial changes authorized.',risks:'Not assessed. No executable tool is connected.',tests:'Not run. No tool test result has been verified.',limitations:'Local proposal only. Generation, installation, execution and durable governance are not connected.',rollback:'Discard this local draft. Real rollback must be defined before any executable implementation.',jurisdiction:'Unspecified — jurisdiction and action-specific applicability need review.',policy:'Unreviewed — no approved policy/version is bound to this proposal.',sources:'No reviewed evidence recorded for this exact proposal revision.',uncertainty:'Unresolved. No rule matched does not establish that an action is lawful.',reviewer:'Independent qualified reviewer for the applicable jurisdiction and action; verified system authorization still required.'};
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n};
  function entries(projectId){if(!projects.has(projectId))projects.set(projectId,[]);return projects.get(projectId)}
  function clear(){projects.clear();current=null;}
  function add(projectId,title,purpose,source=''){
    const list=entries(projectId);if(list.length>=50)return null;
    const draft={id:'local-proposal-'+(++sequence),title:title.slice(0,120),fields:{...unknown,purpose:purpose.slice(0,12000)},source:source.slice(0,12000),decision:'pending',inspected:false,revision:1,compliance:'HOLD_LEGAL_REVIEW'};list.push(draft);return draft;
  }
  function mount({shell,panel,projectId,openPanel}){
    const state={shell,panel,projectId,openPanel};current=state;
    const container=el('details','','local-proposal-review');
    const summary=el('summary','Tool proposals · local review');container.append(summary);
    const heading=el('h3','Tool proposals');heading.tabIndex=-1;
    const boundary=el('p','All drafts are INACTIVE. This is a local review preview. Approve, Reject and Review later update this tab only; they do not grant production permission or run anything. Reload or leaving the workspace clears these drafts.','proposal-boundary');
    const money=el('p','Financial boundary: this review cannot spend or move money, change billing/payments, or change anyone’s financial records. Proposed financial effects need separately verified safeguards and owner authorization.','proposal-boundary');
    const list=el('div');state.list=list;state.container=container;state.heading=heading;
    const form=el('form');form.setAttribute('aria-label','Create local tool proposal');
    const nameLabel=el('label','Tool name'),name=el('input');name.required=true;name.maxLength=120;name.setAttribute('aria-label','Proposed tool name');nameLabel.append(name);
    const purposeLabel=el('label','What should the tool do?'),purpose=el('textarea');purpose.required=true;purpose.maxLength=12000;purpose.setAttribute('aria-label','Proposed tool purpose');purposeLabel.append(purpose);
    const create=el('button','Create inactive local draft','secondary');create.type='submit';const notice=el('p','','muted');notice.setAttribute('role','status');
    form.append(nameLabel,purposeLabel,create,notice);if(!projectId){create.disabled=true;notice.textContent='Select a project before creating a local proposal.';}form.onsubmit=e=>{e.preventDefault();if(current!==state||!projectId)return;const title=name.value.trim(),goal=purpose.value.trim();if(!title||!goal){notice.textContent='Enter a name and purpose.';return}const draft=add(projectId,title,goal);if(!draft){notice.textContent='This tab holds at most 50 local drafts per project.';return}name.value='';purpose.value='';render(state);container.open=true;heading.focus();};
    const complianceNote=el('p','Draft engineering safeguards, not legal certification: DENY_KNOWN_PROHIBITED blocks authorization; HOLD_LEGAL_REVIEW blocks uncertain/unreviewed actions; ELIGIBLE_FOR_AUTHORIZATION requires independent reviewed evidence for the exact action and revision, and still does not authorize execution. No rule matched is not lawful. Tay may propose legal policies but cannot approve them. Owner approval cannot clear a prohibited or uncertain state.','proposal-boundary');
    const references=el('details');references.append(el('summary','Research references — applicability not reviewed'));
    references.append(el('p','CC codes has not been clarified and is not assumed to mean UCC. Constitutional applicability needs government/state-action review, not a blanket claim about every private action.','muted'));
    for(const [title,url] of [['SC Title 36: Commercial Code','https://www.scstatehouse.gov/code/t36c001.php'],['SC Title 37: Consumer Protection Code','https://www.scstatehouse.gov/code/t37c001.php'],['SC Title 39 Chapter 5: Unfair Trade Practices','https://www.scstatehouse.gov/code/t39c005.php']]){const a=el('a',title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';references.append(a,el('br'));}
    container.append(heading,boundary,money,complianceNote,references,list,form);
    panel.querySelector('h2').after(container);
    const nav=el('button','Tool proposals · 0 local','secondary');nav.type='button';nav.className+=' proposal-nav';nav.onclick=()=>show(state);shell.querySelector('#logout')?.before(nav);state.nav=nav;
    render(state);
    return ()=>{if(current===state)current=null;};
  }
  function show(state){if(current!==state||!state.shell.isConnected)return;state.openPanel();state.container.open=true;state.heading.focus();}
  function render(state){
    if(current!==state)return;
    const drafts=entries(state.projectId);state.nav.textContent='Tool proposals · '+drafts.length+' local';state.list.replaceChildren();
    if(!drafts.length)state.list.append(el('p','No local tool proposals. Create a draft below or set aside a loaded message. A Tay-generated proposal feed is not connected here.','muted'));
    for(const draft of drafts)state.list.append(card(state,draft));
  }
  function card(state,draft){
    const article=el('article','','tl-approval local-proposal-card');article.setAttribute('aria-label','Local tool proposal: '+draft.title);
    const title=el('h4',draft.title),status=el('p','','proposal-state');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const decisionText=()=>draft.decision==='approved'?'Preview approved · INACTIVE · no production permission':draft.decision==='rejected'?'Rejected locally · INACTIVE':draft.decision==='review_later'?'Review later · INACTIVE':'Pending inspection · INACTIVE';
    const updateStatus=()=>{status.textContent=decisionText()+' · revision '+draft.revision+' · '+draft.compliance;};updateStatus();article.append(title,status);
    const preview=el('section','','tl-slides proposal-preview');preview.setAttribute('aria-label','Non-executable proposal preview');
    const slides=[['What is proposed',[draft.fields.purpose,draft.fields.actions]],['Data and authority',[draft.fields.data,draft.fields.accounts,draft.fields.permissions]],['Cost, safety and recovery',[draft.fields.costs,draft.fields.risks,draft.fields.rollback]]];let index=0;
    const slideTitle=el('strong'),slideBody=el('ul'),counter=el('span');counter.setAttribute('aria-live','polite');
    const previous=el('button','Previous preview','secondary'),next=el('button','Next preview','secondary');previous.type=next.type='button';previous.setAttribute('aria-label','Previous proposal preview');next.setAttribute('aria-label','Next proposal preview');
    const showSlide=()=>{slideTitle.textContent=slides[index][0];slideBody.replaceChildren(...slides[index][1].map(text=>el('li',text)));counter.textContent=' '+(index+1)+' / '+slides.length+' ';previous.disabled=index===0;next.disabled=index===slides.length-1;};
    previous.onclick=()=>{index=Math.max(0,index-1);showSlide();next.focus()};next.onclick=()=>{index=Math.min(slides.length-1,index+1);showSlide();previous.focus()};showSlide();
    preview.append(el('p','Inspection preview only. No code, page or tool is executed.','muted'),slideTitle,slideBody,previous,counter,next);article.append(preview);
    for(const [key,label] of Object.entries(labels)){const section=el('section');section.append(el('h5',label));const bullets=el('ul');for(const line of draft.fields[key].split('\n').filter(line=>line.trim()))bullets.append(el('li',line));section.append(bullets);article.append(section)}
    if(draft.source){const reference=el('details');reference.append(el('summary','Original reference (not executable instructions)'),el('pre',draft.source));article.append(reference)}
    const edit=el('details');edit.append(el('summary','Edit detailed proposal'));const editForm=el('form');const inputs={};
    const titleLabel=el('label','Tool name'),titleInput=el('input');titleInput.value=draft.title;titleInput.required=true;titleInput.maxLength=120;titleInput.setAttribute('aria-label','Edit tool name');titleLabel.append(titleInput);editForm.append(titleLabel);
    for(const [key,label] of Object.entries(labels)){const wrap=el('label',label),input=el('textarea');input.value=draft.fields[key];input.required=true;input.maxLength=12000;input.setAttribute('aria-label','Edit '+label);wrap.append(input);editForm.append(wrap);inputs[key]=input;}
    const save=el('button','Save revised inactive draft','secondary');save.type='submit';editForm.append(save);edit.append(editForm);article.append(edit);
    const inspectedLabel=el('label','','proposal-inspected'),inspected=el('input');inspected.type='checkbox';inspected.checked=draft.inspected;inspectedLabel.append(inspected,document.createTextNode(' I inspected the detailed bullets and evidence. This is only a local review preview.'));
    const approve=el('button','Approve','secondary'),reject=el('button','Reject','secondary'),later=el('button','Review later','secondary');for(const b of [approve,reject,later])b.type='button';approve.disabled=!draft.inspected||draft.compliance!=='ELIGIBLE_FOR_AUTHORIZATION';
    inspected.onchange=()=>{draft.inspected=inspected.checked;approve.disabled=!draft.inspected||draft.compliance!=='ELIGIBLE_FOR_AUTHORIZATION';};
    for(const [button,decision] of [[approve,'approved'],[reject,'rejected'],[later,'review_later']])button.onclick=()=>{if(current!==state||!state.shell.isConnected||(decision==='approved'&&(!draft.inspected||draft.compliance!=='ELIGIBLE_FOR_AUTHORIZATION')))return;draft.decision=decision;updateStatus();};
    const invalidate=()=>{if(draft.compliance!=='DENY_KNOWN_PROHIBITED')draft.compliance='HOLD_LEGAL_REVIEW';draft.inspected=false;draft.decision='pending';inspected.checked=false;approve.disabled=true;updateStatus();};
    editForm.oninput=invalidate;editForm.onsubmit=e=>{e.preventDefault();if(current!==state)return;const newTitle=titleInput.value.trim();if(!newTitle||Object.values(inputs).some(input=>!input.value.trim()))return;draft.title=newTitle;for(const key of Object.keys(labels))draft.fields[key]=inputs[key].value.trim();draft.revision++;invalidate();render(state);state.heading.focus();};
    const deny=el('button','Flag known prohibited (local)','secondary');deny.type='button';deny.onclick=()=>{if(current!==state)return;draft.compliance='DENY_KNOWN_PROHIBITED';invalidate();};
    const complianceLimit=el('p','Approval is unavailable while legal review is held or prohibited. This local prototype cannot independently verify reviewed evidence or grant ELIGIBLE_FOR_AUTHORIZATION. Editing action parameters invalidates inspection and returns the proposal to legal review; a known-prohibited flag cannot be cleared here.','muted');
    const inactive=el('button','Activate unavailable — no verified executor','secondary');inactive.type='button';inactive.disabled=true;
    article.append(inspectedLabel,approve,reject,later,deny,complianceLimit,inactive,el('p','Local review choices are not signed authority, a completed test, a spending approval or an executable tool. Production governance must verify the identity, exact revision, permissions and action before activation.','muted'));
    return article;
  }
  function stageMessage(projectId,text){const state=current;if(!state||state.projectId!==projectId||!projectId||typeof text!=='string'||!text.trim())return;const draft=add(projectId,'Tool draft from loaded reference',text,text);if(!draft)return;render(state);show(state);}
  window.TayProposalReview={mount,clear,stageMessage};
}());
