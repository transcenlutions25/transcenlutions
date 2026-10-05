"""Explicit session-level model choice for Tay. Does not store API keys."""
import getpass
import os
from pathlib import Path
import subprocess
import time
import urllib.request

ROOT = Path('/Users/transcenlutionsllc/Tay')

def select_model(choice, paid_model=''):
    if choice in ('', '1'):
        return 'ollama_chat/qwen2.5-coder:7b'
    if choice == '2':
        return 'openrouter/openrouter/free'
    if choice == '3':
        slug = paid_model.strip()
        if not slug or '/' not in slug or any(c.isspace() for c in slug):
            raise ValueError('Enter a provider/model ID from the OpenRouter model page.')
        return 'openrouter/' + slug
    raise ValueError('Choose 1, 2, or 3.')

def main():
    print('Tay — choose a connection for this session')
    print('1. Local / offline model — no API charges (default)')
    print('2. Free online API — OpenRouter free models, usage limits apply')
    print('3. Paid online API — choose an OpenRouter model')
    choice = input('Mode [1]: ').strip()
    slug = ''
    if choice == '3':
        print('Choose a model and check its price at https://openrouter.ai/models')
        slug = input('Provider/model ID: ')
    model = select_model(choice, slug)
    env = os.environ.copy()
    # Avoid inherited provider keys enabling an unintended provider switch.
    for key in list(env):
        if key.endswith('_API_KEY'):
            env.pop(key)
    env.update(AIDER_ANALYTICS='false', LITELLM_LOCAL_MODEL_COST_MAP='True',
               OLLAMA_API_BASE='http://127.0.0.1:11434')
    if choice in ('2', '3'):
        print('Online mode sends your prompts and included project context to OpenRouter and its model provider.')
        if choice == '3' and input('Type PAID to enable billable requests this session: ').strip() != 'PAID':
            print('Cancelled. No API request made.')
            return
        print('Create a key at https://openrouter.ai/settings/keys')
        key = getpass.getpass('OpenRouter API key (hidden; not saved): ').strip()
        if not key:
            print('No key entered. No API request made.')
            return
        env['OPENROUTER_API_KEY'] = key
    else:
        for attempt in range(31):
            try:
                urllib.request.urlopen('http://127.0.0.1:11434/api/tags', timeout=2).close()
                break
            except OSError:
                if attempt == 0:
                    subprocess.run(['open', '-a', 'Ollama'], check=False)
                if attempt == 30:
                    raise RuntimeError('Ollama did not start. Open Ollama and try again.')
                time.sleep(1)
    print('Selected:', model)
    print('No automatic fallback to another mode. Use /exit and reopen Tay to change modes.')
    print('Manual /model changes inside Aider can override this selection.')
    args = ['/Users/transcenlutionsllc/.local/bin/aider', '--config', str(ROOT/'config.yml'),
            '--env-file', str(ROOT/'empty.env'), '--model', model,
            '--weak-model', model, '--editor-model', model]
    subprocess.run(args, cwd='/Users/transcenlutionsllc/crowne-legacy', env=env, check=False)

if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError) as exc:
        print(exc)
    except (KeyboardInterrupt, EOFError):
        print('\nCancelled.')
