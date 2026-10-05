import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import hub
import engines
import foundry
import selfdev
import json, os, secrets, threading, urllib.request, urllib.error, uuid, subprocess
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
TOKEN=secrets.token_urlsafe(32)
JOBS={}
LOCK=threading.Lock()
PORT=18743

def selfdev_ask(d, messages):
    mode=d.get('mode','local'); key=d.get('key',''); model=d.get('model','').strip()
    if d.get('privacy') in ('offline','incognito') and mode != 'local':
        raise ValueError('Offline and Incognito self-development require the local model.')
    if mode != 'local' and not key: raise ValueError('Enter an API key in Connections first.')
    if mode not in ('local','free') and not d.get('paid'): raise ValueError('Enable paid API use in Connections first.')
    if mode == 'local':
        r=api('http://127.0.0.1:11434/api/chat',{'model':'qwen2.5-coder:7b','messages':messages,'stream':False,'format':'json','options':{'num_ctx':16384,'num_predict':4096,'temperature':0.1}})
        return r['message']['content']
    if mode == 'claude':
        if not model: raise ValueError('Enter a Claude model ID in Connections.')
        r=api('https://api.anthropic.com/v1/messages',{'model':model,'system':messages[0]['content'],'messages':messages[1:],'max_tokens':4096},key,True)
        return '\n'.join(x['text'] for x in r['content'] if x['type']=='text')
    endpoints={'free':'https://openrouter.ai/api/v1/chat/completions','router':'https://openrouter.ai/api/v1/chat/completions','openai':'https://api.openai.com/v1/chat/completions','perplexity':'https://api.perplexity.ai/v1/sonar'}
    if mode not in endpoints: raise ValueError('Unknown provider.')
    model='openrouter/free' if mode=='free' else ('sonar' if mode=='perplexity' else model)
    if not model: raise ValueError('Enter a model ID in Connections.')
    r=api(endpoints[mode],{'model':model,'messages':messages},key)
    return r['choices'][0]['message']['content']

def selfdev_work(job,d):
    try:
        def progress(message): JOBS[job].update(progress=message)
        result=selfdev.work(d,lambda messages:selfdev_ask(d,messages),progress)
        JOBS[job]={'done':True,'kind':'selfdev',**result}
    except urllib.error.HTTPError as e:
        JOBS[job]={'done':True,'kind':'selfdev','error':'Provider returned HTTP '+str(e.code)+'. Check model access and quota. No fallback was used.'}
    except Exception as e: JOBS[job]={'done':True,'kind':'selfdev','error':str(e)}
    finally: LOCK.release()

def projects():
    candidates=[Path.home()/'crowne-legacy']
    base=Path.home()/'Projects'
    if base.exists(): candidates+=list(base.iterdir())
    if (ROOT/'projects.json').exists(): candidates += [Path(x) for x in json.loads((ROOT/'projects.json').read_text())]
    return list(dict.fromkeys(str(p.resolve()) for p in candidates if p.is_dir()))

def history(project): return hub.project_state(hub.validate_project(project))/'window-chat.json'

def thread_instruction(value):
    instructions = {
        'chat': 'Discuss and draft a direct answer.',
        'plan': 'Create an actionable plan with steps, dependencies, and verification checks. Do not claim to execute the plan.',
        'execute': 'Prepare a concrete coding handoff with proposed changes and verification steps. Execution is available through the separate Coding tools agent, not this chat. Never claim commands ran or files changed.',
    }
    if value not in instructions: raise ValueError('Unknown thread mode.')
    return instructions[value]

def api(url,payload,key='',claude=False):
    headers={'Content-Type':'application/json'}
    if key: headers['x-api-key' if claude else 'Authorization']=key if claude else 'Bearer '+key
    if claude: headers['anthropic-version']='2023-06-01'
    with urllib.request.urlopen(urllib.request.Request(url,data=json.dumps(payload).encode(),headers=headers),timeout=600) as r:
        return json.load(r)

def work(job,d):
    try:
        p=hub.validate_project(d['project'])
        mode=d.get('mode','local'); model=d.get('model','').strip(); key=d.get('key','')
        if d.get('privacy') in ('offline','incognito') and mode != 'local':
            raise ValueError('Offline and Incognito chat require the local model.')
        thread_mode_note = thread_instruction(d.get('thread_mode','chat'))
        if mode!='local' and not key: raise ValueError('Enter an API key in Connections first.')
        if mode not in ('local','free') and not d.get('paid'): raise ValueError('Enable paid API use in Connections first.')
        incognito=d.get('privacy')=='incognito'
        hp=history(str(p)); messages=[] if incognito else (json.loads(hp.read_text()) if hp.exists() else [])
        prompt=d['message'].strip()
        if not prompt: raise ValueError('Write a message first.')
        readiness=(ROOT/'SALES_READINESS.md').read_text()
        system='You are Tay, a practical personal coding assistant. Speak plainly. Current project: '+str(p)+'. You are in chat mode: you cannot execute commands or edit files from this chat. Never claim otherwise. The Coding tools button opens the working Aider agent. Only explicitly attached files are visible. Do not claim access to other chats or accounts.\n\nSALES READINESS SOURCE OF TRUTH:\n'+readiness+'\nWhen discussing products, offers, or revenue, obey this source: never sell a capability outside its listed readiness level, and never promise outcomes without evidence.'
        system+='\n\nCURRENT THREAD MODE: '+thread_mode_note
        files=d.get('files',[])
        if len(files)>5: raise ValueError('Attach up to five text files at a time.')
        for f in files:
            fp=(p/f).resolve()
            if p not in fp.parents or not fp.is_file(): raise ValueError('File must be inside the selected project.')
            if fp.stat().st_size>40000: raise ValueError('Choose files smaller than 40 KB.')
            if fp.name.startswith('.env') or any(x in ('.git','.godot') for x in fp.relative_to(p).parts): raise ValueError('That internal or credential file cannot be attached.')
            system+='\nAttached reference file '+f+':\n'+fp.read_text()
        if not incognito:
            # Persist each user turn before the provider runs so a failed or
            # long-running reply never loses the conversation input.
            messages.append({'role':'user','content':prompt})
            hp.write_text(json.dumps(messages,indent=2))
        outgoing=[{'role':'system','content':system}]+[{'role':m['role'],'content':m['content']} for m in messages[-12:]]+([] if not incognito else [{'role':'user','content':prompt}])
        if mode=='local':
            r=api('http://127.0.0.1:11434/api/chat',{'model':'qwen2.5-coder:7b','messages':outgoing,'stream':False,'options':{'num_ctx':8192,'num_predict':1536}})
            answer=r['message']['content']
        elif mode=='claude':
            if not model: raise ValueError('Enter a Claude model ID in Connections.')
            r=api('https://api.anthropic.com/v1/messages',{'model':model,'system':system,'messages':outgoing[1:],'max_tokens':2048},key,True)
            answer='\n'.join(x['text'] for x in r['content'] if x['type']=='text')
        else:
            endpoints={'free':'https://openrouter.ai/api/v1/chat/completions','router':'https://openrouter.ai/api/v1/chat/completions','openai':'https://api.openai.com/v1/chat/completions','perplexity':'https://api.perplexity.ai/v1/sonar'}
            if mode not in endpoints: raise ValueError('Unknown provider.')
            model='openrouter/free' if mode=='free' else ('sonar' if mode=='perplexity' else model)
            if not model: raise ValueError('Enter a model ID in Connections.')
            r=api(endpoints[mode],{'model':model,'messages':outgoing},key)
            answer=r['choices'][0]['message']['content'] or '(No text returned.)'
            if r.get('citations'): answer+='\n\nSources:\n'+'\n'.join(r['citations'])
        if not incognito:
            messages.append({'role':'assistant','content':answer})
            hp.write_text(json.dumps(messages,indent=2))
        JOBS[job]={'done':True,'answer':answer}
    except urllib.error.HTTPError as e: JOBS[job]={'done':True,'error':'Provider returned HTTP '+str(e.code)+'. Check the API key, model access, and quota. No fallback was used.'}
    except Exception as e: JOBS[job]={'done':True,'error':str(e)}
    finally: LOCK.release()

class Handler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()
    def log_message(self,*args): pass
    def send(self,obj,status=200):
        data=json.dumps(obj).encode(); self.send_response(status); self.send_header('Content-Type','application/json'); self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data)
    def do_GET(self):
        if self.path=='/assets/tay-command-v1.png':
            data=(ROOT/'window/assets/tay-command-v1.png').read_bytes()
            self.send_response(200);self.send_header('Content-Type','image/png');self.end_headers();self.wfile.write(data)
        elif self.path=='/':
            data=(ROOT/'window/index.html').read_text().replace('__TOKEN__',TOKEN).replace('</head>','<link rel="stylesheet" href="/enhance.css"><link rel="stylesheet" href="/selfdev.css"><link rel="stylesheet" href="/custom.css"></head>').replace('</body>','<script src="/enhance.js"></script><script src="/enhancements.js"></script><script src="/selfdev.js"></script><script src="/custom.js"></script></body>').encode()
            self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data)
        elif self.path=='/enhance.js':
            data=(ROOT/'window/enhance.js').read_bytes(); self.send_response(200); self.send_header('Content-Type','application/javascript'); self.end_headers(); self.wfile.write(data)
        elif self.path=='/enhance.css':
            data=(ROOT/'window/enhance.css').read_bytes(); self.send_response(200); self.send_header('Content-Type','text/css'); self.end_headers(); self.wfile.write(data)
        elif self.path=='/enhancements.js':
            data=(ROOT/'window/enhancements.js').read_bytes(); self.send_response(200); self.send_header('Content-Type','application/javascript'); self.end_headers(); self.wfile.write(data)
        elif self.path in ('/selfdev.js','/selfdev.css','/custom.css','/custom.js'):
            p=ROOT/'window'/self.path[1:]
            data=p.read_bytes() if p.exists() else b''
            self.send_response(200); self.send_header('Content-Type','application/javascript' if self.path.endswith('.js') else 'text/css'); self.end_headers(); self.wfile.write(data)
        elif self.path=='/selfdev/recovery':
            data=(ROOT/'window/recovery.html').read_text().replace('__TOKEN__',TOKEN).encode()
            self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(data)
        elif self.path=='/health': self.send({'app':'tay-window','selfdev':True})
        else: self.send({'error':'Not found'},404)
    def do_POST(self):
        if self.headers.get('X-Tay-Token')!=TOKEN: return self.send({'error':'Forbidden'},403)
        if self.headers.get('Origin') not in (None,'http://127.0.0.1:'+str(PORT)): return self.send({'error':'Forbidden'},403)
        try:
            n=int(self.headers.get('Content-Length','0'))
            if n>200000: raise ValueError('Request too large.')
            d=json.loads(self.rfile.read(n))
            if self.path=='/selfdev/chat':
                if not LOCK.acquire(False): raise ValueError('Tay is still working on the previous request.')
                jid=uuid.uuid4().hex; JOBS[jid]={'done':False,'kind':'selfdev','progress':'Reading Tay interface code…'}
                threading.Thread(target=selfdev_work,args=(jid,d),daemon=True).start();return self.send({'job':jid})
            if self.path=='/selfdev/state': return self.send(selfdev.state(d.get('privacy')=='incognito'))
            if self.path=='/selfdev/preview': return self.send(selfdev.preview(d['id']))
            if self.path in ('/selfdev/apply','/selfdev/undo','/selfdev/discard','/selfdev/new'):
                if not LOCK.acquire(False): raise ValueError('Wait for the current request before changing files.')
                try:
                    action=self.path.rsplit('/',1)[1]
                    result=selfdev.new_chat(d.get('privacy')=='incognito') if action=='new' else getattr(selfdev,action)(d['id'])
                    return self.send(result)
                finally: LOCK.release()
            if self.path=='/record-action':
                if LOCK.locked(): raise ValueError('Wait for the current reply.')
                if d.get('privacy') == 'incognito': return self.send({'ok':True})
                hp=history(d['project']);ms=json.loads(hp.read_text()) if hp.exists() else []
                ms.extend([{'role':'user','content':d['message']},{'role':'assistant','content':d['answer']}]);hp.write_text(json.dumps(ms));return self.send({'ok':True})
            if self.path=='/foundry': return self.send({'items':foundry.listing(),'stages':foundry.STAGES})
            if self.path=='/opportunity': return self.send({'id':foundry.capture(d)})
            if self.path=='/opportunity-update':
                foundry.update(d);return self.send({'ok':True})
            if self.path=='/archives':
                folder=history(d['project']).parent
                return self.send({'items':[{'id':x.name,'date':x.stat().st_mtime} for x in sorted(folder.glob('chat-*.json'),key=lambda x:x.stat().st_mtime,reverse=True)]})
            if self.path=='/archive-read':
                name=d['id']
                if '/' in name or not name.startswith('chat-') or not name.endswith('.json'): raise ValueError('Invalid conversation.')
                return self.send({'messages':json.loads((history(d['project']).parent/name).read_text())})
            if self.path=='/engines': return self.send(engines.status())
            if self.path=='/engine-open': return self.send({'message':engines.launch(d['kind'],hub.validate_project(d['project']))})
            if self.path=='/state':
                ps=projects(); p=d.get('project') or ps[0]; hp=history(p)
                return self.send({'projects':ps,'project':p,'messages':json.loads(hp.read_text()) if hp.exists() else []})
            if self.path=='/add':
                p=hub.validate_project(d['project']); ps=projects()
                if str(p) not in ps: ps.append(str(p))
                (ROOT/'projects.json').write_text(json.dumps(ps)); return self.send({'project':str(p)})
            if self.path=='/chat':
                if not LOCK.acquire(False): raise ValueError('Tay is still working on the previous message.')
                jid=uuid.uuid4().hex; JOBS[jid]={'done':False}
                threading.Thread(target=work,args=(jid,d),daemon=True).start(); return self.send({'job':jid})
            if self.path=='/job': return self.send(JOBS.get(d['job'],{'done':True,'error':'Session expired.'}))
            if self.path=='/new':
                if LOCK.locked(): raise ValueError('Wait for the current response before starting a new chat.')
                hp=history(d['project'])
                if hp.exists(): hp.rename(hp.with_name('chat-'+uuid.uuid4().hex[:10]+'.json'))
                return self.send({'ok':True})
            if self.path=='/save-thread':
                hp=history(d['project'])
                if not hp.exists(): raise ValueError('There is no conversation to save yet.')
                name='chat-'+uuid.uuid4().hex[:10]+'.json'; (hp.parent/name).write_text(hp.read_text())
                return self.send({'ok':True,'id':name})
            if self.path=='/tools':
                subprocess.Popen(['open',str(ROOT/'Tay Tools.command')]); return self.send({'ok':True})
            if self.path=='/speak':
                text=d['text'][:10000]
                if d.get('voice')=='elevenlabs':
                    if not d.get('key') or not d.get('voice_id'): raise ValueError('Enter an ElevenLabs key and voice ID.')
                    if not d.get('paid'): raise ValueError('Enable voice API usage first.')
                    voice=d['voice_id']
                    if not voice.isalnum(): raise ValueError('Invalid voice ID.')
                    audio=hub.request('https://api.elevenlabs.io/v1/text-to-speech/'+voice,d['key'],{'text':text,'model_id':'eleven_multilingual_v2'},eleven=True)
                    out=ROOT/'window'/('voice-'+uuid.uuid4().hex+'.mp3');out.write_bytes(audio)
                    subprocess.Popen(['/usr/bin/afplay',str(out)])
                else: subprocess.Popen(['/usr/bin/say','--',text])
                return self.send({'ok':True})
            self.send({'error':'Not found'},404)
        except Exception as e: self.send({'error':str(e)},400)


# Transcenlutions canonical command runtime extension
from tay_runtime.bridge import install as install_command_runtime
Handler = install_command_runtime(Handler, globals())

if __name__=='__main__': ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()
