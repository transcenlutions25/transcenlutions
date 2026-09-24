/* Extend the existing composer; all accepted work is owned by the server. */
(() => {
  const byId = id => document.getElementById(id);
  const legacySend = send, legacyLoad = load, legacyNew = byId('new').onclick;
  let state = null, project = '', selectedSession = '', epoch = 0, submitting = false;
  let intent = 'queue', steerTarget = null, legacyNodes = [], lastTranscript = '', lastBoard = '';
  let requestDraft = null;
  let readVersion = 0, polling = false, mutating = 0, mutationTail = Promise.resolve();
  async function change(path, data) {
    mutating++; readVersion++;
    const request = mutationTail.then(() => api(path, data));
    mutationTail = request.catch(() => {});
    try { return await request; } finally { mutating--; }
  }
  const el = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  const button = (text, fn, label) => {
    const b = el('button', text); b.type = 'button'; b.onclick = fn;
    if (label) b.setAttribute('aria-label', label);
    return b;
  };
  const terminal = item => ['completed','failed','cancelled'].includes(item.status);
  const usable = () => !window.TaySelfDev?.active && window.tayThread?.getPrivacy() !== 'incognito';
  const controls = el('section', '', 'tay-queue-controls');
  controls.setAttribute('aria-label', 'Command queue controls');
  const agentLabel = el('label', 'Work with '), agent = el('select');
  agent.id = 'queueAgent'; agent.setAttribute('aria-label', 'Agent assignment');
  [['tay','Tay'],['dawn','Dawn'],['kj','KJ · Ascended Forge']].forEach(([id,name]) => agent.add(new Option(name,id)));
  agentLabel.append(agent);
  const queueButton = button('Queue', () => choose('queue'));
  const steerButton = button('Steer', () => choose('steer'));
  const choose = value => {
    const active = state?.items.find(x => x.status === 'active');
    if (value === 'steer' && !active) return announce('There is no active objective to steer.');
    intent = value; steerTarget = value === 'steer' ? active.id : null;
    syncControls(); byId('prompt').focus();
  };
  const more = el('details'), moreSummary = el('summary', 'Options');
  const dependency = el('select'); dependency.id = 'queueDependency'; dependency.setAttribute('aria-label', 'Start after objective');
  dependency.add(new Option('No dependency', ''));
  const conversation = el('select'); conversation.id = 'queueConversation'; conversation.setAttribute('aria-label', 'Saved command conversation');
  conversation.onchange = async () => { selectedSession = conversation.value; epoch++; lastTranscript = ''; await refresh(); };
  more.append(moreSummary, el('label','Start after'), dependency, el('label','Saved command conversations'), conversation);
  controls.append(agentLabel, queueButton, steerButton, more);
  const notice = el('p', '', 'tay-queue-notice'); notice.id = 'queueNotice'; notice.setAttribute('role','status');
  const board = el('section', '', 'tay-queue-board'); board.id = 'commandQueue'; board.setAttribute('aria-label','Command queue');
  byId('status').after(controls, notice, board);
  function announce(text) { notice.textContent = text; }
  function syncControls() {
    const enabled = usable();
    controls.hidden = board.hidden = notice.hidden = !enabled;
    if (!enabled) return;
    const active = state?.items.some(x => x.status === 'active');
    queueButton.setAttribute('aria-pressed', String(intent === 'queue'));
    steerButton.setAttribute('aria-pressed', String(intent === 'steer'));
    steerButton.disabled = !active;
    byId('send').disabled = submitting;
    byId('send').textContent = intent === 'steer' ? 'Steer ↑' : active ? 'Queue ↑' : 'Send ↑';
  }
  function settings() {
    const privacy = window.tayThread?.getPrivacy() || 'offline';
    return {mode: privacy === 'online' ? byId('mode').value : 'local',
      model: privacy === 'online' ? byId('model').value : '', privacy,
      thread_mode: window.tayThread?.getMode() || 'chat', files: [...files],
      key: byId('key').value, paid: byId('paid').checked};
  }
  async function command(item, operation, extra = {}) {
    if (!state) return;
    const guard = epoch, scope = project, session = state.session_id;
    try {
      const result = await change('/runtime/command', {project: scope, session_id: session, id: item.id,
        operation, ...extra, key: byId('key').value, paid: byId('paid').checked});
      if (guard === epoch) {
        apply(result);
        announce(item.status === 'active' && ['pause','cancel','steer'].includes(operation)
          ? 'Request saved. It takes effect after the current model response.' : 'Queue updated.');
      }
    } catch (error) { if (guard === epoch) announce(error.message); }
  }
  function card(item, pending) {
    const article = el('article', '', 'tay-queue-item'); article.dataset.objective = item.id;
    const heading = el('div', '', 'tay-queue-item-title');
    heading.append(el('strong', item.payload.message), el('span', item.payload.agent_id.toUpperCase() + ' · ' + item.status));
    article.append(heading);
    const detail = item.progress || item.error || item.blocked_reason;
    if (detail) article.append(el('p', detail, 'tay-queue-detail'));
    const actions = el('div', '', 'tay-queue-actions');
    if (item.status === 'queued') {
      actions.append(button('First', () => command(item,'prioritize'), 'Prioritize ' + item.payload.message));
      const index = pending.findIndex(x => x.id === item.id);
      if (index > 0) actions.append(button('↑', () => command(item,'move',{before_id:pending[index-1].id}), 'Move up ' + item.payload.message));
    }
    if (['queued','paused','failed'].includes(item.status)) {
      actions.append(button('Edit', () => {
        const text = window.prompt('Edit this objective', item.payload.message);
        if (text !== null) command(item,'edit',{text});
      }));
      const assign = el('select'); assign.setAttribute('aria-label','Assign ' + item.payload.message);
      [['tay','Tay'],['dawn','Dawn'],['kj','KJ']].forEach(([id,name])=>assign.add(new Option(name,id)));
      assign.value = item.payload.agent_id; assign.onchange = () => command(item,'assign',{agent_id:assign.value}); actions.append(assign);
    }
    if (['active','queued'].includes(item.status) && !item.pending_operation) actions.append(button('Pause', () => command(item,'pause')));
    if (item.status === 'paused') actions.append(button('Resume', () => command(item,'resume')));
    if (item.status === 'failed') actions.append(button('Retry', () => command(item,'retry')));
    if (!['completed','cancelled'].includes(item.status) && item.pending_operation !== 'cancel') actions.append(button('Cancel', () => command(item,'cancel')));
    if (item.status === 'completed') actions.append(button('View result', () => {
      const dialog = el('dialog', '', 'tay-queue-result');
      dialog.append(el('h2', item.payload.agent_id.toUpperCase() + ' result'), el('p',item.result?.answer || ''), button('Close',()=>dialog.close()));
      dialog.addEventListener('close',()=>dialog.remove()); document.body.append(dialog); dialog.showModal();
    }));
    article.append(actions); return article;
  }
  function renderBoard() {
    const active = state.items.filter(x => x.status === 'active');
    const waiting = state.items.filter(x => x.status === 'queued');
    const paused = state.items.filter(x => x.status === 'paused');
    const history = state.items.filter(terminal);
    const key = JSON.stringify(state.items);
    if (key !== lastBoard) {
      const wasOpen = Object.fromEntries([...board.querySelectorAll('details')].map(d=>[d.dataset.section,d.open]));
      const focused = document.activeElement?.closest('[data-objective]')?.dataset.objective;
      const label = document.activeElement?.textContent;
      board.replaceChildren();
      const summary = el('div', '', 'tay-queue-heading');
      summary.append(el('strong','Command queue'), el('span',waiting.length + ' waiting · ' + paused.length + ' paused · ' + history.length + ' finished'));
      board.append(summary);
      const section = (name, items, collapse, id) => {
        const root = el(collapse ? 'details' : 'div', '', 'tay-queue-section'); root.dataset.section = id;
        if (collapse) { root.open = wasOpen[id] || false; root.append(el('summary', name + ' (' + items.length + ')')); }
        else root.append(el('h3',name));
        const body = el('div', '', 'tay-queue-scroll'); items.forEach(x=>body.append(card(x,waiting)));
        if (!items.length && !collapse) body.append(el('p', name === 'Active' ? 'Ready for your next objective.' : 'Add objectives while Tay works.', 'tay-queue-empty'));
        root.append(body); board.append(root);
      };
      section('Active',active,false,'active'); section('Up next',waiting.slice(0,3),false,'next');
      if (waiting.length > 3) section('Backlog',waiting.slice(3),true,'backlog');
      if (paused.length) section('Paused',paused,true,'paused');
      if (history.length) section('Completed & retry',history.slice().reverse(),true,'history');
      if (focused) [...board.querySelectorAll('[data-objective]')].find(n=>n.dataset.objective===focused)?.querySelectorAll('button').forEach(b=>{if(b.textContent===label)b.focus({preventScroll:true});});
      lastBoard = key;
    }
    const oldDep = dependency.value;
    dependency.replaceChildren(new Option('No dependency',''));
    state.items.filter(x=>x.status !== 'cancelled').forEach(x=>dependency.add(new Option(x.payload.message.slice(0,65), x.id)));
    if ([...dependency.options].some(x=>x.value===oldDep)) dependency.value = oldDep;
    if (JSON.stringify(state.sessions) !== conversation.dataset.list) {
      conversation.replaceChildren();
      state.sessions.forEach((s,i)=>conversation.add(new Option('Conversation ' + (state.sessions.length-i) + ' · ' + new Date(s.created*1000).toLocaleString(),s.id)));
      conversation.dataset.list=JSON.stringify(state.sessions);
    }
    conversation.value = state.session_id;
  }
  function renderTranscript() {
    if (!usable()) return;
    const key = state.session_id + JSON.stringify(state.messages);
    if (key === lastTranscript) return;
    const surface = byId('messages');
    const nearBottom = surface.scrollHeight - surface.scrollTop - surface.clientHeight < 100;
    const oldScroll = surface.scrollTop;
    surface.replaceChildren();
    if (!state.legacy_included && state.session_id === state.sessions.at(-1)?.id) legacyNodes.forEach(n=>surface.append(n));
    if (state.messages.length) surface.querySelector('.welcome')?.remove();
    state.messages.forEach(message=>{
      msg(message.role,message.content);
      if (message.role === 'assistant') surface.lastElementChild.querySelector('.who').textContent = message.agent_id.toUpperCase();
    });
    if (!nearBottom) surface.scrollTop = oldScroll;
    lastTranscript = key;
  }
  function apply(next) { state=next; selectedSession=next.session_id; renderBoard(); renderTranscript(); syncControls(); }
  async function refresh() {
    if (!project || !usable()) { syncControls(); return; }
    if (polling || mutating) return;
    polling=true;
    const guard=epoch, scope=project, version=++readVersion;
    try {
      const next=await api('/runtime/state',{project:scope,session_id:selectedSession || undefined});
      if(guard===epoch && version===readVersion && usable()) apply(next);
    } catch(error) { if(guard===epoch && version===readVersion) announce('Queue unavailable: '+error.message); }
    finally { polling=false; }
  }
  send = async () => {
    if (!usable()) return legacySend();
    const text=byId('prompt').value.trim(); if (!text || submitting) return;
    if (busy) return announce('The earlier chat or Self-dev step is still finishing. Your draft is kept.');
    if (!state) return announce('The queue is reconnecting. Your draft is kept.');
    // Preserve existing command shortcuts only when there is no active work.
    if (intent==='queue' && !state.items.some(x=>x.status==='active') && await shortcut(text)) return;
    stopMic(); submitting=true; syncControls();
    const guard=epoch, session=state.session_id;
    try {
      let next;
      if(intent==='steer') {
        const target=state.items.find(x=>x.id===steerTarget);
        if(!target || target.status!=='active') throw Error('That objective finished. Choose Queue to start another objective.');
        next=await change('/runtime/command',{project,session_id:session,id:target.id,operation:'steer',text});
      } else {
        const captured={project,session_id:session,message:text,agent_id:agent.value,...settings(),depends_on:dependency.value?[dependency.value]:[]};
        const fingerprint=JSON.stringify({...captured,key:undefined});
        if(!requestDraft || requestDraft.fingerprint!==fingerprint) requestDraft={fingerprint,id:crypto.randomUUID()};
        next=await change('/runtime/enqueue',{...captured,request_id:requestDraft.id});
      }
      if(guard===epoch) {
        if(byId('prompt').value.trim()===text) byId('prompt').value='';
        announce(intent==='steer'?'Steering saved. It applies after the current model response.':'Objective saved to the queue.');
        intent='queue'; steerTarget=null; requestDraft=null; apply(next);
      }
    } catch(error) { if(guard===epoch) announce(error.message); }
    finally { submitting=false; syncControls(); }
  };
  byId('send').onclick=()=>send();
  load = async (...args) => {
    const guard=++epoch; state=null; selectedSession=''; lastTranscript=''; lastBoard='';
    await legacyLoad(...args);
    if(guard!==epoch)return;
    project=byId('project').value; legacyNodes=[...byId('messages').childNodes];
    await refresh();
  };
  byId('new').onclick=async()=>{
    if(!usable())return legacyNew();
    if(!project)return;
    const guard=++epoch, scope=project;
    try {
      selectedSession=''; lastTranscript='';
      const next=await change('/runtime/new',{project:scope});
      if(guard===epoch){apply(next); announce('New command conversation. Earlier objectives keep their original context.');}
    } catch(error){if(guard===epoch)announce(error.message);}
  };
  window.addEventListener('tay-privacy-change',()=>{ epoch++; lastTranscript=''; syncControls(); refresh(); });
  window.addEventListener('tay-mode-change',()=>{ lastTranscript=''; setTimeout(()=>{syncControls();refresh();},0); });
  Promise.resolve(window.tayInitialLoad).then(async()=>{
    project=byId('project').value; legacyNodes=[...byId('messages').childNodes]; await refresh();
  });
  setInterval(refresh,1800);
})();
