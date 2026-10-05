const fs=require('fs'),vm=require('vm'),assert=require('assert');const nodes={};let starts=0;
function node(id){return nodes[id]??=( {value:'',checked:false,textContent:'',focus(){},setAttribute(){},showModal(){this.shown=true},close(){}})}
class Speech{start(){starts++;this.onstart()}abort(){}}
const ctx={window:{SpeechRecognition:Speech,addEventListener(){}},document:{addEventListener(){}},$:node,busy:false};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/microphone.js','utf8'),ctx);
assert.equal(vm.runInContext("addressedSpeech('Hey Tay, open my project')",ctx),'open my project');
for(const phrase of ['I was talking to Tay','Hey Taylor open this','We should say hey Tay','Hey Tay'])assert.equal(vm.runInContext('addressedSpeech('+JSON.stringify(phrase)+')',ctx),null);
vm.runInContext('startMic()',ctx);assert.equal(starts,0);assert.equal(node('micSettings').shown,true);
node('speechConsent').checked=true;node('micMode').value='wake';vm.runInContext('startMic()',ctx);assert.equal(starts,1);
vm.runInContext("recognition.onresult({resultIndex:0,results:[Object.assign([{transcript:'talking to someone else'}],{isFinal:true})]})",ctx);assert.equal(node('prompt').value,'');
vm.runInContext("recognition.onresult({resultIndex:0,results:[Object.assign([{transcript:'Hey Tay, make a plan'}],{isFinal:true})]})",ctx);assert.equal(node('prompt').value,'make a plan');assert.equal(vm.runInContext('micActive',ctx),false);
console.log('Microphone tests passed: opt-in, addressed phrases, ignored background text, capture and stop.');
