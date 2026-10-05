// Browser speech recognition is optional, session-only, and off on page load.
const SpeechAPI=window.SpeechRecognition||window.webkitSpeechRecognition;
let recognition=null,micActive=false,micStarting=false;
function addressedSpeech(text){const match=text.trim().match(/^(?:hey\s+tay|hey\s+Tay|okay\s+tay|ok\s+tay)[,.:!?\s]+(.+)$/i);return match?match[1].trim():null}
function micNote(text){$('micStatus').textContent=text}
function stopMic(reason='Microphone off.'){micActive=false;micStarting=false;if(recognition){const old=recognition;recognition=null;old.onend=null;old.onresult=null;try{old.abort()}catch(e){}}$('mic').textContent='🎙 Talk';$('mic').setAttribute('aria-pressed','false');micNote(reason)}
function startMic(){
 if(micActive||micStarting){stopMic();return}
 if(!SpeechAPI){micNote('Speech recognition is unavailable here. Open Tay.app in Chrome, or keep typing.');return}
 if(!$('speechConsent').checked){$('micSettings').showModal();return}
 if(busy){micNote('Wait for Tay to finish before starting the microphone.');return}
 const wake=$('micMode').value==='wake';const r=new SpeechAPI();recognition=r;micStarting=true;
 r.lang='en-US';r.continuous=wake;r.interimResults=true;r.maxAlternatives=1;
 r.onstart=()=>{if(recognition!==r)return;micStarting=false;micActive=true;$('mic').textContent='■ Stop mic';$('mic').setAttribute('aria-pressed','true');micNote(wake?'Listening — begin each request with “Hey Tay”.':'Listening — speak your message. It will appear for review.')};
 r.onresult=event=>{if(recognition!==r||!micActive)return;for(let i=event.resultIndex;i<event.results.length;i++){
   const result=event.results[i];if(!result.isFinal)continue;
   const transcript=result[0].transcript.trim();const accepted=wake?addressedSpeech(transcript):transcript;
   if(!accepted){micNote('Listening for “Hey Tay” at the start of a request.');continue}
   $('prompt').value=[$('prompt').value.trim(),accepted].filter(Boolean).join(' ');
   stopMic('Message captured. Review it, then press Send.');$('prompt').focus();break;
 }};
 r.onerror=event=>{const errors={'not-allowed':'Microphone permission was denied. Allow it in Chrome’s site settings, then try again.','service-not-allowed':'Browser speech service is unavailable. Try Tay.app in Chrome.','network':'Speech service could not connect. Browser recognition may need internet.','audio-capture':'No microphone was available. Check your Mac input settings.','no-speech':'No speech detected. Tap Talk to try again.'};stopMic(errors[event.error]||'Microphone stopped: '+event.error)};
 r.onend=()=>{if(recognition===r)stopMic('Microphone off. Tap Talk to listen again.')};
 micNote('Requesting microphone access…');try{r.start()}catch(e){stopMic('Could not start microphone: '+e.message)}
}
$('mic').onclick=startMic;$('micOptions').onclick=()=>$('micSettings').showModal();
$('micDone').onclick=()=>{$('micSettings').close();stopMic();};
$('speechConsent').onchange=()=>{if(!$('speechConsent').checked)stopMic()};
$('micMode').onchange=()=>stopMic();
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMic('Microphone off while Tay is in the background.')});
window.addEventListener('pagehide',()=>stopMic());
if(!SpeechAPI)micNote('Use Tay.app in Chrome for microphone support.');
