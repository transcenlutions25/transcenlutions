/* Presentation only: no identity, provider, permission or data synchronization. */
(function () {
  'use strict';
  let projectsHidden = false;
  let contextOpen = false;
  const drafts = new Map();
  const composerProjects = new WeakMap();
  let workspaceGeneration = 0;
  let previousComposer = null;
  let previousProject = null;
  let observedRoot = null;
  let rootObserver = null;
  let cleanupPresence = null;
  let cleanupLayout = null;
  let cleanupTools = null;
  let cleanupProposals = null;
  function clearDrafts() {
    cleanupProposals?.();cleanupProposals=null;window.TayProposalReview?.clear();
    cleanupTools?.();cleanupTools=null;window.TayConversationTools?.clear();
    cleanupLayout?.();cleanupLayout=null;
    cleanupPresence?.();
    cleanupPresence = null;
    workspaceGeneration++;
    drafts.clear();
    previousComposer = null;
    previousProject = null;
    projectsHidden = false;
    contextOpen = false;
  }
  const capabilities = [
    ['Projects & conversation', 'Available', 'Shared cloud projects and messages. Use Projects to select a workspace.'],
    ['History & memory', 'Partial', 'Messages reload for the selected project. The current cloud API has no archive-selection route. Memory editing is not exposed here. Mac private history is separate.'],
    ['Files, artifacts & writing blocks', 'Local writing drafts available', 'Use Edit as writing on a loaded message for a local prose draft. Durable artifact/file storage and product-library access are not connected here.'],
    ['Approvals & Administration', 'Not exposed here', 'Approval review and owner administration are available only in a configured workspace. Owner permissions and approval requirements still apply.'],
    ['Agents, models, Queue & Steer', 'Not exposed here', 'The Mac runtime and consolidated workspace have additional controls. Cloud model availability must be verified separately; a saved message does not prove model execution.'],
    ['Tay presence & voice', 'Standing sway only · voice inactive', 'One approved full-body cutout with an optional gentle standing sway and a pause control. No blink, rig, gesture, speaking or listening animation exists. It is decoration, not live agent activity. Voice setup preferences are saved during onboarding; dictation and read-aloud are not active here.'],
    ['Mac tools & browser', 'Restricted reference preview · Mac tools separate', 'The reference preview cannot read or control external sites. Project-folder access, coding tools, Unity/Unreal, self-development and local voice require the configured Mac service. This browser has no Mac OS access.'],
    ['Scheduled, Plugins & business modules', 'Not exposed here', 'Preserved repository modules have separate readiness and connection states. No background execution, sending, payment or publishing is enabled by this panel.'],
  ];
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function mount(root, projectId = null) {
    const shell = root.querySelector('.shell');
    if (!shell || shell.dataset.presentationMounted) return;
    shell.dataset.presentationMounted = 'true';
    cleanupProposals?.();cleanupProposals=null;
    cleanupTools?.();cleanupTools=null;
    cleanupLayout?.();cleanupLayout=null;
    cleanupPresence?.();
    cleanupPresence = null;
    root.classList.add('workspace-active');
    // Only retain drafts in this page's current workspace lifetime. An auth or
    // recovery screen removes the shell and discards every in-memory draft.
    if (root !== observedRoot) {
      rootObserver?.disconnect();
      clearDrafts();
      observedRoot = root;
      rootObserver = new MutationObserver(() => {
        if (!root.querySelector('.shell')) clearDrafts();
      });
      rootObserver.observe(root, { childList: true });
    }
    if (previousComposer && previousProject) drafts.set(previousProject, previousComposer.value);
    const projectChanged = previousProject !== null && previousProject !== projectId;
    const sidebar = shell.querySelector('.sidebar');
    const topbar = shell.querySelector('.topbar');
    // Left-panel cover intentionally uses upper-body framing; other Tay images retain the complete source.
    const cover = element('figure', '', 'workspace-brand-cover');
    const coverImage = element('img');
    coverImage.src = 'assets/Tay-approved-suit-fullbody-transparent-2026-10-17.png';
    coverImage.alt = 'Tay in his canonical ornate suit';
    coverImage.width = 1024;coverImage.height = 1536;coverImage.draggable = false;
    coverImage.onerror = () => { coverImage.hidden = true; };
    const coverPortrait = element('div', '', 'workspace-cover-portrait');
    coverPortrait.append(coverImage);
    cover.append(coverPortrait, element('figcaption', 'Transcenlutions'));
    cover.setAttribute('aria-label', 'Transcenlutions cover');
    sidebar.prepend(cover);
    const identity = element('div', '', 'workspace-identity');
    const portrait = element('img');
    portrait.src = 'assets/Tay-approved-suit-fullbody-transparent-2026-10-17.png';
    portrait.width = 72;
    portrait.height = 108;
    portrait.alt = '';
    portrait.draggable = false;
    portrait.onerror = () => { portrait.hidden = true; };
    identity.append(portrait, element('strong', 'Tay'));
    identity.setAttribute('aria-label', 'Tay');
    topbar.prepend(identity);
    cleanupPresence = window.TayPortraitPresentation?.mount(identity, portrait) || null;
    const history = element('section', '', 'workspace-history');
    history.setAttribute('aria-label', 'Conversation history');
    const archives = element('button', 'Archives · unavailable', 'secondary');
    archives.type = 'button';
    archives.disabled = true;
    archives.setAttribute('aria-describedby', 'workspaceArchiveLimit');
    const archiveLimit = element('p', 'Select a project to reopen its conversation. Choosing older archived conversations is not supported by this cloud client yet.', 'muted');
    archiveLimit.id = 'workspaceArchiveLimit';
    history.append(element('h3', 'History'), archives, archiveLimit);
    sidebar.querySelector('#projects').after(history);
    sidebar.id = 'workspaceProjects';
    sidebar.setAttribute('aria-label', 'Projects');
    const controls = element('div', '', 'workspace-controls');
    const projects = element('button', 'Projects', 'secondary');
    projects.type = 'button';
    projects.setAttribute('aria-controls', sidebar.id);
    const context = element('button', 'Workspace', 'secondary');
    context.type = 'button';
    context.setAttribute('aria-controls', 'workspaceContext');
    controls.append(projects, context);
    topbar.prepend(controls);
    const panel = element('aside', '', 'workspace-context');
    panel.id = 'workspaceContext';
    panel.setAttribute('aria-label', 'Workspace capabilities');
    const close = element('button', 'Close workspace panel', 'secondary');
    close.type = 'button';
    panel.append(close, element('h2', 'Tay workspace'), element('p', 'Cloud client · capability status', 'muted'));
    for (const [name, status, description] of capabilities) {
      const section = element('section');
      section.append(element('h3', name), element('span', status, 'badge'), element('p', description));
      panel.append(section);
    }
    const boundaries = element('p', 'Cloud account data and private Mac files are separate. Opening this panel does not connect services or synchronize private data.', 'muted');
    panel.append(boundaries);
    shell.append(panel);
    const sync = () => {
      sidebar.hidden = projectsHidden;
      panel.hidden = !contextOpen;
      shell.classList.toggle('projects-hidden', projectsHidden);
      shell.classList.toggle('context-open', contextOpen);
      projects.setAttribute('aria-expanded', String(!projectsHidden));
      context.setAttribute('aria-expanded', String(contextOpen));
      cleanupPresence?.setSuspended?.(contextOpen || (!projectsHidden && compact()));
    };
    const compactMedia = window.matchMedia?.('(max-width:760px)');
    const compact = () => window.matchMedia?.('(max-width:760px)').matches === true;
    if (compactMedia?.addEventListener && compactMedia?.removeEventListener) {
      compactMedia.addEventListener('change', sync);
      cleanupLayout = () => compactMedia.removeEventListener('change', sync);
    } else if (compactMedia?.addListener && compactMedia?.removeListener) {
      compactMedia.addListener(sync);
      cleanupLayout = () => compactMedia.removeListener(sync);
    }
    projects.onclick = () => { projectsHidden = !projectsHidden; if (!projectsHidden && compact()) contextOpen = false; sync(); };
    context.onclick = () => { contextOpen = !contextOpen; if (contextOpen && compact()) {projectsHidden = true;const toolbar=shell.querySelector('.conversation-toolbar');if(toolbar)toolbar.open=false;} sync(); if (contextOpen) close.focus(); };
    close.onclick = () => { contextOpen = false; sync(); context.focus(); };
    panel.onkeydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.click(); }
    };
    const composer = shell.querySelector('#message');
    composer.setAttribute('aria-label', 'Message Tay');
    composer.value = drafts.get(projectId) || '';
    previousComposer = composer;
    previousProject = projectId;
    composerProjects.set(composer, { projectId, generation: workspaceGeneration });
    const draftHint = element('p', 'Unsent drafts stay in this tab while you switch projects. They clear when you leave the workspace.', 'workspace-draft-hint');
    draftHint.id = 'workspaceDraftHint';
    composer.setAttribute('aria-describedby', draftHint.id);
    shell.querySelector('.main').append(draftHint);
    shell.querySelector('#messages').setAttribute('aria-label', 'Conversation');
    sync();
    const showPanel=()=>{contextOpen=true;if(compact()){projectsHidden=true;const toolbar=shell.querySelector('.conversation-toolbar');if(toolbar)toolbar.open=false;}sync();};
    cleanupTools=window.TayConversationTools?.mount({shell,panel,projectId,closePanel:()=>{contextOpen=false;sync();},openPanel:showPanel})||null;
    cleanupProposals=window.TayProposalReview?.mount({shell,panel,projectId,openPanel:showPanel})||null;
    if (projectChanged) queueMicrotask(() => {
      if (!shell.isConnected) return;
      const selected = Array.from(shell.querySelectorAll('.project')).find(button => button.dataset.id === projectId);
      if (projectsHidden) composer.focus();
      else selected?.focus();
    });
  }
  function didSend(composer, text) {
    const scope = composerProjects.get(composer);
    if (!scope || scope.generation !== workspaceGeneration) return;
    const projectId = scope.projectId;
    if (drafts.get(projectId)?.trim() === text) drafts.delete(projectId);
  }
  window.TayWorkspacePresentation = { mount, didSend };
}());
