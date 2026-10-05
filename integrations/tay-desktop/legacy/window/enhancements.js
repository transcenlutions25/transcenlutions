(() => {
  let privacy = 'offline';
  const memoryPreferences = new Map();
  let preferencesPersistent = true;
  const storageGet = key => { try { return window.localStorage.getItem(key) ?? memoryPreferences.get(key) ?? null; } catch { preferencesPersistent = false; return memoryPreferences.get(key) ?? null; } };
  const storageSet = (key, value) => { memoryPreferences.set(key, value); try { window.localStorage.setItem(key, value); } catch { preferencesPersistent = false; } };
  const defaults = {accent:'royal', density:'comfortable', motion:'on', workspaceName:'Your personal workspace', startView:'chat', privacy:'offline', threadMode:'chat', agentActivity:'on', contrast:'off', textSize:'15', sendKey:'enter'};
  const preference = key => storageGet('tay.' + key) ?? defaults[key];
  let currentThreadMode = preference('threadMode');
  let setThreadMode = () => {};
  function applyAppearance() {
    document.body.dataset.tayAccent = preference('accent');
    document.body.classList.toggle('tay-compact', preference('density') === 'compact');
    document.body.classList.toggle('tay-reduce-motion', preference('motion') === 'off');
    document.body.classList.toggle('tay-high-contrast', preference('contrast') === 'on');
    document.body.style.setProperty('--chat-text-size', preference('textSize') + 'px');
    const label = document.querySelector('aside > small');
    if (label) label.textContent = preference('workspaceName') || defaults.workspaceName;
    const agentButton = document.querySelector('.tay-top-tools button[title="Show agent activity"]');
    if (agentButton) agentButton.hidden = preference('agentActivity') === 'off';
    if (preference('agentActivity') === 'off') document.querySelector('.tay-agent')?.classList.remove('open');
    const hint = document.querySelector('.composer > p.note');
    if (hint) hint.textContent = 'Tay can make mistakes. ' + (preference('sendKey') === 'command' ? 'Command+Enter to send · Enter for a new line.' : 'Enter to send · Shift+Enter for a new line.');
  }
  function openStartView() {
    const name = preference('startView');
    if (name === 'chat') return;
    const section = [...document.querySelectorAll('details.nav-section')].find(x => x.querySelector('summary')?.textContent.trim().toLowerCase() === name);
    if (section) { section.open = true; section.querySelector('summary').scrollIntoView({block:'nearest'}); }
  }
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    if (typeof input === 'string' && ['/chat', '/record-action', '/selfdev/chat', '/selfdev/state', '/selfdev/new'].includes(input) && init.body) {
      const body = JSON.parse(init.body);
      body.privacy = privacy;
      body.thread_mode = currentThreadMode;
      if (privacy !== 'online') body.mode = 'local';
      init = {...init, body: JSON.stringify(body)};
    }
    return originalFetch(input, init);
  };
  const header = document.querySelector('header');
  if (header) {
    const modes = document.createElement('span');
    modes.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap';
    [['offline','Offline'],['online','Online'],['incognito','Incognito']].forEach(([value,label]) => {
      const b = document.createElement('button'); b.textContent = label; b.dataset.privacy = value; b.style.padding = '6px 9px';
      b.onclick = () => { if (window.TaySelfDev?.working) return status('Wait for the current development step.'); privacy = value; modes.querySelectorAll('button').forEach(x => { x.style.opacity = x.dataset.privacy === value ? '1' : '.55'; x.setAttribute('aria-pressed', String(x.dataset.privacy === value)); });
        const provider = document.getElementById('mode');
        const quick = document.getElementById('quickMode');
        if (provider && quick) {
          if (value !== 'online') provider.value = quick.value = 'local';
          else if (provider.value === 'local') provider.value = quick.value = 'free';
          quick.disabled = value !== 'online';
        }
        const offlineBox = document.getElementById('offlineToggle'); if (offlineBox) offlineBox.checked = value !== 'online';
        const labelNode = document.getElementById('modeLabel');
        if (labelNode) labelNode.textContent = value === 'offline' ? 'Offline · local only' : value === 'online' ? 'Online · approved providers' : 'Incognito · no local persistence';
        if (value === 'incognito' && document.getElementById('mode')) document.getElementById('mode').value = 'local';
        window.dispatchEvent(new CustomEvent('tay-privacy-change', {detail:value}));
      };
      modes.append(b);
    });
    modes.className = 'tay-privacy-modes';
    document.querySelector('.tay-workspace-toggle')?.after(modes);
    const savedPrivacy = storageGet('tay.privacy');
    (modes.querySelector(`button[data-privacy="${savedPrivacy}"]`) || modes.firstChild).click();
    const offlineLabel = document.querySelector('.tay-workspace-toggle');
    if (offlineLabel) offlineLabel.onchange = () => modes.querySelector(`button[data-privacy="${document.getElementById('offlineToggle').checked ? 'offline' : 'online'}"]`).click();
  }
  // The folder picker is a tool context, not proof of thread membership.
  // Keep the header to the current conversation title and connection status.
  const headerTitle = document.getElementById('projectName');
  document.getElementById('threadContext')?.remove();
  const syncHeaderContext = () => {
    if (!headerTitle) return;
    const firstUser = [...document.querySelectorAll('#messages .msg.user > div:nth-child(2)')]
      .map(x => x.textContent.trim()).find(Boolean);
    const title = firstUser ? (firstUser.length > 48 ? firstUser.slice(0, 48).trimEnd() + '…' : firstUser) : 'New conversation';
    if (headerTitle.textContent !== title) headerTitle.textContent = title;
  };
  if (headerTitle) new MutationObserver(syncHeaderContext).observe(headerTitle, {childList:true, characterData:true});
  const messageSurface = document.getElementById('messages');
  if (messageSurface) new MutationObserver(syncHeaderContext).observe(messageSurface, {childList:true, subtree:true, characterData:true});
  syncHeaderContext();
  // Preview opens a small, reviewable view of the active Tay surface.
  const topTools = header?.querySelector('.tay-top-tools');
  if (topTools && !document.getElementById('previewButton')) {
    const previewButton = document.createElement('button'); previewButton.id = 'previewButton'; previewButton.className = 'tay-glass-icon'; previewButton.textContent = '◌ Preview'; previewButton.title = 'Preview the active conversation';
    const preview = document.createElement('section'); preview.id = 'tayPreview'; preview.className = 'tay-preview';
    preview.innerHTML = '<div class="tay-preview-head"><div><h3>Preview</h3><div class="agent-sub">Active Tay Command surface</div></div><button id="tayPreviewClose">Close</button></div><div class="tay-preview-stage"><span class="badge">TAY COMMAND</span><strong id="tayPreviewTitle">New conversation</strong><span id="tayPreviewCount">0 messages</span></div><div class="settings-actions"><button id="tayPreviewOpen">Open in browser panel</button></div>';
    topTools.insertBefore(previewButton, topTools.querySelector('button') || null); document.querySelector('main')?.append(preview);
    const syncPreview = () => { const title = document.getElementById('tayPreviewTitle'); const count = document.getElementById('tayPreviewCount'); if (title) title.textContent = headerTitle?.textContent || 'New conversation'; if (count) count.textContent = (document.querySelectorAll('#messages .msg').length || 0) + ' messages'; };
    previewButton.onclick = () => { syncPreview(); preview.classList.toggle('open'); };
    document.getElementById('tayPreviewClose').onclick = () => preview.classList.remove('open');
    document.getElementById('tayPreviewOpen').onclick = () => { const url = document.getElementById('tayBrowserUrl'); if (url) { url.value = location.href; document.getElementById('tayBrowserGo')?.click(); document.querySelector('.tay-browser')?.classList.add('open'); } preview.classList.remove('open'); };
    if (messageSurface) new MutationObserver(syncPreview).observe(messageSurface, {childList:true, subtree:true});
  }
  // Compact Chat / Plan / Execute switch, kept in sync with the Agent panel.
  if (topTools && !document.getElementById('threadModeToggle')) {
    const modeToggle = document.createElement('div'); modeToggle.id = 'threadModeToggle'; modeToggle.className = 'tay-mode-toggle'; modeToggle.setAttribute('aria-label', 'Thread mode');
    modeToggle.innerHTML = '<span class="tay-mode-label">Mode</span><button data-thread-mode="chat">Chat</button><button data-thread-mode="plan">Plan</button><button data-thread-mode="execute">Execute</button><button data-thread-mode="selfdev" title="Improve Tay in this chat">Self-dev</button>';
    topTools.insertBefore(modeToggle, document.getElementById('previewButton') || topTools.querySelector('button') || null);
    const agentMode = document.getElementById('threadMode');
    setThreadMode = (value, announce = false) => {
      let key = String(value || 'chat').toLowerCase().split(/\s|—/)[0];
      if (!['chat','plan','execute','selfdev'].includes(key)) key = 'chat';
      if (window.TaySelfDev?.working) { status('Wait for this development step to finish.'); return; }
      currentThreadMode = key;
      modeToggle.querySelectorAll('button[data-thread-mode]').forEach(button => { const active = button.dataset.threadMode === key; button.classList.toggle('active', active); button.setAttribute('aria-pressed', active ? 'true' : 'false'); });
      if (agentMode) {
        const option = [...agentMode.options].find(option => option.textContent.toLowerCase().startsWith(key));
        if (option) agentMode.value = option.value;
      }
      if (announce) status(key === 'execute' ? 'Execute prepares a coding handoff. Use Coding tools to run changes.' : 'Thread mode: ' + key[0].toUpperCase() + key.slice(1));
      const note = document.getElementById('threadModeNote');
      if (note) { note.hidden = key !== 'execute'; }
      window.dispatchEvent(new CustomEvent('tay-mode-change', {detail:key}));
    };
    modeToggle.querySelectorAll('button[data-thread-mode]').forEach(button => button.onclick = () => { setThreadMode(button.dataset.threadMode, true); });
    agentMode?.addEventListener('change', () => { const key = agentMode.selectedOptions[0]?.textContent.toLowerCase().split(/\s|—/)[0] || 'chat'; setThreadMode(key); });
    const note = document.createElement('span'); note.id = 'threadModeNote'; note.className = 'note'; note.hidden = true; note.textContent = 'Execution runs through Coding tools.';
    modeToggle.after(note);
    setThreadMode(preference('threadMode'));
    window.tayThread = {setMode:setThreadMode, getMode:()=>currentThreadMode, getPrivacy:()=>privacy};
    document.getElementById('new')?.addEventListener('click', () => { if (currentThreadMode !== 'selfdev') setThreadMode(preference('threadMode')); });
    document.getElementById('project')?.addEventListener('change', () => setThreadMode(preference('threadMode')));
    document.querySelector('[data-add="plan"]')?.addEventListener('click', () => setThreadMode('plan', true));
  }
  const workspace = document.querySelector('aside');
  if (workspace) {
    [...workspace.querySelectorAll('label')].filter(x=>x.textContent.trim()==='WORKSPACE').forEach(x=>x.remove());
    const b = document.createElement('button'); b.id = 'selfDevButton'; b.textContent = 'Self-development'; b.onclick = () => { setThreadMode('selfdev'); document.getElementById('prompt')?.focus(); };
    b.style.marginTop = '10px'; const toolsButton=workspace.querySelector('#tools'); const toolsParent=toolsButton?.parentElement||workspace; toolsParent.insertBefore(b, toolsButton||null);
    const navArea=(title,open=false)=>{const d=document.createElement('details');d.className='nav-section';d.open=open;const s=document.createElement('summary');s.textContent=title;d.append(s);const c=document.createElement('div');c.className='nav-content';d.append(c);return [d,c]};
    const navButton=(label,handler)=>{const x=document.createElement('button');x.textContent=label;x.onclick=handler;x.style.cssText='display:block;width:100%;margin:4px 0;text-align:left';return x};
    const [scheduled,sc]=navArea('Scheduled');sc.append(navButton('＋ New scheduled task',()=>status('Scheduled tasks need a time, target, and approved action.')));
    const [plugins,pl]=navArea('Plugins');pl.append(navButton('Connections & voice',()=>document.getElementById('connections')?.click()),navButton('Develop Tay',()=>b.click()));
    const [explore,ex]=navArea('Explore');ex.append(navButton('Affiliate campaigns',()=>status('Affiliate campaign workspace is the current focus.')),navButton('Landing pages',()=>status('Landing-page builder is staged next.')),navButton('Revenue analytics',()=>status('Analytics appears when campaign tracking is connected.')));
    const [pinned,pinc]=navArea('Pinned');pinc.append(navButton('Current project',()=>document.getElementById('project')?.focus()));
    const [recent,rc]=navArea('Recent');rc.append(navButton('Current conversation (autosaved)',()=>document.getElementById('prompt')?.focus()),navButton('Conversation history',()=>document.getElementById('historyButton')?.click()));
    recent.addEventListener('toggle',async()=>{if(!recent.open)return;try{const d=await api('/archives',{project:document.getElementById('project')?.value});d.items.slice(0,8).forEach(item=>{if([...rc.querySelectorAll('button')].some(x=>x.dataset.thread===item.id))return;const b=navButton('Saved · '+new Date(item.date*1000).toLocaleString(),()=>document.getElementById('historyButton')?.click());b.dataset.thread=item.id;rc.append(b)})}catch(e){status('Recent threads unavailable: '+e.message)}});
    const projectSection = [...workspace.querySelectorAll('details.nav-section')].find(x => x.querySelector('summary')?.textContent.trim() === 'Projects');
    const workspaceSection = [...workspace.querySelectorAll('details.nav-section')].find(x => x.querySelector('summary')?.textContent.trim() === 'Workspace');
    const projectContent = projectSection?.querySelector('.nav-content');
    if (projectContent && workspaceSection && workspaceSection.parentElement !== projectContent) projectContent.append(workspaceSection);
    const firstSection = [...workspace.children].find(x => x.classList?.contains('nav-section'));
    const navStack = document.createElement('div'); navStack.className = 'tay-nav-stack';
    if (firstSection) workspace.insertBefore(navStack, firstSection); else workspace.append(navStack);
    [pinned, projectSection, scheduled, plugins, explore, recent].filter(Boolean).forEach(x => navStack.append(x));
    [...workspace.querySelectorAll('details.nav-section')].forEach(section => {
      const summary = section.firstElementChild; if (!summary || summary.tagName !== 'SUMMARY' || section.dataset.tayCollapseBound) return;
      const key = 'tay.nav.' + summary.textContent.trim().toLowerCase().replace(/\s+/g, '-'); section.dataset.tayCollapseBound = '1';
      const saved = storageGet(key); if (saved !== null) section.open = saved === 'open';
      summary.setAttribute('role', 'button'); summary.setAttribute('aria-expanded', section.open ? 'true' : 'false');
      section.addEventListener('toggle', () => { summary.setAttribute('aria-expanded', section.open ? 'true' : 'false'); storageSet(key, section.open ? 'open' : 'closed'); });
    });
    const bottom=workspace.querySelector('.bottom');if(bottom)workspace.append(bottom);
    // Each preference is applied immediately and restored on the next load.
    const ensureSettings = () => {
      let d = document.getElementById('taySettings');
      if (d) return d;
      d = document.createElement('dialog'); d.id = 'taySettings'; d.setAttribute('aria-labelledby','taySettingsTitle');
      d.innerHTML = `<div class="tay-settings-heading"><div><h2 id="taySettingsTitle">Settings</h2><p class="note">Make Tay feel like your workspace.</p></div><button id="taySettingsClose" aria-label="Close settings">×</button></div>
        <div class="tay-settings-layout"><nav class="tay-settings-nav" aria-label="Settings categories"></nav><div class="tay-settings-content">
        <section data-settings-section="appearance"><h3>Appearance</h3>
          <label for="tayAccent">Materials & colors</label><select id="tayAccent" data-pref="accent"><option value="royal">Royal gold & violet</option><option value="midnight">Midnight glass</option></select>
          <label for="tayDensity">Interface density</label><select id="tayDensity" data-pref="density"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select>
          <label for="tayTextSize">Chat text size</label><select id="tayTextSize" data-pref="textSize"><option value="14">Small</option><option value="15">Standard</option><option value="18">Large</option></select>
          <label class="tay-setting-check"><input type="checkbox" id="tayMotion" data-pref="motion"> Animated background & logo</label>
          <label class="tay-setting-check"><input type="checkbox" id="tayHighContrast" data-pref="contrast"> Higher contrast</label>
          <p class="note">Your Mac’s reduced-motion preference also applies.</p>
        </section>
        <section data-settings-section="chat" hidden><h3>Chat & modes</h3>
          <label for="tayThreadMode">Default mode for new conversations</label><select id="tayThreadMode" data-pref="threadMode"><option value="chat">Chat — discuss and draft</option><option value="plan">Plan — outline steps and checks</option><option value="execute">Execute — prepare a coding handoff</option></select>
          <p class="note">The small top-bar toggle changes the current conversation. This setting chooses how new conversations start.</p>
          <label for="taySendKey">Send a message with</label><select id="taySendKey" data-pref="sendKey"><option value="enter">Enter (Shift+Enter for a new line)</option><option value="command">Command+Enter (Enter for a new line)</option></select>
          <label class="tay-setting-check"><input type="checkbox" id="tayAgentActivity" data-pref="agentActivity"> Show the Agent panel button</label>
          <label for="tayApproval">Execution & approvals</label><select id="tayApproval" disabled><option>Managed in the connected coding tool</option></select>
          <p class="note">Self-dev prepares real interface edits in this chat, with preview, apply, and undo. General command execution happens in Coding tools.</p>
          <button id="tayCodingTools">Open Coding tools</button>
        </section>
        <section data-settings-section="workspace" hidden><h3>Workspace</h3>
          <label for="tayWorkspaceName">Workspace label</label><input id="tayWorkspaceName" data-pref="workspaceName" maxlength="60">
          <label for="tayStartView">Open to</label><select id="tayStartView" data-pref="startView"><option value="chat">Current conversation</option><option value="projects">Projects</option><option value="recent">Recent</option><option value="explore">Explore</option></select>
          <p class="note">Section arrows expand or collapse Pinned, Projects, Workspace, Scheduled, Plugins, Explore, and Recent. Tay remembers each section.</p>
          <div class="settings-actions"><button id="tayExpandAll">Expand all sections</button><button id="tayCollapseAll">Collapse all sections</button></div>
        </section>
        <section data-settings-section="privacy" hidden><h3>Privacy & data</h3>
          <label for="tayPrivacy">Default connection mode</label><select id="tayPrivacy" data-pref="privacy"><option value="offline">Offline · Ollama on this Mac</option><option value="online">Online · selected provider</option><option value="incognito">Incognito · local model, no chat history</option></select>
          <p class="note">Normal messages and replies save automatically on this Mac. Incognito chat messages and replies are excluded from that history. Downloads and actions you explicitly request remain separate.</p>
          <p class="note">Online chat sends your message, recent conversation context, and attached files to your chosen provider. API keys stay in window memory and clear when it closes.</p>
          <div class="settings-actions"><button id="tayExport">Export current conversation</button><button id="tayHistory">Conversation history</button></div>
        </section>
        <section data-settings-section="connections" hidden><h3>Voice & connections</h3>
          <p class="note">Choose your model provider, playback voice, and microphone behavior using the connected controls.</p>
          <div class="tay-settings-links"><button id="tayConnections">Models & voice playback</button><button id="tayMicrophone">Microphone settings</button><button id="tayGameTools">Game development tools</button></div>
          <p class="note">The microphone starts only when pressed. Browser transcription may use an online service and requires your opt-in. Voice identity and offline transcription are not connected yet.</p>
        </section>
        <section data-settings-section="selfdev" hidden><h3>Self-development</h3><p class="note">Describe a correction in the existing chat. Tay can read and edit his interface: layout, styling, wording, and chat controls.</p><p class="note">Changes start as drafts. Review an isolated preview, apply with a recovery copy, or undo. JavaScript syntax is checked; behavior still needs review. Server code, installations, and other projects use Coding tools.</p><p class="note">Offline and Incognito use the local model. Online sends your request and relevant interface source to your selected provider. Applying in Incognito still writes files and a recovery copy.</p><button id="tayStartSelfDev">Develop Tay in chat</button><p><a href="/selfdev/recovery" target="_blank" rel="noopener">Open independent recovery page</a></p></section>
        </div></div><div class="tay-settings-footer"><span id="taySettingsSaved" role="status" class="note"></span><button id="tayResetPreferences">Restore interface defaults</button><button id="taySettingsDone">Done</button></div>`;
      document.body.append(d);
      const categories = [['appearance','Appearance'],['chat','Chat & modes'],['workspace','Workspace'],['privacy','Privacy & data'],['connections','Voice & connections'],['selfdev','Self-development']];
      const showCategory = key => {
        d.querySelectorAll('[data-settings-section]').forEach(x => x.hidden = x.dataset.settingsSection !== key);
        d.querySelectorAll('[data-settings-category]').forEach(x => x.setAttribute('aria-pressed',String(x.dataset.settingsCategory === key)));
      };
      categories.forEach(([key,name]) => {
        const button = document.createElement('button'); button.dataset.settingsCategory = key; button.textContent = name; button.onclick = () => showCategory(key);
        d.querySelector('.tay-settings-nav').append(button);
      });
      d.refreshPreferences = () => {
        d.querySelectorAll('[data-pref]').forEach(input => { if (input.type === 'checkbox') input.checked = preference(input.dataset.pref) === 'on'; else input.value = preference(input.dataset.pref); });
      };
      const savedNote = () => { d.querySelector('#taySettingsSaved').textContent = preferencesPersistent ? 'Preferences saved in this browser.' : 'Preferences apply to this window; browser storage is unavailable.'; };
      d.querySelectorAll('[data-pref]').forEach(input => input.addEventListener('change', () => {
        const key = input.dataset.pref;
        const value = input.type === 'checkbox' ? (input.checked ? 'on' : 'off') : input.value.trim() || defaults[key];
        storageSet('tay.' + key, value); applyAppearance();
        if (key === 'threadMode') setThreadMode(value);
        if (key === 'privacy') document.querySelector(`button[data-privacy="${value}"]`)?.click();
        if (key === 'startView') openStartView();
        savedNote();
      }));
      const close = () => d.close();
      d.querySelector('#taySettingsDone').onclick = close; d.querySelector('#taySettingsClose').onclick = close;
      for (const [source,target] of [['tayConnections','connections'],['tayMicrophone','micOptions'],['tayGameTools','engines'],['tayCodingTools','tools'],['tayHistory','historyButton']]) {
        d.querySelector('#' + source).onclick = () => { d.close(); document.getElementById(target)?.click(); };
      }
      d.querySelector('#tayExport').onclick = () => document.getElementById('exportChat')?.click();
      d.querySelector('#tayStartSelfDev').onclick = () => { d.close(); setThreadMode('selfdev'); };
      d.querySelector('#tayExpandAll').onclick = () => workspace.querySelectorAll('details.nav-section').forEach(x => x.open = true);
      d.querySelector('#tayCollapseAll').onclick = () => workspace.querySelectorAll('details.nav-section').forEach(x => x.open = false);
      d.querySelector('#tayResetPreferences').onclick = () => {
        Object.entries(defaults).forEach(([key,value]) => storageSet('tay.' + key,value));
        applyAppearance(); setThreadMode(defaults.threadMode); document.querySelector('button[data-privacy="offline"]')?.click();
        d.refreshPreferences(); savedNote();
      };
      d.refreshPreferences(); showCategory('appearance'); savedNote();
      return d;
    };
    const workspaceContent = workspaceSection?.querySelector('.nav-content');
    if (workspaceContent && !document.getElementById('settingsButton')) {
      const settingsButton = document.createElement('button'); settingsButton.id = 'settingsButton'; settingsButton.textContent = 'Settings'; settingsButton.title = 'Tay Command settings';
      settingsButton.onclick = () => { const d = ensureSettings(); d.refreshPreferences(); d.showModal(); };
      const footer = document.createElement('div'); footer.className = 'tay-sidebar-footer'; footer.append(settingsButton); workspace.append(footer);
    }
    const add=document.createElement('button');add.textContent='＋';add.title='Add';add.setAttribute('aria-label','Add');add.style.cssText='position:absolute;top:48px;right:18px;width:38px;padding:8px 0;text-align:center';const addMenu=document.createElement('div');addMenu.style.cssText='display:none;position:absolute;z-index:30;top:88px;right:16px;width:220px;padding:10px;border:1px solid var(--edge);border-radius:14px;background:linear-gradient(145deg,#32203e,#100c16);box-shadow:0 18px 60px #000b';[['Files and folders',()=>document.getElementById('add')?.click()],['Work in a project',()=>document.getElementById('project')?.focus()],['Scheduled task',()=>scheduled.open=true],['Plugin / skill',()=>plugins.open=true],['Explore Tay',()=>explore.open=true]].forEach(([label,fn])=>addMenu.append(navButton(label,()=>{fn();addMenu.style.display='none'})));workspace.style.position='relative';workspace.append(add,addMenu);add.onclick=()=>addMenu.style.display=addMenu.style.display==='none'?'block':'none';
  }
  const messages = document.getElementById('messages');
  if (messages) {
    const showScope = () => { const welcome = messages.querySelector('.welcome'); if (!welcome || welcome.querySelector('.scope-card')) return; const card = document.createElement('section'); card.className = 'scope-card'; card.style.cssText = 'border:1px solid rgba(225,193,128,.38);border-radius:14px;padding:16px;margin-top:18px;background:linear-gradient(145deg,#47255a66,#1f1829cc)'; card.innerHTML = '<strong>TRANSCENLUTIONS COMMAND</strong><p class="note">Tay connects revenue, pages, workflows, skills, plugins, projects, voice, and game development from one workspace.</p><p class="note">Current focus: one-URL affiliate campaigns. Future layers: autonomous agents, publishing, social connectors, and shared worlds.</p>'; welcome.append(card); };
    new MutationObserver(showScope).observe(messages, {childList:true,subtree:true}); showScope();
  }
  applyAppearance();
  openStartView();
  const promptBox = document.getElementById('prompt');
  if (promptBox) promptBox.onkeydown = event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    const shouldSend = preference('sendKey') === 'command' ? (event.metaKey || event.ctrlKey) : !event.shiftKey;
    if (shouldSend) { event.preventDefault(); document.getElementById('send').click(); }
  };
  const micButton = document.getElementById('mic');
  if (micButton) {
    const svg = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';
    const updateMicIcon = () => {
      const active = micButton.getAttribute('aria-pressed') === 'true';
      const icon = active ? '<span aria-hidden="true">■</span>' : svg;
      if (active ? micButton.textContent !== '■' : !micButton.querySelector('svg')) micButton.innerHTML = icon;
      const label = active ? 'Stop microphone' : 'Microphone';
      micButton.setAttribute('aria-label',label); micButton.title = label;
    };
    updateMicIcon();
    new MutationObserver(updateMicIcon).observe(micButton,{childList:true,attributes:true,attributeFilter:['aria-pressed']});
  }
})();
