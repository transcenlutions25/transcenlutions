import { seeded, createGrid, rotatePiece, canPlaceGrid, applyGrid, gridHasMove, createSort, applySort, isSortSolved, SORT_COLORS as SORT_TOKENS, createOrbit, applyOrbit, pipeMask, orbitConnections, createRunner, stepRunner, moveRunner } from './engine.mjs';

const $ = (id) => document.getElementById(id);
const PROGRESS_SLOT = 'transcenlutions.arcade.v1';
const VERSION = 1;
const MAX_PUZZLE_LEVEL = 100;
const COLORS = ['#83aaff', '#bda0f3', '#f0cd85', '#86d7b8', '#f2a5b9', '#a4cddd'];
const SORT_COLORS = COLORS.slice(0,4);
const SYMBOLS = SORT_TOKENS.map(token=>token.symbol);
const COLOR_NAMES = SORT_TOKENS.map(token=>token.label);
const GAMES = {
  grid: { name:'Crown Grid', icon:'▦', tag:'SPACE & STRATEGY', blurb:'Make space. Keep your next move open.', subtitle:'Place pieces. Clear lines. Keep the possibilities open.', note:'Leave yourself a little room.', tip:'Select one of the three pieces, then tap an empty square for its top-left corner. Fill any row or column to clear it. You can rotate a piece before placing it.', help:['Choose a piece from the three-piece tray.','Tap a square on the board to place the piece from that top-left corner. A piece must fit entirely into empty squares.','Fill a row or column to clear it. Clearing several lines together earns a larger bonus.','Rotate freely before placing. Use Undo to take back the last move. Hint highlights a legal placement.','The run ends when none of your remaining pieces fit, even after rotation.'], keys:'Arrow keys move around the board. Enter places a piece. 1, 2, 3 select pieces; R rotates.' },
  sort: { name:'Prism Sort', icon:'◒', tag:'COLOR & CALM', blurb:'Bring a little order to the spectrum.', subtitle:'One color. One symbol. One satisfying pour.', note:'Start with the top layer.', tip:'Tap a tube, then tap where you want to pour. Matching symbols may stack together; an empty tube accepts any color. Give every color its own full tube.', help:['Tap a tube to pick up its top color. Tap a second tube to pour.','Pour into an empty tube or onto the same color and symbol. A tube holds four layers.','All touching top layers pour together until the destination is full.','Complete the level with four full, single-color tubes and two empty tubes.','Undo is always available. Restart restores the same solvable starting level.'], keys:'Tab between tubes, then Enter or Space to select and pour.' },
  orbit: { name:'Orbit Link', icon:'⌘', tag:'CONNECTION & LOGIC', blurb:'Turn the pieces. Let the light through.', subtitle:'A path from the first spark to the last.', note:'Follow the light.', tip:'Turn a pipe to connect its open ends. Gold marks the network powered by START. Connect START to END. Fixed tiles stay in place; the rest can turn.', help:['Gold tiles are connected to START in the top-left corner.','Tap a pipe to turn it one quarter-turn clockwise. Adjacent ends must meet.','Build a continuous connection from START to END in the bottom-right. You do not need to light every tile.','Tiles marked with a small lock are fixed. Undo takes back a rotation.','Hint turns one tile toward a known solution. Every generated board has a solution.'], keys:'Arrow keys move around the board. Enter or Space rotates a pipe.' },
  runner: { name:'Lumen Run', icon:'△', tag:'RHYTHM & REFLEX', blurb:'Find your lane. Follow the light.', subtitle:'Collect the sparks. Keep moving forward.', note:'Look one row ahead.', tip:'Move between three lanes to collect gold sparks and avoid pink barriers. Every barrier row leaves a lane open. You have three shields and can pause at any time.', help:['Tap the left and right controls, press arrow keys, or swipe across the track to change lanes.','Collect gold sparks for 25 bonus points. Distance also adds to your score.','Avoid pink barriers. A collision uses one of your three shields; a short grace period follows each hit.','Choose Relaxed pace for a slower run. Pause stops all movement.','The run ends when your shields run out. Try again for a new personal best.'], keys:'Left / Right or A / D change lanes. Space pauses or resumes.' }
};

const freshStore = () => ({version:VERSION,settings:{sound:false,largeText:true,highContrast:false,reducedMotion:!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches},records:{gridBest:0,runnerBest:0,sortLevel:1,orbitLevel:1,sortComplete:0,orbitComplete:0,completed:0},sessions:{},daily:{}});
function readStore(){
  const base=freshStore();
  try {
    const raw=JSON.parse(localStorage.getItem(PROGRESS_SLOT)||'null');
    if(!raw||raw.version!==VERSION)return base;
    for(const k of Object.keys(base.settings))if(typeof raw.settings?.[k]==='boolean')base.settings[k]=raw.settings[k];
    for(const k of Object.keys(base.records))if(Number.isSafeInteger(raw.records?.[k])&&raw.records[k]>=0&&raw.records[k]<1e9)base.records[k]=raw.records[k];
    for(const kind of ['sort','orbit']){
      const levelKey=kind+'Level',completeKey=kind+'Complete';
      // Earlier saves used 101 as the completion marker for level 100.
      base.records[completeKey]=raw.records?.[completeKey]===1||base.records[levelKey]>MAX_PUZZLE_LEVEL?1:0;
      base.records[levelKey]=Math.min(MAX_PUZZLE_LEVEL,Math.max(1,base.records[levelKey]));
    }
    for(const k of Object.keys(GAMES))if(validState(raw.sessions?.[k],k))base.sessions[k]=restoreState(raw.sessions[k]);
    if(raw.daily&&typeof raw.daily==='object')for(const [k,v]of Object.entries(raw.daily).slice(-90))if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&Number.isSafeInteger(v)&&v>=0&&v<1e9)base.daily[k]=v;
  }catch{/* A blocked or corrupt local store must never prevent play. */}
  return base;
}
function validState(s,kind){
  if(!s||s.kind!==kind||typeof s!=='object'||s.version!==VERSION)return false;
  const finite=(v,min=0,max=1e9)=>Number.isFinite(v)&&v>=min&&v<=max;
  const integer=(v,min=0,max=1e9)=>Number.isSafeInteger(v)&&finite(v,min,max);
  const uint32=v=>integer(v,0,0xffffffff);
  if(!uint32(s.seed))return false;
  if(kind==='grid')return s.size===8&&Array.isArray(s.board)&&s.board.length===64&&s.board.every(v=>integer(v,0,6))&&Array.isArray(s.tray)&&s.tray.length===3&&s.tray.some(Boolean)&&s.tray.every(p=>p===null||(p&&typeof p.id==='string'&&p.id.length<=100&&integer(p.color,1,6)&&Array.isArray(p.cells)&&p.cells.length>0&&p.cells.length<=16&&p.cells.every(c=>Array.isArray(c)&&c.length===2&&c.every(n=>integer(n,0,7)))&&new Set(p.cells.map(c=>c.join(','))).size===p.cells.length))&&integer(s.score)&&integer(s.lines)&&integer(s.combo)&&uint32(s.rng)&&integer(s.turn)&&typeof s.over==='boolean';
  if(kind==='sort')return integer(s.level,1,100)&&integer(s.moves)&&s.capacity===4&&Array.isArray(s.tubes)&&s.tubes.length===6&&s.tubes.every(t=>Array.isArray(t)&&t.length<=4&&t.every(c=>integer(c,0,3)))&&[0,1,2,3].every(c=>s.tubes.flat().filter(v=>v===c).length===4)&&Array.isArray(s.solution)&&s.solution.length<=3000&&s.solution.every(m=>m&&integer(m.from,0,5)&&integer(m.to,0,5)&&m.from!==m.to)&&typeof s.solved==='boolean';
  if(kind==='orbit')return s.size===5&&s.source===0&&s.goal===24&&integer(s.moves)&&integer(s.level,1,100)&&Array.isArray(s.tiles)&&s.tiles.length===25&&s.tiles.every(t=>t&&integer(t.base,0,15)&&integer(t.rotation,0,3)&&typeof t.fixed==='boolean'&&typeof t.blocked==='boolean'&&(!t.blocked||(t.fixed&&t.base===0)))&&s.tiles[0].fixed&&!s.tiles[0].blocked&&s.tiles[24].fixed&&!s.tiles[24].blocked&&Array.isArray(s.solution)&&s.solution.length===25&&s.solution.every(r=>integer(r,0,3))&&typeof s.solved==='boolean';
  if(kind==='runner')return integer(s.lane,0,2)&&integer(s.lives,0,3)&&finite(s.distance)&&finite(s.time)&&integer(s.score)&&uint32(s.rng)&&finite(s.speed,0,100)&&finite(s.spawnIn,-.25,10)&&finite(s.invulnerable,0,5)&&integer(s.energy)&&integer(s.nextEntityId,1)&&integer(s.nextRowId,1)&&typeof s.over==='boolean'&&Array.isArray(s.entities)&&s.entities.length<100&&s.entities.every(e=>e&&['obstacle','energy'].includes(e.type)&&integer(e.id,1)&&integer(e.row,1)&&integer(e.lane,0,2)&&finite(e.z,-10,100));
  return false;
}
function restoreState(saved){
  const restored=JSON.parse(JSON.stringify(saved));restored.lastEvent=null;
  if(restored.kind==='grid')restored.over=!gridHasMove(restored);
  if(restored.kind==='sort'){restored.solved=isSortSolved(restored);restored.colors=SORT_TOKENS.map(token=>({...token}));}
  if(restored.kind==='orbit')Object.assign(restored,orbitConnections(restored));
  if(restored.kind==='runner'){restored.over=restored.lives===0;restored.score=Math.floor(restored.distance)+restored.energy*25;}
  return restored;
}
let store=readStore();
let active=null,state=null,selected=0,rotation=0,history=[],focusCell=0,dailyKey=null,seed=1,sortInitial=null;
let paused=true,runnerStarted=false,relaxed=true,lastFrame=0,frameId=0,gameEndShown=false;
let toastTimer=0,saveWarningShown=false,audioContext=null,modalReturnFocus=null,hintCells=[];
const clone=s=>JSON.parse(JSON.stringify(s));
const fmt=n=>Math.floor(n||0).toLocaleString();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const newSeed=()=>{try{return crypto.getRandomValues(new Uint32Array(1))[0]||1;}catch{return Date.now()>>>0;}};
const dailySeed=key=>[...key].reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261);
function saveStore(){try{localStorage.setItem(PROGRESS_SLOT,JSON.stringify(store));}catch{if(!saveWarningShown){saveWarningShown=true;toast('Your browser could not save progress. You can still play and export it.');}}}
function saveSession(){if(!active||!state)return;updateRecords();if(!dailyKey)store.sessions[active]=clone(state);saveStore();}
function updateRecords(){if(!state)return;if(active==='grid'){store.records.gridBest=Math.max(store.records.gridBest,state.score||0);if(dailyKey)store.daily[dailyKey]=Math.max(store.daily[dailyKey]||0,state.score||0);}if(active==='runner')store.records.runnerBest=Math.max(store.records.runnerBest,state.score||0);}
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
function applySettings(){document.body.classList.toggle('large-text',store.settings.largeText);document.body.classList.toggle('high-contrast',store.settings.highContrast);document.body.classList.toggle('reduce-motion',store.settings.reducedMotion);}
function sound(type='tap'){
  if(!store.settings.sound)return;
  try{audioContext||=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const now=audioContext.currentTime;const notes=type==='win'?[523.25,659.25,783.99]:type==='clear'?[440,659.25]:type==='hit'?[125]:[330];notes.forEach((f,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type==='hit'?'triangle':'sine';o.frequency.value=f;g.gain.setValueAtTime(0,now+i*.07);g.gain.linearRampToValueAtTime(.055,now+i*.07+.01);g.gain.exponentialRampToValueAtTime(.001,now+i*.07+.18);o.connect(g).connect(audioContext.destination);o.start(now+i*.07);o.stop(now+i*.07+.2);});}catch{/* Sound is optional. */}
}
function button(label,action,{primary=false,disabled=false}={}){const b=document.createElement('button');b.className=primary?'primary-button':'secondary-button';b.textContent=label;b.disabled=disabled;b.addEventListener('click',action);return b;}
function showModal(title,body,actions=[]){
  if(active==='runner'&&!paused)pauseRunner();
  modalReturnFocus=document.activeElement;
  $('modal-title').textContent=title;$('modal-body').innerHTML=body;$('modal-actions').replaceChildren(...actions.map(a=>button(a.label,a.action,a)));
  if(!$('modal').open)$('modal').showModal();
}
function closeModal(){if($('modal').open)$('modal').close();if(modalReturnFocus?.isConnected)modalReturnFocus.focus();}
$('modal-close').addEventListener('click',closeModal);
$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
function showSettings(){
  const rows=[['largeText','Larger text','Make game instructions and controls easier to read.'],['highContrast','Stronger contrast','Brighten secondary text and board outlines.'],['reducedMotion','Reduce motion','Turn off decorative transitions. Lumen Run still moves while playing.'],['sound','Gentle game sounds','Short tones made on your device. Off by default.']];
  showModal('Make yourself comfortable',rows.map(([key,title,desc])=>`<label class="setting-row"><div><strong>${title}</strong><span>${desc}</span></div><input type="checkbox" data-setting="${key}" ${store.settings[key]?'checked':''}></label>`).join(''));
  $('modal-body').querySelectorAll('[data-setting]').forEach(el=>el.addEventListener('change',()=>{store.settings[el.dataset.setting]=el.checked;applySettings();saveStore();if(el.dataset.setting==='sound')sound();}));
}
$('settings-open').addEventListener('click',showSettings);
function showProgress(){
  saveSession();
  showModal('Your progress',`<div class="progress-grid"><div class="progress-card"><h3>Crown Grid best</h3><strong>${fmt(store.records.gridBest)}</strong><p>points</p></div><div class="progress-card"><h3>Lumen Run best</h3><strong>${fmt(store.records.runnerBest)}</strong><p>points</p></div><div class="progress-card"><h3>Prism Sort</h3><strong>${fmt(store.records.sortLevel)}</strong><p>highest level unlocked</p></div><div class="progress-card"><h3>Orbit Link</h3><strong>${fmt(store.records.orbitLevel)}</strong><p>highest level unlocked</p></div></div><p class="modal-copy" style="margin-top:20px">Saved on this device. These are your personal records, with no online leaderboard or cloud sync.</p>`,[{label:'Export progress',action:exportProgress},{label:'Clear arcade data',action:confirmClear}]);
}
function exportProgress(){
  saveSession();const data=JSON.stringify({...store,exportedAt:new Date().toISOString()},null,2);
  if(location.hostname==='appassets.androidplatform.net'||typeof URL.createObjectURL!=='function'){
    showModal('Export your progress','<p class="modal-copy">Select this progress record and copy it into a text file or note for safekeeping.</p><label class="modal-copy" for="progress-export">Progress record (JSON)</label><textarea id="progress-export" readonly rows="10" style="width:100%;margin-top:10px;background:#101322;color:#f1eaf5;border:1px solid #a6b1d4;border-radius:8px;padding:12px"></textarea>',[
      {label:'Select progress',action:()=>{const field=$('progress-export');field.focus();field.select();}},
      {label:'Copy progress',primary:true,action:async()=>{const field=$('progress-export');field.focus();field.select();try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(field.value);toast('Progress copied. Paste it into a note or text file to keep it.');}catch{toast('Progress selected. Use your device’s Copy command, then paste it into a note or file.');}}},
    ]);$('progress-export').value=data;return;
  }
  const blob=new Blob([data],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='transcenlutions-arcade-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Your progress export is ready.');
}
function confirmClear(){showModal('Clear local arcade data?',`<p class="modal-copy">This removes the saved games and personal records for this arcade on this device. Export a copy first if you want to keep them. Your display settings will remain.</p>`,[{label:'Keep my progress',action:showProgress},{label:'Clear data',action:()=>{const settings={...store.settings};store=freshStore();store.settings=settings;active=null;state=null;history=[];dailyKey=null;saveStore();closeModal();showHome(false);toast('Local arcade progress cleared.');}}]);}
$('progress-open').addEventListener('click',showProgress);
function showHelp(){const game=GAMES[active];if(!game)return;showModal(`How to play ${game.name}`,`<ol class="help-list">${game.help.map(line=>`<li>${esc(line)}</li>`).join('')}</ol><p class="modal-copy"><strong>Keyboard:</strong> ${esc(game.keys)}</p>`,[{label:'Got it',primary:true,action:closeModal}]);}
$('game-help').addEventListener('click',showHelp);
$('about-open').addEventListener('click',()=>showModal('A little play, made yours',`<p class="modal-copy">Four original games by Transcenlutions: a block strategy puzzle, a color-and-symbol sorting puzzle, a pipe connection challenge, and a three-lane runner.</p><p class="modal-copy">Each game has its own How to play guide. Use touch, a mouse, or a keyboard. Larger text, stronger contrast, reduced motion, and optional sound are available in Settings.</p><p class="modal-copy">Your scores and sessions stay on this device. This edition has no ads, purchases, accounts, or multiplayer. It is a standalone collection, separate from Crowne Legacy's characters and story.</p>`,[{label:'Display settings',action:showSettings},{label:'Your progress',primary:true,action:showProgress}]));

function previewSVG(kind){
  if(kind==='grid'){const cells=[0,1,4,5,6,7,9,10,11,13,14];return `<svg viewBox="0 0 130 120" aria-hidden="true"><g transform="translate(13 11) rotate(-8 50 50)">${Array.from({length:16},(_,i)=>`<rect x="${(i%4)*25}" y="${Math.floor(i/4)*25}" width="21" height="21" rx="5" fill="${cells.includes(i)?COLORS[Math.floor(i/4)%3]:'#293047'}" stroke="#ffffff12"/>`).join('')}</g></svg>`;}
  if(kind==='sort')return `<svg viewBox="0 0 130 120" aria-hidden="true">${[0,1,2].map((t)=>`<g transform="translate(${7+t*42},10)"><path d="M0 0v78a16 16 0 0 0 32 0V0" fill="#ffffff05" stroke="#ced5ef66" stroke-width="2"/>${[0,1,2].map((c)=>`<rect x="5" y="${20+c*23}" width="22" height="19" rx="5" fill="${COLORS[(c+t)%3]}"/>`).join('')}</g>`).join('')}</svg>`;
  if(kind==='orbit')return `<svg viewBox="0 0 130 120" aria-hidden="true">${Array.from({length:9},(_,i)=>`<rect x="${9+(i%3)*38}" y="${5+Math.floor(i/3)*37}" width="32" height="32" rx="7" fill="#272e46" stroke="#b3c2fa1c"/>`).join('')}<path d="M25 20h38v37h38v37" stroke="#eaca86" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M25 57v37h38M100 20v7" stroke="#7185b2" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="25" cy="20" r="5" fill="#fff0be"/><circle cx="101" cy="94" r="5" fill="#fff0be"/></svg>`;
  return `<svg viewBox="0 0 130 120" aria-hidden="true"><path d="M45 9 5 112M85 9l40 103M59 9 45 112M71 9l14 103" stroke="#728eb76b" fill="none"/><path d="M27 71h76M17 93h96M38 40h54" stroke="#8ebbe827"/><path d="m66 77-10 20 10-4 10 4Z" fill="#b4d3ff" stroke="#edf6ff"/><rect x="42" y="51" width="16" height="13" rx="3" fill="#d387a6"/><rect x="79" y="82" width="18" height="14" rx="3" fill="#d387a6"/><path d="m68 34 5 7-5 7-5-7Z" fill="#efcb7b"/><path d="m67 59 5 7-5 7-5-7Z" fill="#efcb7b"/></svg>`;
}
function renderHome(){
  $('hero-board').innerHTML=Array.from({length:36},(_,i)=>{const types=['blue','blue','','','purple','purple','blue','','gold','gold','','purple','','','gold','','','','purple','purple','gold','blue','blue','','','purple','','blue','','','','','gold','gold','gold',''];return `<i class="hero-cube ${types[i]}" aria-hidden="true"></i>`;}).join('');
  $('nav-games').innerHTML=Object.entries(GAMES).map(([id,g])=>`<button class="nav-item" data-nav="${id}"><span aria-hidden="true">${g.icon}</span>${g.name}</button>`).join('');
  $('game-cards').innerHTML=Object.entries(GAMES).map(([id,g])=>`<article class="game-card"><div class="card-preview ${id}">${previewSVG(id)}</div><div class="card-body"><div class="card-tag">${g.tag}</div><h3>${g.name}</h3><p>${g.blurb}</p><button class="card-button" data-play="${id}" aria-label="${store.sessions[id]?'Continue':'Play'} ${g.name}">${store.sessions[id]?'Continue game':'Play game'} <span aria-hidden="true">↗</span></button></div></article>`).join('');
  $('game-cards').querySelectorAll('[data-play]').forEach(b=>b.addEventListener('click',()=>openGame(b.dataset.play)));
  document.querySelectorAll('[data-nav]').forEach(b=>{b.onclick=()=>b.dataset.nav==='home'?showHome():openGame(b.dataset.nav);});
}
function showHome(shouldSave=true){if(shouldSave)saveSession();stopRunner();active=null;state=null;dailyKey=null;closeModal();$('game-view').hidden=true;$('home-view').hidden=false;renderHome();document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav==='home'));document.title='Transcenlutions Arcade';window.scrollTo?.({top:0,behavior:'instant'});$('main').focus({preventScroll:true});}
$('brand-home').addEventListener('click',()=>showHome());$('back-home').addEventListener('click',()=>showHome());$('game-save').addEventListener('click',()=>showHome());$('hero-play').addEventListener('click',()=>openGame('grid'));$('daily-play').addEventListener('click',()=>openGame('grid',{daily:true,fresh:true}));
function openGame(kind,options={}){
  if(!GAMES[kind])return;
  const previousKind=active,previousSeed=state?.seed;
  saveSession();stopRunner();closeModal();active=kind;seed=newSeed();history=[];rotation=0;focusCell=0;hintCells=[];gameEndShown=false;dailyKey=options.daily?new Date().toISOString().slice(0,10):null;
  if(options.fresh&&previousKind===kind&&seed===previousSeed)seed=(seed+1)>>>0;
  if(dailyKey)seed=dailySeed(dailyKey);
  if(!options.fresh&&!dailyKey&&validState(store.sessions[kind],kind)){state=restoreState(store.sessions[kind]);seed=state.seed??seed;}
  else if(kind==='grid')state=createGrid(seed);
  else if(kind==='sort')state=createSort(options.level||Math.max(1,store.records.sortLevel),seed);
  else if(kind==='orbit')state=createOrbit(options.level||Math.max(1,store.records.orbitLevel),seed);
  else state=createRunner(seed);
  selected=kind==='grid'?Math.max(0,state.tray.findIndex(p=>p!==null)):-1;
  if(kind==='sort')sortInitial=createSort(state.level,state.seed??seed);
  if(kind==='runner'){runnerStarted=state.distance>0;paused=true;}
  $('home-view').hidden=true;$('game-view').hidden=false;const g=GAMES[kind];$('game-title').textContent=g.name;$('game-kicker').textContent=g.tag;$('game-subtitle').textContent=g.subtitle;$('note-title').textContent=g.note;$('note-copy').textContent=g.tip;$('note-extra').innerHTML=kind==='sort'?`<div class="color-legend">${COLOR_NAMES.map((label,i)=>`<span><i style="--tile-color:${SORT_COLORS[i]}">${SYMBOLS[i]}</i>${label}</span>`).join('')}</div>`:`<p><strong>Keyboard</strong><br>${esc(g.keys)}</p>`;
  $('game-mode').textContent=dailyKey?`DAILY · ${dailyKey} UTC`:kind==='sort'||kind==='orbit'?`LEVEL ${state.level}${state.level===MAX_PUZZLE_LEVEL?' · TOP LEVEL':''}`:'FREE PLAY';
  document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===kind));document.title=`${g.name} — Transcenlutions Arcade`;
  renderGame();saveSession();window.scrollTo?.({top:0,behavior:'instant'});$('game-title').tabIndex=-1;$('game-title').focus({preventScroll:true});
}
function stat(label,value){return `<div class="stat"><span class="stat-label">${label}</span><strong class="stat-value">${value}</strong></div>`;}
function renderStats(){if(!state)return;let html='';if(active==='grid')html=stat('SCORE',fmt(state.score))+stat(dailyKey?'DAILY BEST':'PERSONAL BEST',fmt(dailyKey?store.daily[dailyKey]:store.records.gridBest))+stat('LINES',fmt(state.lines));if(active==='sort'||active==='orbit')html=stat('LEVEL',fmt(state.level))+stat('MOVES',fmt(state.moves))+stat(active==='sort'?'SORTED':'CONNECTED',active==='sort'?`${state.tubes.filter(t=>t.length===4&&t.every(v=>v===t[0])).length} / 4`:`${state.connected?.length||0} / 25`);if(active==='runner')html=stat('SCORE',fmt(state.score))+stat('BEST',fmt(store.records.runnerBest))+stat('SHIELDS',`${state.lives} / 3`);$('game-stats').innerHTML=html;}
function renderGame(){if(!state)return;updateRecords();renderStats();if(active==='grid')renderGrid();if(active==='sort')renderSort();if(active==='orbit')renderOrbit();if(active==='runner')renderRunner();}
function setMessage(text){$('game-message').textContent=text;}
function actionControl(label,id,handler,{disabled=false,accent=false}={}){const b=document.createElement('button');b.textContent=label;b.id=id;b.disabled=disabled;if(accent)b.classList.add('accent');b.addEventListener('click',handler);return b;}
function pushHistory(){history.push(clone(state));if(history.length>40)history.shift();}
function undo(){if(!history.length)return;closeModal();state=history.pop();selected=active==='grid'?Math.max(0,state.tray.findIndex(p=>p!==null)):-1;rotation=0;hintCells=[];gameEndShown=false;renderGame();setMessage('Move undone. Take your time.');saveSession();}
function restart(){
  const isPuzzle=active==='sort'||active==='orbit';showModal(isPuzzle?'Restart this level?':'Start a fresh run?',`<p class="modal-copy">${isPuzzle?'The board returns to its starting arrangement. Your unlocked levels stay saved.':'Your current run will end. Your personal best stays saved.'}</p>`,[{label:'Keep playing',action:closeModal},{label:isPuzzle?'Restart level':'New run',primary:true,action:()=>{closeModal();history=[];rotation=0;selected=active==='grid'?0:-1;hintCells=[];gameEndShown=false;if(active==='grid')state=createGrid(dailyKey?dailySeed(dailyKey):newSeed());if(active==='sort')state=createSort(state.level,state.seed??seed);if(active==='orbit')state=createOrbit(state.level,state.seed??seed);if(active==='runner'){stopRunner();state=createRunner(newSeed());runnerStarted=false;}renderGame();saveSession();}}]);
}
function renderPiece(piece,turn=0){let p=piece;for(let i=0;i<turn;i++)p=rotatePiece(p);const h=Math.max(...p.cells.map(c=>c[0]))+1,w=Math.max(...p.cells.map(c=>c[1]))+1;return `<span class="piece-grid" style="--pw:${w};--ph:${h};--tile-color:${COLORS[p.color-1]}">${Array.from({length:w*h},(_,i)=>`<i class="${p.cells.some(c=>c[0]===Math.floor(i/w)&&c[1]===i%w)?'piece-square':'piece-space'}"></i>`).join('')}</span>`;}
function renderGrid(){
  $('game-stage').className='game-stage';$('game-stage').innerHTML=`<div class="grid-board" role="grid" aria-label="Crown Grid eight by eight board">${state.board.map((v,i)=>`<button class="grid-cell ${v?'filled':''} ${hintCells.includes(i)?'hint':''}" role="gridcell" data-cell="${i}" aria-rowindex="${Math.floor(i/8)+1}" aria-colindex="${i%8+1}" tabindex="${i===focusCell?0:-1}" aria-label="Row ${Math.floor(i/8)+1}, column ${i%8+1}, ${v?'occupied':'empty'}" style="--tile-color:${COLORS[Math.max(0,v-1)]}"></button>`).join('')}</div><div class="tray" role="group" aria-label="Choose a block piece">${state.tray.map((p,i)=>`<button class="tray-piece ${selected===i?'selected':''}" data-piece="${i}" ${p?'':'disabled'} aria-label="Piece ${i+1}${p?', '+p.cells.length+' blocks':', already placed'}" aria-pressed="${selected===i}"><span class="piece-number">${i+1}</span>${p?renderPiece(p,selected===i?rotation:0):'<span aria-hidden="true">✓</span>'}</button>`).join('')}</div>`;
  const stage=$('game-stage');stage.querySelectorAll('[data-cell]').forEach(b=>{b.addEventListener('click',()=>placeOnGrid(Number(b.dataset.cell)));b.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')previewGrid(Number(b.dataset.cell));});b.addEventListener('focus',()=>{focusCell=Number(b.dataset.cell);previewGrid(focusCell);});});stage.querySelector('.grid-board').addEventListener('pointerleave',clearGridPreview);
  stage.querySelectorAll('[data-piece]').forEach(b=>b.addEventListener('click',()=>selectPiece(Number(b.dataset.piece))));
  $('game-controls').replaceChildren(actionControl('↻ Rotate','rotate',rotateSelected,{disabled:state.over}),actionControl('↶ Undo','undo',undo,{disabled:!history.length}),actionControl('Hint','hint',gridHint,{disabled:state.over}),actionControl('New run','restart',restart));
  if(state.over){setMessage('No pieces fit. Your best score is saved.');if(!gameEndShown){gameEndShown=true;showModal('Every good run makes room for another.',`<p class="modal-copy">You scored <strong>${fmt(state.score)}</strong> points and cleared ${fmt(state.lines)} lines. Your personal best is ${fmt(store.records.gridBest)}.</p>`,[{label:'Review board',action:closeModal},{label:'Play again',primary:true,action:()=>{closeModal();openGame('grid',{fresh:true,daily:!!dailyKey});}}]);}}
  else setMessage('Choose a piece, then tap its top-left position on the board.');
}
function selectPiece(i){if(!state.tray[i])return;selected=i;rotation=0;hintCells=[];sound();renderGrid();setMessage(`Piece ${i+1} selected. Choose where to place it.`);document.querySelector(`[data-piece="${i}"]`)?.focus();}
function rotateSelected(){if(!state?.tray[selected]||state.over)return;rotation=(rotation+1)%4;sound();renderGrid();setMessage(`Piece ${selected+1} rotated ${rotation*90} degrees.`);$('rotate').focus();}
function clearGridPreview(){document.querySelectorAll('.grid-cell.preview,.grid-cell.bad-preview').forEach(b=>b.classList.remove('preview','bad-preview'));}
function previewGrid(index){clearGridPreview();const original=state?.tray[selected];if(!original||state.over)return;let piece=original;for(let i=0;i<rotation;i++)piece=rotatePiece(piece);const row=Math.floor(index/8),col=index%8,valid=canPlaceGrid(state,selected,row,col,rotation);for(const[r,c]of piece.cells){if(row+r>7||col+c>7)continue;document.querySelector(`[data-cell="${(row+r)*8+col+c}"]`)?.classList.add(valid?'preview':'bad-preview');}}
function placeOnGrid(index){if(!state||active!=='grid'||state.over)return;focusCell=index;const next=applyGrid(state,{type:'place',piece:selected,row:Math.floor(index/8),col:index%8,rotation});if(next.lastEvent?.type==='invalid'){setMessage(next.lastEvent.reason||'That piece does not fit there. Try another square or rotate it.');sound('hit');return;}pushHistory();state=next;rotation=0;hintCells=[];selected=Math.max(0,state.tray.findIndex(p=>p!==null));updateRecords();renderGame();saveSession();const e=state.lastEvent;if(e?.lineCount){setMessage(`${e.lineCount} ${e.lineCount===1?'line':'lines'} cleared. +${e.points} points.`);sound('clear');e.cleared?.forEach(i=>document.querySelector(`[data-cell="${i}"]`)?.classList.add('cleared'));}else{setMessage(`+${e?.points||0} points. Choose your next piece.`);sound();}document.querySelector(`[data-cell="${focusCell}"]`)?.focus({preventScroll:true});}
function gridHint(){if(state.over)return;for(let p=0;p<3;p++)for(let r=0;r<4;r++)for(let i=0;i<64;i++)if(canPlaceGrid(state,p,Math.floor(i/8),i%8,r)){selected=p;rotation=r;let shape=state.tray[p];for(let t=0;t<r;t++)shape=rotatePiece(shape);hintCells=shape.cells.map(([dr,dc])=>(Math.floor(i/8)+dr)*8+i%8+dc);focusCell=i;renderGrid();setMessage(`One possible move: piece ${p+1}, row ${Math.floor(i/8)+1}, column ${i%8+1}. Tap the highlighted starting square.`);document.querySelector(`[data-cell="${i}"]`)?.focus();return;}setMessage('No pieces fit. Start another run when you are ready.');}
function renderSort(){
  $('game-stage').className='game-stage';$('game-stage').innerHTML=`<div class="tube-board" role="group" aria-label="Six sorting tubes">${state.tubes.map((tube,i)=>`<button class="tube ${selected===i?'selected':''}" data-tube="${i}" aria-pressed="${selected===i}" aria-label="Tube ${i+1}, ${tube.length?tube.map(c=>COLOR_NAMES[c]).reverse().join(', ')+', top to bottom':'empty'}"><span class="tube-label">${i+1}</span>${Array.from({length:4},(_,j)=>`<span class="liquid ${j>=tube.length?'empty':''}" style="--tile-color:${SORT_COLORS[tube[j]??0]}" aria-hidden="true">${j<tube.length?SYMBOLS[tube[j]]:'·'}</span>`).join('')}</button>`).join('')}</div>`;
  $('game-stage').querySelectorAll('[data-tube]').forEach(b=>b.addEventListener('click',()=>pourSort(Number(b.dataset.tube))));
  $('game-controls').replaceChildren(actionControl('↶ Undo','undo',undo,{disabled:!history.length}),actionControl('Restart level','restart',restart),actionControl(puzzleNextLabel(),'next-level',nextLevel,{disabled:!state.solved,accent:state.solved}));
  setMessage(state.solved?'All four colors are sorted. Nicely done.':selected>=0?`Tube ${selected+1} selected. Choose a destination with room.`:'Tap a tube to select its top color, then tap a destination.');
  if(state.solved)levelWon();
}
function pourSort(i){if(state.solved)return;if(selected<0){if(!state.tubes[i].length){setMessage('Choose a tube with a color first.');return;}selected=i;renderSort();document.querySelector(`[data-tube="${i}"]`)?.focus();sound();return;}if(selected===i){selected=-1;renderSort();return;}const next=applySort(state,{from:selected,to:i});if(next.lastEvent?.type==='invalid'){setMessage(next.lastEvent.reason||'Pour onto the same color, or into an empty tube with space.');sound('hit');return;}pushHistory();state=next;selected=-1;renderGame();saveSession();if(!state.solved){setMessage(`${next.lastEvent.count} ${next.lastEvent.count===1?'layer':'layers'} poured into tube ${i+1}.`);document.querySelector(`[data-tube="${i}"]`)?.focus();sound();}}
function renderOrbit(){
  const con=orbitConnections(state);state.connected=con.connected;state.solved=con.solved;
  $('game-stage').className='game-stage';$('game-stage').innerHTML=`<div class="orbit-board" role="grid" aria-label="Five by five pipe connection puzzle">${state.tiles.map((tile,i)=>{const m=pipeMask(tile),paths=[];if(m&1)paths.push('M50 50V0');if(m&2)paths.push('M50 50H100');if(m&4)paths.push('M50 50V100');if(m&8)paths.push('M50 50H0');const label=[m&1?'north':'',m&2?'east':'',m&4?'south':'',m&8?'west':''].filter(Boolean).join(', ');return `<button class="pipe-cell ${con.connected.includes(i)?'connected':''} ${tile.fixed?'fixed':''} ${tile.blocked?'blocked':''} ${i===0||i===24?'endpoint':''}" role="gridcell" data-pipe="${i}" tabindex="${i===focusCell?0:-1}" aria-label="Row ${Math.floor(i/5)+1}, column ${i%5+1}, ${tile.blocked?'blocked':label}${tile.fixed?', fixed':''}${con.connected.includes(i)?', powered':''}"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="${paths.join(' ')}"/><circle cx="50" cy="50" r="10" stroke-width="6"/></svg>${i===0?'<span class="pipe-badge">START</span>':i===24?'<span class="pipe-badge">END</span>':''}${tile.fixed?'<span class="pipe-fixed" aria-hidden="true">▣</span>':''}</button>`;}).join('')}</div>`;
  $('game-stage').querySelectorAll('[data-pipe]').forEach(b=>b.addEventListener('click',()=>turnPipe(Number(b.dataset.pipe))));
  $('game-controls').replaceChildren(actionControl('↶ Undo','undo',undo,{disabled:!history.length}),actionControl('Hint turn','orbit-hint',orbitHint,{disabled:state.solved}),actionControl('Restart','restart',restart),actionControl(puzzleNextLabel(),'next-level',nextLevel,{disabled:!state.solved,accent:state.solved}));
  setMessage(state.solved?'The light made it all the way through.':'Tap a pipe to turn it. Connect START to END.');
  if(state.solved)levelWon();
}
function turnPipe(i){focusCell=i;if(state.solved)return;const next=applyOrbit(state,{index:i});if(next.lastEvent?.type==='invalid'){setMessage('That tile is fixed. Turn one of the other pipes.');return;}pushHistory();state=next;renderGame();saveSession();if(!state.solved){sound();document.querySelector(`[data-pipe="${i}"]`)?.focus({preventScroll:true});}}
function orbitHint(){const i=state.tiles.findIndex((t,j)=>!t.fixed&&!t.blocked&&t.rotation!==state.solution[j]);if(i<0){setMessage('Follow the gold connection from START to END.');return;}turnPipe(i);if(!state.solved)setMessage(`Turned the pipe at row ${Math.floor(i/5)+1}, column ${i%5+1} toward one possible solution.`);}
function puzzleNextLabel(){return state.level>=MAX_PUZZLE_LEVEL?'New challenge':'Next level';}
function levelWon(){
  if(gameEndShown)return;gameEndShown=true;
  const key=active+'Level',completeKey=active+'Complete',atMaximum=state.level>=MAX_PUZZLE_LEVEL;
  const firstCompletion=atMaximum?!store.records[completeKey]:store.records[key]<=state.level;
  store.records[key]=Math.min(MAX_PUZZLE_LEVEL,Math.max(store.records[key],state.level+1));
  if(atMaximum)store.records[completeKey]=1;
  if(firstCompletion)store.records.completed++;
  saveSession();sound('win');
  const nextMessage=atMaximum?'You reached the highest level. Try a new challenge at this level whenever you like.':'The next level is ready whenever you are.';
  showModal(active==='sort'?'Everything in its place.':'A connection worth making.',`<p class="modal-copy">Level ${state.level} complete in <strong>${state.moves} moves</strong>. ${nextMessage}</p>`,[{label:'Enjoy the board',action:closeModal},{label:puzzleNextLabel(),primary:true,action:nextLevel}]);
}
function nextLevel(){if(!state?.solved)return;const kind=active,level=Math.min(MAX_PUZZLE_LEVEL,state.level+1);closeModal();openGame(kind,{fresh:true,level});}

function renderRunner(){
  $('game-stage').className='game-stage runner-stage';$('game-stage').innerHTML=`<div class="run-sky"></div><div class="run-horizon"></div><div class="runner-help">FOLLOW THE LIGHT</div><div class="run-track"><i class="run-lane-line"></i><i class="run-lane-line"></i><div id="run-entities"></div><div class="run-player" id="run-player" aria-hidden="true"><svg viewBox="0 0 44 50"><path d="M22 4 5 43l17-9 17 9Z"/><path d="M22 16v18"/></svg></div></div><div class="run-cover" id="run-cover"></div>`;
  $('game-controls').replaceChildren(actionControl('← Left','run-left',()=>changeLane(-1)),actionControl(paused?'▶ Resume':'Ⅱ Pause','run-pause',()=>paused?resumeRunner():pauseRunner(),{accent:true,disabled:state.over}),actionControl('Right →','run-right',()=>changeLane(1)),actionControl(relaxed?'Relaxed pace':'Standard pace','run-pace',()=>{relaxed=!relaxed;$('run-pace').textContent=relaxed?'Relaxed pace':'Standard pace';setMessage(relaxed?'Relaxed pace enabled.':'Standard pace enabled.');}),actionControl('New run','restart',restart));
  $('run-left').classList.add('runner-movement');$('run-right').classList.add('runner-movement');
  let startX=null;$('game-stage').onpointerdown=e=>{if(e.target.closest('button'))return;startX=e.clientX;};$('game-stage').onpointerup=e=>{if(startX===null)return;const delta=e.clientX-startX;startX=null;if(Math.abs(delta)>20)changeLane(delta>0?1:-1);};$('game-stage').onpointercancel=()=>{startX=null;};
  drawRunner();renderRunCover();setMessage('Collect gold sparks. Avoid pink barriers. Use the left and right controls.');
}
function drawRunner(){if(active!=='runner'||!$('run-player'))return;$('run-player').style.left=`${(state.lane+.5)/3*100}%`;$('run-player').classList.toggle('invulnerable',state.invulnerable>0);$('run-entities').innerHTML=state.entities.map(e=>{const progress=Math.max(0,Math.min(1,1-e.z/48));return `<span class="run-entity ${e.type}" style="--x:${(e.lane+.5)/3*100}%;--y:${progress*84}%;--scale:${.4+progress*.6}" aria-hidden="true">${e.type==='energy'?'◆':'×'}</span>`;}).join('');}
function renderRunCover(){const cover=$('run-cover');if(!cover)return;if(!paused&&!state.over){cover.hidden=true;return;}cover.hidden=false;const title=state.over?'Keep your light moving.':runnerStarted?'Take a breath.':'Find your lane.';const desc=state.over?`${fmt(state.score)} points. Your best is ${fmt(store.records.runnerBest)}.`:runnerStarted?'Your run is paused. Resume when you are ready.':'Three lanes. Three shields. A trail of sparks to follow.';cover.innerHTML=`<h2>${title}</h2><p>${desc}</p>`;cover.append(button(state.over?'Run again':runnerStarted?'Resume run':'Start running',()=>{if(state.over){state=createRunner(newSeed());gameEndShown=false;runnerStarted=false;renderGame();}resumeRunner();},{primary:true}));}
function resumeRunner(){if(active!=='runner'||state.over)return;closeModal();paused=false;runnerStarted=true;lastFrame=0;$('run-pause').textContent='Ⅱ Pause';renderRunCover();$('game-stage').tabIndex=-1;$('game-stage').focus({preventScroll:true});if(!frameId)frameId=requestAnimationFrame(runFrame);sound();}
function pauseRunner(){if(active!=='runner')return;paused=true;cancelAnimationFrame(frameId);frameId=0;lastFrame=0;if($('run-pause'))$('run-pause').textContent='▶ Resume';renderRunCover();saveSession();audioContext?.suspend?.();}
function stopRunner(){paused=true;cancelAnimationFrame(frameId);frameId=0;lastFrame=0;}
let statsAt=0,saveAt=0;
function runFrame(now){frameId=0;if(active!=='runner'||paused||state.over)return;const dt=lastFrame?Math.min(.1,(now-lastFrame)/1000):0;lastFrame=now;state=stepRunner(state,dt*(relaxed?.67:1));updateRecords();drawRunner();if(now-statsAt>120){renderStats();statsAt=now;}if(state.lastEvent?.collected>0)sound('clear');if(state.lastEvent?.collisions>0){sound('hit');setMessage(`Barrier hit. ${state.lives} ${state.lives===1?'shield':'shields'} left.`);}if(now-saveAt>2000){saveSession();saveAt=now;}if(state.over){paused=true;renderStats();renderRunCover();$('run-pause').disabled=true;saveSession();setMessage(`Run complete. ${fmt(state.score)} points. Try again whenever you are ready.`);return;}frameId=requestAnimationFrame(runFrame);}
function changeLane(direction){if(active!=='runner'||paused||state.over)return;state=moveRunner(state,direction);drawRunner();}

document.addEventListener('keydown',e=>{
  if($('modal').open||!active||e.altKey||e.ctrlKey||e.metaKey)return;
  if(e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  if(e.key==='Escape'){e.preventDefault();if(active==='runner'&&!paused)pauseRunner();else showHome();return;}
  if(active==='runner'){if(['ArrowLeft','a','A'].includes(e.key)){e.preventDefault();changeLane(-1);}else if(['ArrowRight','d','D'].includes(e.key)){e.preventDefault();changeLane(1);}else if(e.code==='Space'&&e.target.tagName!=='BUTTON'){e.preventDefault();paused?resumeRunner():pauseRunner();}return;}
  if(active==='grid'){if(['1','2','3'].includes(e.key)){e.preventDefault();selectPiece(Number(e.key)-1);return;}if(e.key.toLowerCase()==='r'){e.preventDefault();rotateSelected();return;}}
  const size=active==='grid'?8:active==='orbit'?5:0,selector=active==='grid'?'data-cell':'data-pipe';if(size&&e.target.hasAttribute?.(selector)&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();let row=Math.floor(Number(e.target.getAttribute(selector))/size),col=Number(e.target.getAttribute(selector))%size;row=Math.max(0,Math.min(size-1,row+(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0)));col=Math.max(0,Math.min(size-1,col+(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0)));focusCell=row*size+col;document.querySelectorAll(`[${selector}]`).forEach(b=>b.tabIndex=Number(b.getAttribute(selector))===focusCell?0:-1);document.querySelector(`[${selector}="${focusCell}"]`)?.focus();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(active==='runner')pauseRunner();else saveSession();audioContext?.suspend?.();}});
window.addEventListener('pagehide',()=>{if(active==='runner')pauseRunner();else saveSession();});
window.addEventListener('transcenlutions:pause',()=>{if(active==='runner')pauseRunner();else saveSession();audioContext?.suspend?.();});
window.addEventListener('transcenlutions:resume',()=>{/* Explicit Resume prevents an unexpected moving game. */});
window.TranscenlutionsArcade={androidBack(){if($('modal').open){closeModal();return true;}if(active==='runner'&&!paused){pauseRunner();return true;}if(active){showHome();return true;}return false;}};
if(location.hostname==='appassets.androidplatform.net'||document.documentElement.dataset.standalone==='true'){$('privacy-link').addEventListener('click',e=>{e.preventDefault();const edition=location.hostname==='appassets.androidplatform.net'?'This Android package has no Internet permission.':'This standalone edition includes all game code and visuals in one file. Local saving depends on your browser’s file-storage support.';showModal('Your privacy',`<p class="modal-copy">Game sessions, scores, and preferences are stored only on this device. ${edition} The games contain no ads, analytics, purchases, accounts, or tracking SDKs. Clearing app or browser data removes your progress. Contact Transcenlutions at transcenlutions@gmail.com.</p>`);});}
if('serviceWorker'in navigator&&location.protocol==='https:'&&location.hostname!=='appassets.androidplatform.net')navigator.serviceWorker.register('./sw.js').catch(()=>{/* Online play remains available. */});
applySettings();renderHome();
