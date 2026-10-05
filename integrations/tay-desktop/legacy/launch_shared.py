"""Open the repository's shared Tay app on a Mac loopback listener.

This is an optional launcher. It never installs packages, replaces the existing
Mac server, imports legacy chats, or creates a second implementation of Tay.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


def repository_root(value):
    root = Path(value).expanduser().resolve()
    package = root / 'package.json'
    if not package.is_file() or not (root / 'app/page.tsx').is_file():
        raise ValueError('Choose the Transcenlutions repository checkout.')
    if json.loads(package.read_text()).get('name') != 'transcenlutions':
        raise ValueError('This checkout is not the Transcenlutions shared app.')
    return root


def bridge_url(value):
    parsed = urllib.parse.urlsplit(value)
    if (parsed.scheme != 'http' or parsed.hostname not in {'127.0.0.1', 'localhost'}
            or parsed.username or parsed.password or parsed.query or parsed.fragment
            or parsed.path not in {'', '/'}):
        raise ValueError('The desktop bridge must point to the existing loopback Tay server.')
    if not parsed.port:
        raise ValueError('Set the existing desktop server port in the bridge URL.')
    # The existing Python service binds IPv4 and expects this Origin for /state.
    return 'http://127.0.0.1:' + str(parsed.port)


def available_port(value):
    port = int(value)
    if not 1024 <= port <= 65535:
        raise ValueError('Choose a port between 1024 and 65535.')
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', port))
    return port


def executable(name):
    found = shutil.which(name)
    bundled = Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin' / name
    result = found or (str(bundled) if bundled.is_file() else None)
    if not result:
        raise ValueError('Install the repository-required Node.js runtime before launching Tay.')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--checkout', default=os.environ.get('TAY_REPOSITORY_ROOT', str(Path(__file__).resolve().parents[3])))
    parser.add_argument('--port', type=int, default=18745)
    parser.add_argument('--build', action='store_true', help='Explicitly run the shared app production build before launch.')
    parser.add_argument('--no-open', action='store_true', help='Start the loopback app without opening a Chrome window.')
    args = parser.parse_args()
    root = repository_root(args.checkout)
    port = available_port(args.port)
    bridge = bridge_url(os.environ.get('TAY_DESKTOP_BRIDGE_URL', 'http://127.0.0.1:18743'))
    node = executable('node')
    next_bin = root / 'node_modules/next/dist/bin/next'
    if not next_bin.is_file():
        raise ValueError('Install this checkout’s locked dependencies before launching. The launcher will not install them.')
    env = os.environ.copy()
    env['TAY_DESKTOP_BRIDGE_URL'] = bridge
    env['PATH'] = str(Path(node).parent) + os.pathsep + env.get('PATH', '')
    if args.build:
        subprocess.run([node, str(next_bin), 'build'], cwd=root, env=env, check=True)
    if not (root / '.next-desktop/BUILD_ID').is_file():
        raise ValueError('Build this checkout first, or use --build to explicitly build it now.')
    state = Path.home() / 'Library/Application Support/Transcenlutions/Tay Shared'
    state.mkdir(parents=True, exist_ok=True, mode=0o700)
    log_path = state / 'shared-server.log'
    url = 'http://127.0.0.1:' + str(port)
    with log_path.open('a') as log:
        process = subprocess.Popen([node, str(next_bin), 'start', '--hostname', '127.0.0.1', '--port', str(port)],
                                   cwd=root, env=env, stdin=subprocess.DEVNULL,
                                   stdout=log, stderr=log, start_new_session=True)
    ready = False
    for _ in range(80):
        if process.poll() is not None:
            break
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                ready = response.status == 200
        except (urllib.error.URLError, TimeoutError):
            pass
        if ready:
            break
        time.sleep(.25)
    if not ready:
        if process.poll() is None:
            process.terminate()
        raise ValueError('Shared Tay could not start. See ' + str(log_path))
    print('Shared Tay: ' + url + '\nServer PID: ' + str(process.pid) + '\nLog: ' + str(log_path))
    if not args.no_open:
        if sys.platform != 'darwin' or not Path('/Applications/Google Chrome.app').is_dir():
            print('Open the loopback URL in your browser.')
        else:
            subprocess.run(['open', '-na', 'Google Chrome', '--args',
                            '--user-data-dir=' + str(state / 'browser'), '--app=' + url,
                            '--window-size=1280,850'], check=True)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error))
