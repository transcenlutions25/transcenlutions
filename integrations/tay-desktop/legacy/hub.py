"""Tay project hub. Standard library only; credentials remain in memory."""
import datetime
import getpass
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.request
import urllib.error
import choose_mode

ROOT = Path(__file__).resolve().parent
HOME = Path.home()
SITES = {'ChatGPT':'https://chatgpt.com', 'Claude':'https://claude.ai',
         'Perplexity':'https://www.perplexity.ai', 'ElevenLabs':'https://elevenlabs.io/app'}

def validate_project(raw):
    p = Path(raw).expanduser().resolve()
    if not p.is_dir():
        raise ValueError('That folder does not exist.')
    synced = HOME/'.codex/.chatgpt-projects'
    if p == synced or synced in p.parents:
        raise ValueError('Synced ChatGPT references are read-only. Choose a working project folder.')
    return p

def project_state(project):
    folder = ROOT/'projects'/hashlib.sha256(str(project).encode()).hexdigest()[:16]
    folder.mkdir(parents=True, exist_ok=True)
    (folder/'project-path.txt').write_text(str(project))
    notes = folder/'NOTES.md'
    if not notes.exists():
        notes.write_text('# Project notes\n\nWorking folder: '+str(project)+'\nRecord durable project decisions here.\n')
    return folder

def pick_project():
    saved = ROOT/'projects.json'
    paths = [HOME/'crowne-legacy']
    if (HOME/'Projects').exists():
        paths += sorted(p for p in (HOME/'Projects').iterdir() if p.is_dir())
    if saved.exists():
        paths += [Path(x) for x in json.loads(saved.read_text())]
    paths = list(dict.fromkeys(p.resolve() for p in paths if p.is_dir()))
    for i,p in enumerate(paths,1): print(str(i)+'. '+p.name+' — '+str(p))
    raw = input('Project number [1], or paste another folder path: ').strip() or '1'
    p = validate_project(paths[int(raw)-1] if raw.isdigit() and 1<=int(raw)<=len(paths) else raw)
    if p not in paths: paths.append(p)
    saved.write_text(json.dumps([str(x) for x in paths],indent=2))
    return p

def credential(provider):
    print(provider+': this uses an API account; charges or account quotas may apply.')
    print('Only the text/context you choose is sent. Keys are hidden and not saved.')
    value = getpass.getpass(provider+' API key (blank cancels): ').strip()
    if not value: raise ValueError('Cancelled; no request made.')
    return value

def request(url, key, payload=None, eleven=False):
    headers = {'Content-Type':'application/json'}
    headers['xi-api-key' if eleven else 'Authorization'] = key if eleven else 'Bearer '+key
    req = urllib.request.Request(url, data=json.dumps(payload).encode() if payload is not None else None, headers=headers)
    with urllib.request.urlopen(req,timeout=120) as result: return result.read()

def research(folder):
    question = input('Research question (only this text will be sent): ').strip()
    if not question: return
    key = credential('Perplexity')
    response = json.loads(request('https://api.perplexity.ai/v1/sonar',key,
        {'model':'sonar','messages':[{'role':'user','content':question}]}))
    answer = response['choices'][0]['message']['content']
    citations = response.get('citations',[])
    text = '# Research\n\n'+question+'\n\n'+answer+'\n\n'+ '\n'.join(str(x) for x in citations)
    out = folder/('research-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'.md')
    out.write_text(text)
    print(answer+'\nSaved: '+str(out)+'\nUse /read-only '+str(out)+' in your coding session to include it.')

def speak(folder):
    text = input('Text for Tay to speak: ').strip()
    if not text: return
    if input('1. Free Mac voice  2. ElevenLabs API [1]: ').strip() != '2':
        subprocess.run(['/usr/bin/say', '--', text],check=True)
        return
    key = credential('ElevenLabs')
    voices = json.loads(request('https://api.elevenlabs.io/v2/voices?page_size=100',key,eleven=True)).get('voices',[])
    if not voices: raise ValueError('No voices available on this account.')
    for i,v in enumerate(voices,1): print(str(i)+'. '+v.get('name',v['voice_id']))
    idx=int(input('Voice number [1]: ').strip() or '1')-1
    if not 0<=idx<len(voices): raise ValueError('Invalid voice number.')
    data=request('https://api.elevenlabs.io/v1/text-to-speech/'+voices[idx]['voice_id'],key,
        {'text':text,'model_id':'eleven_multilingual_v2'},eleven=True)
    out=folder/('voice-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'.mp3')
    out.write_bytes(data)
    print('Saved: '+str(out))
    subprocess.run(['/usr/bin/afplay',str(out)],check=False)

def code(project,folder):
    print('1. Local (default)  2. Free OpenRouter  3. Paid OpenRouter\n4. OpenAI API  5. Claude API')
    choice=input('Coding mode [1]: ').strip() or '1'
    env=os.environ.copy()
    for k in list(env):
        if k.endswith('_API_KEY') or k.startswith('AIDER_'): env.pop(k)
    env.update(OLLAMA_API_BASE='http://127.0.0.1:11434',LITELLM_LOCAL_MODEL_COST_MAP='True',AIDER_ANALYTICS='false')
    if choice=='1':
        model=choose_mode.select_model('1')
        try: urllib.request.urlopen(env['OLLAMA_API_BASE']+'/api/tags',timeout=3).close()
        except OSError:
            subprocess.run(['open','-a','Ollama'],check=False)
            print('Ollama is opening. Select coding again once it is ready.'); return
    elif choice in ('2','3','4','5'):
        if choice=='2': model=choose_mode.select_model('2')
        else:
            slug=input('Exact model ID from your provider (OpenRouter: provider/model): ').strip()
            if not slug or any(c.isspace() for c in slug): raise ValueError('A model ID is required.')
            model=choose_mode.select_model('3',slug) if choice=='3' else ('openai/' if choice=='4' else 'anthropic/')+slug
            if input('Type PAID to enable billable requests for this session: ').strip()!='PAID': return
        provider,variable={'2':('OpenRouter','OPENROUTER_API_KEY'),'3':('OpenRouter','OPENROUTER_API_KEY'),
            '4':('OpenAI','OPENAI_API_KEY'),'5':('Anthropic','ANTHROPIC_API_KEY')}[choice]
        env[variable]=credential(provider)
    else: raise ValueError('Choose 1–5.')
    config=folder/'config.yml'
    settings={'model':model,'edit-format':'whole','analytics':False,'check-update':False,'show-release-notes':False,
        'suggest-shell-commands':True,'read':[str(ROOT/'GENERAL.md'),str(folder/'NOTES.md')],
        'input-history-file':str(folder/'input.txt'),'chat-history-file':str(folder/'chat.md')}
    if project==HOME/'crowne-legacy': settings['read'].append(str(ROOT/'TAY.md'))
    # JSON scalar values are valid YAML and safely quote file paths.
    config.write_text('\n'.join(k+': '+json.dumps(v) for k,v in settings.items())+'\n')
    print('Working in '+str(project)+' with '+model+'. /exit returns to the hub.')
    print('No automatic provider fallback. Manual /model changes override the selection.')
    subprocess.run([str(HOME/'.local/bin/aider'),'--config',str(config),'--env-file',str(ROOT/'empty.env'),
        '--model',model,'--weak-model',model,'--editor-model',model],cwd=project,env=env,check=False)

def main():
    print('TAY — projects, coding, research and voice')
    project=pick_project()
    while True:
        folder=project_state(project)
        print('\nProject: '+project.name+'\n1. Code / chat\n2. Perplexity research API\n3. Speak text\n4. Open a service website (manual use)\n5. Switch project\n6. Open project notes\n0. Quit')
        try:
            c=input('Choice: ').strip()
            if c=='0': return
            if c=='1': code(project,folder)
            elif c=='2': research(folder)
            elif c=='3': speak(folder)
            elif c=='4':
                names=list(SITES)
                for i,n in enumerate(names,1): print(str(i)+'. '+n)
                i=int(input('Service: '))-1
                if not 0<=i<len(names): raise ValueError('Invalid service.')
                subprocess.run(['open',SITES[names[i]]],check=False)
                print('Website opened for manual use; Tay does not control or read this session.')
            elif c=='5': project=pick_project()
            elif c=='6': subprocess.run(['open','-e',str(folder/'NOTES.md')],check=False)
        except urllib.error.HTTPError as e: print('Service returned HTTP '+str(e.code)+'. Check API key, quota and model access. No fallback attempted.')
        except (ValueError,OSError,KeyError,IndexError) as e: print('Could not complete action: '+str(e))

if __name__=='__main__':
    try: main()
    except (EOFError,KeyboardInterrupt): print('\nTay closed.')
    except (ValueError,OSError) as e: print(str(e))
