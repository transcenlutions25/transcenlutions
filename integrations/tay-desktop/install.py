"""Install the versioned extension into Tay's existing desktop server.

Does not copy private chats, browser profiles or credentials into this repo.
Does not restart a running server. Source changes and an undo copy are recorded.
"""
import argparse
import hashlib
import json
import shutil
import time
from pathlib import Path

HOOK = '\n# Transcenlutions canonical command runtime extension\nfrom tay_runtime.bridge import install as install_command_runtime\nHandler = install_command_runtime(Handler, globals())\n'
ANCHOR = "if __name__=='__main__': ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()"


def install(target):
    source = Path(__file__).parent / 'tay_runtime'
    window = target / 'window'
    server = window / 'server.py'
    text = server.read_text()
    if ANCHOR not in text:
        raise ValueError('The desktop server entry point changed. Review integration before installing.')
    destination = window / 'tay_runtime'
    manifest_path = destination / 'installed-files.json'
    previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    files = [p for p in source.iterdir() if p.suffix in {'.py', '.js', '.css'}]
    for file in files:
        existing = destination / file.name
        if existing.exists():
            digest = hashlib.sha256(existing.read_bytes()).hexdigest()
            if digest not in {previous.get(file.name), hashlib.sha256(file.read_bytes()).hexdigest()}:
                raise ValueError('Local runtime file changed: ' + file.name + '. Review it before installing.')
    backup = window / 'change-backups' / ('queue-' + time.strftime('%Y%m%d-%H%M%S'))
    backup.mkdir(parents=True, exist_ok=False)
    shutil.copy2(server, backup / 'server.py')
    if destination.exists():
        shutil.copytree(destination, backup / 'tay_runtime', ignore=shutil.ignore_patterns('__pycache__'))
    destination.mkdir(exist_ok=True)
    manifest = {}
    for file in files:
        shutil.copy2(file, destination / file.name)
        manifest[file.name] = hashlib.sha256(file.read_bytes()).hexdigest()
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    if HOOK not in text:
        temp = server.with_suffix('.queue-tmp')
        temp.write_text(text.replace(ANCHOR, HOOK + '\n' + ANCHOR))
        temp.replace(server)
    print('Installed command runtime. Recovery copy: ' + str(backup))
    print('Restart the desktop server when no legacy job is running, then refresh Tay.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', type=Path, default=Path.home() / 'Tay')
    install(parser.parse_args().target)
