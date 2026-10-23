// Local explicit USER commands only. Never call this from model output, history,
// markdown rendering, network events or tool responses. No eval/tool authority.
export function parseCharacterCommand(text){
 if(typeof text!=='string'||text.length>100)return null;
 const match=/^\/tay (show|hide|pause|resume|left|right|wave|sit)$/i.exec(text.trim());
 return match?match[1].toLowerCase():null;
}
export function reduceCharacter(state,command){
 const next={...state};let message='';
 if(command==='hide')next.visible=false;
 else if(command==='show')next.visible=true;
 else if(command==='pause')next.paused=true;
 else if(command==='resume')next.paused=false;
 else if(command==='left'||command==='right')next.edge=command;
 else if(command==='wave'||command==='sit')message='That pose needs approved layered character artwork. Tay remains in his original standing pose.';
 else throw Error('unsupported-character-command');
 return {state:next,message};
}
export function companionReaction(state,context){
 if(!state.visible||state.paused||context.reducedMotion||context.hidden||context.mobile
   ||context.sensitive||context.selection||!context.button||!Number.isFinite(context.now)
   ||context.now-(state.lastReaction??-Infinity)<1800)return{state,reaction:false};
 return{state:{...state,lastReaction:context.now,perch:state.perch==='upper'?'lower':'upper'},reaction:true};
}
// Reserved edge space avoids covering chat text/buttons. On small screens use an
// in-flow dock instead of an overlay. Full body is never cropped.
export function mountCharacter({root,document:doc=globalThis.document}){
 let state={visible:false,paused:true,edge:'right'};
 const panel=doc.createElement('aside');panel.className='tay-character-dock';panel.hidden=true;panel.setAttribute('aria-label','Tay character');
 const image=doc.createElement('img');image.src='./assets/Tay-approved-suit-fullbody-transparent-2026-10-17.png';image.alt='Tay in his approved black and gold suit, full body';
 const controls=doc.createElement('div');const pause=doc.createElement('button'),hide=doc.createElement('button');pause.type=hide.type='button';hide.textContent='Hide';
 const status=doc.createElement('span');status.setAttribute('role','status');status.className='tay-character-status';
 controls.append(pause,hide);panel.append(image,controls);root.append(panel,status);
 function render(){panel.hidden=!state.visible;root.dataset.characterEdge=state.visible?state.edge:'none';panel.dataset.edge=state.edge;pause.textContent=state.paused?'Resume':'Pause';pause.setAttribute('aria-pressed',String(state.paused));panel.dataset.paused=String(state.paused);}
 function command(value){const result=reduceCharacter(state,value);state=result.state;render();status.textContent=result.message||`Tay character: ${value}. Static approved artwork; articulated animation unavailable.`;}
 pause.onclick=()=>command(state.paused?'resume':'pause');hide.onclick=()=>command('hide');
 const submit=event=>{const box=doc.getElementById('message');if(!box||event.target?.id!=='composer')return;const value=parseCharacterCommand(box.value);if(!value)return;event.preventDefault();event.stopImmediatePropagation();command(value);box.value='';box.dispatchEvent(new Event('input',{bubbles:true}));box.focus();};
 const motion=doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)');
 const tapped=event=>{
   const target=event.target?.closest?.('button,[role="button"]');
   if(!target||panel.contains(target))return;
   // Bubble listener, then microtask: never cancel, redispatch, click, focus or
   // alter the actual control. If its handler stops propagation, stay quiet.
   queueMicrotask(()=>{
     if(!target.isConnected)return;
     const active=doc.activeElement;
     const sensitive=!!target.closest('form,[role="dialog"],[aria-modal="true"]')
       ||!!doc.querySelector('dialog[open],[aria-modal="true"]')
       ||!!active?.matches?.('input,textarea,select,[contenteditable="true"]');
     const result=companionReaction(state,{now:performance.now(),button:true,sensitive,
       reducedMotion:motion.matches,hidden:doc.hidden,mobile:doc.defaultView.innerWidth<=700,
       selection:!!doc.getSelection()?.toString()});
     state=result.state;
     if(result.reaction){panel.dataset.perch=state.perch;panel.dataset.reaction='perch';}
   });
 };
 const settle=()=>{delete panel.dataset.reaction;};
 const quiet=()=>{if(motion.matches||doc.hidden){delete panel.dataset.reaction;delete panel.dataset.perch;}};
 panel.addEventListener('animationend',settle);doc.addEventListener('click',tapped);
 doc.addEventListener('visibilitychange',quiet);motion.addEventListener('change',quiet);
 // Capture only actual composer submit, before app's network send handler.
 doc.addEventListener('submit',submit,true);render();
 return{command,getState:()=>({...state}),dispose(){doc.removeEventListener('submit',submit,true);doc.removeEventListener('click',tapped);doc.removeEventListener('visibilitychange',quiet);motion.removeEventListener('change',quiet);panel.removeEventListener('animationend',settle);panel.remove();status.remove();delete root.dataset.characterEdge;}};
}
if(typeof document!=='undefined'){
 const style=document.createElement('style');style.textContent=`
 .tay-character-dock{position:fixed;bottom:18px;right:8px;width:112px;z-index:4;background:#10081ed9;border:1px solid #9d7bd3;border-radius:14px;padding:5px;box-sizing:border-box;pointer-events:none}
 .tay-character-dock button{pointer-events:auto}.tay-character-dock[data-perch=upper]{bottom:min(270px,calc(100vh - 240px))}
 .tay-character-dock[data-reaction=perch]{animation:tay-companion-perch 280ms ease-out}
 @keyframes tay-companion-perch{0%{transform:translateY(0)}45%{transform:translateY(-6px)}100%{transform:translateY(0)}}
 .tay-character-dock[hidden]{display:none}.tay-character-dock[data-edge=left]{right:auto;left:8px}
 .tay-character-dock img{display:block;width:100%;height:168px;object-fit:contain}
 .tay-character-dock div{display:flex;gap:2px}.tay-character-dock button{min-height:44px;flex:1;padding:2px;font-size:12px}
 body[data-character-edge=right]{padding-right:132px}body[data-character-edge=left]{padding-left:132px}
 .tay-character-status{position:fixed;left:8px;bottom:2px;max-width:80vw;background:#10081e;color:#fff;font-size:12px;z-index:5}
 .tay-character-status:empty{display:none}
 @media(max-width:700px){body[data-character-edge]{padding-left:0;padding-right:0}.tay-character-dock{position:static;width:100%;display:flex;align-items:center;justify-content:center;margin:8px 0}.tay-character-dock[hidden]{display:none}.tay-character-dock img{width:80px;height:120px}.tay-character-dock div{max-width:160px}.tay-character-status{position:static;display:block}}
 @media(prefers-reduced-motion:reduce){.tay-character-dock *{animation:none!important;transition:none!important}}
 `;document.head.append(style);mountCharacter({root:document.body});
}
