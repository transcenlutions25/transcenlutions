/* Local presentation of already loaded messages. No history, storage or API access. */
(function () {
  'use strict';
  const writing = new Map();
  let current = null, width = 320;
  const node = (tag, text, cls) => { const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el; };
  function clear() { writing.clear(); current=null; }
  function mount({shell,panel,projectId,openPanel,closePanel}) {
    const state={shell,panel,projectId,openPanel,messages:[]};current=state;
    shell.style.setProperty('--context-width',width+'px');
    const tools=node('div','','conversation-side-tools');
    const paneStatus=node('p','','conversation-status');paneStatus.setAttribute('role','status');paneStatus.setAttribute('aria-live','polite');tools.append(paneStatus);
    const sizeLabel=node('label','Panel width (desktop)');
    const size=node('input');size.type='range';size.min='260';size.max='600';size.step='20';size.value=String(width);size.setAttribute('aria-label','Workspace panel width');
    const sizeValue=node('output',width+' px');
    size.oninput=()=>{width=Number(size.value);shell.style.setProperty('--context-width',width+'px');sizeValue.textContent=width+' px';};
    sizeLabel.append(size,sizeValue);
    const maximize=node('button','Maximize workspace panel','secondary');maximize.type='button';maximize.setAttribute('aria-pressed','false');
    maximize.onclick=()=>{const on=shell.classList.toggle('context-maximized');maximize.textContent=on?'Restore split workspace':'Maximize workspace panel';maximize.setAttribute('aria-pressed',String(on));};
    tools.append(sizeLabel,maximize);
    const browser=node('section');browser.append(node('h3','Reference browser'));
    const form=node('form');const urlLabel=node('label','Reference URL (HTTPS)');const url=node('input');url.type='url';url.required=true;url.placeholder='https://example.com';url.setAttribute('aria-label','Reference URL');urlLabel.append(url);
    const preview=node('button','Preview reference','secondary');preview.type='submit';
    const external=node('a','Open reference in new tab','secondary');external.target='_blank';external.rel='noopener noreferrer';external.hidden=true;
    const browserStatus=node('p','Preview is restricted. Sites may refuse embedding; opening externally uses your normal browser.','muted');browserStatus.setAttribute('role','status');
    function safeURL() {try{const u=new URL(url.value);if(u.protocol!=='https:'||u.username||u.password)return null;return u.href}catch{return null}}
    url.oninput=()=>{const value=safeURL();external.hidden=!value;if(value)external.href=value;else external.removeAttribute('href');};
    let frame=null;
    form.onsubmit=event=>{event.preventDefault();const value=safeURL();if(!value){browserStatus.textContent='Use an HTTPS URL without embedded credentials.';return}frame?.remove();frame=node('iframe');frame.title='Restricted reference preview';frame.setAttribute('sandbox','');frame.referrerPolicy='no-referrer';frame.setAttribute('credentialless','');frame.src=value;browser.append(frame);external.href=value;external.hidden=false;browserStatus.textContent='Preview requested. If the site is blank or refuses embedding, use Open reference in new tab. This panel cannot read or control the site.';};
    form.append(urlLabel,preview,external,browserStatus);browser.append(form);tools.append(browser);
    const editor=node('section');const heading=node('h3','Writing draft');heading.tabIndex=-1;
    const note=node('p','Choose Edit as writing on a loaded message to make an editable prose draft. Edits stay in this tab; reload or sign-out clears them. The original conversation is unchanged.','muted');
    editor.append(heading,note);tools.append(editor);state.editor=editor;state.heading=heading;
    panel.querySelector('h2').after(tools);
    const toolbar=node('details','','conversation-toolbar');toolbar.append(node('summary','Conversation tools'));
    const searchLabel=node('label','Search loaded conversation');const search=node('input');search.type='search';search.setAttribute('aria-label','Search loaded conversation');searchLabel.append(search);
    const status=node('p','','conversation-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const manual=node('textarea');manual.readOnly=true;manual.hidden=true;manual.setAttribute('aria-label','Manual copy text');
    async function copy(text){try{if(!navigator.clipboard?.writeText)throw new Error('unavailable');await navigator.clipboard.writeText(text);if(current!==state||!shell.isConnected)return;status.textContent='Copied current text.';paneStatus.textContent=status.textContent;manual.hidden=true}catch{if(current!==state||!shell.isConnected)return;state.openPanel();const fallback=node('section','','manual-copy');fallback.append(node('p','Clipboard unavailable. Select and copy this text manually.'),manual);panel.querySelector('.manual-copy')?.remove();panel.querySelector('h2').after(fallback);manual.value=text;manual.hidden=false;manual.focus();manual.select();status.textContent='Clipboard unavailable. Select and copy the text below manually.';paneStatus.textContent=status.textContent;}}
    function download(text,name){const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const href=URL.createObjectURL(blob);const a=node('a');a.href=href;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),0);status.textContent='Text export requested.';paneStatus.textContent=status.textContent;}
    state.copy=copy;state.download=download;state.search=search;state.status=status;
    const allText=()=>state.messages.map(m=>m.role.toUpperCase()+':\n'+m.text).join('\n\n');
    const copyAll=node('button','Copy loaded conversation','secondary');copyAll.type='button';copyAll.onclick=()=>copy(allText());
    const exportAll=node('button','Export loaded conversation (.txt)','secondary');exportAll.type='button';exportAll.onclick=()=>download(allText(),'tay-conversation.txt');
    state.filter=()=>{const q=search.value.toLocaleLowerCase();let count=0;for(const m of state.messages){const hit=m.text.toLocaleLowerCase().includes(q);m.bubble.hidden=!hit;if(hit)count++}status.textContent=count+' of '+state.messages.length+' loaded messages shown.';};
    search.oninput=state.filter;
    toolbar.ontoggle=()=>{if(toolbar.open&&window.matchMedia?.('(max-width:760px)').matches)closePanel?.();};
    toolbar.append(searchLabel,copyAll,exportAll,status,manual);shell.querySelector('.topbar').after(toolbar);
    return ()=>{if(current===state)current=null;frame?.remove();};
  }
  function edit(state,message) {
    let entries=writing.get(state.projectId);if(!entries){entries=new Map();writing.set(state.projectId,entries)}
    const key=JSON.stringify([message.index,message.role,message.text]);let entry=entries.get(key);
    if(!entry){entry={versions:[message.text],index:0};entries.set(key,entry)}
    const editor=state.editor;while(editor.children.length>2)editor.lastChild.remove();
    const label=node('label','Editable prose draft');const box=node('textarea');box.setAttribute('aria-label','Editable prose draft');box.value=entry.versions[entry.index];label.append(box);
    const undo=node('button','Undo edit','secondary'),redo=node('button','Redo edit','secondary'),copy=node('button','Copy writing draft','secondary'),exportText=node('button','Export writing draft (.txt)','secondary');
    for(const b of [undo,redo,copy,exportText])b.type='button';
    const sync=()=>{box.value=entry.versions[entry.index];undo.disabled=entry.index===0;redo.disabled=entry.index===entry.versions.length-1;};
    box.oninput=()=>{if(box.value===entry.versions[entry.index])return;entry.versions=entry.versions.slice(0,entry.index+1);entry.versions.push(box.value);if(entry.versions.length>50)entry.versions.shift();entry.index=entry.versions.length-1;undo.disabled=false;redo.disabled=true;};
    undo.onclick=()=>{if(entry.index>0)entry.index--;sync();box.focus()};redo.onclick=()=>{if(entry.index<entry.versions.length-1)entry.index++;sync();box.focus()};
    copy.onclick=()=>state.copy(box.value);exportText.onclick=()=>state.download(box.value,'tay-writing-draft.txt');
    editor.append(label,undo,redo,copy,exportText);sync();state.openPanel();state.heading.focus();
  }
  function decorate(projectId) {
    const state=current;if(!state||state.projectId!==projectId||!state.shell.isConnected)return;
    state.messages=[];
    state.shell.querySelectorAll('#messages .bubble').forEach((bubble,index)=>{
      bubble.querySelector('.loaded-message-actions')?.remove();
      const text=bubble.textContent,role=bubble.classList.contains('user')?'You':'Tay';
      const message={bubble,index,text,role};state.messages.push(message);
      const actions=node('div','','loaded-message-actions');
      const copy=node('button','Copy message','secondary');copy.type='button';copy.onclick=()=>state.copy(text);
      const reuse=node('button','Use in message','secondary');reuse.type='button';reuse.onclick=()=>{const composer=state.shell.querySelector('#message');composer.value=composer.value?composer.value+'\n\n'+text:text;composer.focus();};
      const writingButton=node('button','Edit as writing','secondary');writingButton.type='button';writingButton.onclick=()=>edit(state,message);
      actions.append(copy,reuse,writingButton);if(window.TayProposalReview){const proposal=node('button','Set aside as tool proposal','secondary');proposal.type='button';proposal.onclick=()=>window.TayProposalReview.stageMessage(projectId,text);actions.append(proposal);}bubble.append(actions);
    });state.filter();
  }
  window.TayConversationTools={mount,decorate,clear};
}());
