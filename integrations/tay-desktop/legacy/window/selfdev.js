(() => {
  const $ = id => document.getElementById(id);
  let active = false, working = false, selected = null, generation = 0;
  let savedNodes = [], savedDraft = '', devDraft = '';
  const sessionGet = key => { try { return sessionStorage.getItem(key); } catch { return null; } };
  const sessionSet = (key,value) => { try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key,value); } catch {} };
  const apiCall = (path,data={}) => api('/selfdev/'+path,data);
  const banner = document.createElement('section'); banner.id = 'selfDevBanner'; banner.hidden = true;
  banner.innerHTML = '<div><strong>Developing Tay</strong><span id="selfDevScope">Describe one correction. Tay prepares an interface change for review.</span></div><button id="selfDevChanges">Changes</button><button id="selfDevExit" aria-label="Leave self-development">×</button>';
  $('messages').before(banner);
  const changeList = document.createElement('section'); changeList.id = 'selfDevChangesList'; changeList.hidden = true;
  const dialog = document.createElement('dialog'); dialog.id = 'selfDevReview';
  dialog.innerHTML = '<div class="selfdev-heading"><div><h2>Review Tay’s changes</h2><p class="note">Preview is isolated. It cannot send messages or access your projects.</p></div><button id="selfDevReviewClose" aria-label="Close review">×</button></div><p id="selfDevSummary"></p><div class="selfdev-tabs"><button id="selfDevPreviewTab">Visual preview</button><button id="selfDevDiffTab">Code changes</button></div><iframe id="selfDevFrame" title="Proposed Tay interface" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe><pre id="selfDevDiff" hidden></pre><p id="selfDevChecks" class="note"></p><p id="selfDevReviewStatus" role="status"></p><div class="selfdev-actions"><button id="selfDevApply">Apply changes</button><button id="selfDevDiscard">Discard draft</button></div><p class="note">Apply writes to Tay’s interface files and saves a recovery copy. Preview and syntax checks do not guarantee every interaction works.</p>';
  document.body.append(dialog);
  const elem = (tag,text,className) => { const x=document.createElement(tag);x.textContent=text;if(className)x.className=className;return x; };
  function setWorking(value) {
    working=value; busy=value;
    for (const id of ['send','new','add']) $(id).disabled=value;
    $('project').disabled=active||value;
    document.querySelectorAll('[data-thread-mode],button[data-privacy],#quickMode,#offlineToggle').forEach(x=>x.disabled=value || (x.id==='quickMode' && window.tayThread.getPrivacy()!=='online'));
    document.body.dataset.tayActivity=value?'working':'idle';
  }
  function welcome() {
    const w=elem('div','', 'welcome'); w.append(elem('h1','How should Tay improve?'),elem('p','Describe a layout, wording, styling, or chat-control correction. Tay reads his interface code and prepares a change you can preview, apply, and undo.'));
    w.append(elem('p','Server changes, installations, and other projects still use Coding tools.','note'));
    $('messages').append(w);
  }
  function scope() {
    const privacy=window.tayThread.getPrivacy();
    $('selfDevScope').textContent=privacy==='online' ? 'Tay interface source and your request go to the selected online model. Review before applying.' : privacy==='incognito' ? 'Local model · temporary conversation. Apply still writes files and a recovery copy.' : 'Local model · interface changes · preview, apply, undo.';
  }
  function renderProposal(p,target=changeList) {
    const old=target.querySelector(`[data-change-id="${p.id}"]`); if(old)old.remove();
    const card=elem('section','', 'selfdev-card');card.dataset.changeId=p.id;
    card.append(elem('strong',p.summary),elem('span',p.status==='ready'?'Ready to review':p.status,'selfdev-state'));
    const buttons=elem('div','', 'selfdev-actions');
    if(p.status==='ready') {
      const review=elem('button','Preview & review');review.onclick=()=>reviewProposal(p);buttons.append(review);
      const revise=elem('button','Revise in chat');revise.onclick=()=>{selected=p;status('Your next message will revise this draft.');$('prompt').focus();};buttons.append(revise);
    }
    if(p.status==='applied') {
      const undo=elem('button','Undo change');undo.onclick=async()=>{if(working)return;setWorking(true);try{await apiCall('undo',{id:p.id});sessionSet('tay.selfdev.resume','yes');location.reload();}catch(e){status(e.message);setWorking(false);}};buttons.append(undo);
    }
    card.append(buttons);target.append(card);
  }
  async function refresh() {
    const id=++generation; const s=await apiCall('state');
    if(!active||id!==generation)return;
    $('messages').replaceChildren(); changeList.replaceChildren();
    s.messages.forEach(m=>msg(m.role,m.content));if(!s.messages.length)welcome();
    selected=s.proposals.find(p=>p.status==='ready')||null;
    s.proposals.forEach(p=>renderProposal(p));
    if(!s.proposals.length)changeList.append(elem('p','Your reviewed changes and recovery controls will appear here.','note'));
    $('messages').append(changeList);changeList.hidden=!s.proposals.length;
  }
  async function modeChanged(mode) {
    const next=mode==='selfdev';if(next===active)return;
    if(next) {
      await window.tayInitialLoad;
      if(window.tayThread.getMode()!=='selfdev')return;
      savedNodes=[...$('messages').childNodes];savedDraft=$('prompt').value;
      active=true;banner.hidden=false;$('project').disabled=true;
      $('prompt').value=devDraft;$('prompt').placeholder='Tell Tay what to improve…';scope();
      try{await refresh();}catch(e){status(e.message);}
    } else {
      active=false;generation++;devDraft=$('prompt').value;
      $('messages').replaceChildren(...savedNodes);$('prompt').value=savedDraft;
      banner.hidden=true;$('project').disabled=false;$('prompt').placeholder='Message Tay…';status('');
    }
  }
  async function poll(job) {
    while(true) {
      const s=await api('/job',{job});
      if(s.done) {
        msg('assistant',s.answer);status('');
        if(s.proposal){selected=s.proposal;changeList.hidden=false;renderProposal(s.proposal);$('messages').append(changeList);changeList.scrollIntoView({block:'nearest'});}
        return;
      }
      status(s.progress||'Tay is inspecting his interface…');
      await new Promise(r=>setTimeout(r,1500));
    }
  }
  async function sendDevelopment() {
    const text=$('prompt').value.trim();if(working||!text)return;
    stopMic();setWorking(true);$('prompt').value='';$('messages').querySelector('.welcome')?.remove();msg('user',text);
    try {
      const j=await apiCall('chat',{message:text,proposal:selected?.status==='ready'?selected.id:undefined,mode:$('mode').value,model:$('model').value,key:$('key').value,paid:$('paid').checked});
      sessionSet('tay.selfdev.job',j.job);await poll(j.job);
    }catch(e){msg('assistant','Could not prepare the change: '+e.message);status('Your request is available to edit and retry.');$('prompt').value=text;}
    finally{sessionSet('tay.selfdev.job',null);setWorking(false);}
  }
  async function reviewProposal(p) {
    selected=p;$('selfDevSummary').textContent=p.summary;$('selfDevDiff').textContent=p.diff;
    $('selfDevChecks').textContent=p.checks.join(' · ');$('selfDevReviewStatus').textContent='Loading isolated preview…';
    $('selfDevApply').disabled=false;$('selfDevDiscard').disabled=false;dialog.showModal();
    try{const data=await apiCall('preview',{id:p.id});$('selfDevFrame').srcdoc=data.html;$('selfDevReviewStatus').textContent='Draft only. The running app has not changed.';}catch(e){$('selfDevReviewStatus').textContent=e.message;}
  }
  $('selfDevReviewClose').onclick=()=>dialog.close();
  $('selfDevPreviewTab').onclick=()=>{$('selfDevFrame').hidden=false;$('selfDevDiff').hidden=true;};
  $('selfDevDiffTab').onclick=()=>{$('selfDevFrame').hidden=true;$('selfDevDiff').hidden=false;};
  $('selfDevApply').onclick=async()=>{
    if(working||!selected)return;setWorking(true);$('selfDevApply').disabled=true;$('selfDevDiscard').disabled=true;
    try{await apiCall('apply',{id:selected.id});sessionSet('tay.selfdev.resume','yes');location.reload();}
    catch(e){$('selfDevReviewStatus').textContent=e.message;$('selfDevApply').disabled=false;$('selfDevDiscard').disabled=false;setWorking(false);}
  };
  $('selfDevDiscard').onclick=async()=>{if(working||!selected)return;try{await apiCall('discard',{id:selected.id});selected=null;dialog.close();await refresh();}catch(e){$('selfDevReviewStatus').textContent=e.message;}};
  $('selfDevChanges').onclick=()=>{changeList.hidden=!changeList.hidden;if(!changeList.hidden)changeList.scrollIntoView({block:'nearest'});};
  $('selfDevExit').onclick=()=>window.tayThread.setMode('chat');
  window.addEventListener('tay-mode-change',e=>modeChanged(e.detail));
  window.addEventListener('tay-privacy-change',()=>{if(active){scope();refresh().catch(e=>status(e.message));}});
  const addButton=elem('button','Self-development');addButton.onclick=()=>{document.querySelector('.tay-composer-add').classList.remove('open');window.tayThread.setMode('selfdev');};
  document.querySelector('.tay-composer-add')?.append(addButton);
  const agentMode=$('threadMode');agentMode?.add(new Option('Selfdev — improve Tay in this chat'));
  window.TaySelfDev={get active(){return active},get working(){return working},send:sendDevelopment,newChat:async()=>{if(working)return;await apiCall('new');selected=null;await refresh();}};
  window.tayInitialLoad.then(async()=>{
    const pending=sessionGet('tay.selfdev.job');
    if(sessionGet('tay.selfdev.resume')||pending){sessionSet('tay.selfdev.resume',null);window.tayThread.setMode('selfdev');}
    if(pending){setWorking(true);try{await poll(pending);}catch(e){status(e.message);}finally{sessionSet('tay.selfdev.job',null);setWorking(false);}}
  });
})();
