"""Isolated browser fixture; never reads chats or calls a model provider."""
import argparse
import json
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from tay_runtime.bridge import install

parser=argparse.ArgumentParser()
parser.add_argument('--desktop-root',type=Path,required=True)
parser.add_argument('--port',type=int,default=18744)
args=parser.parse_args()
gate=threading.Event()
tmp=tempfile.TemporaryDirectory(prefix='tay-queue-test-')
root=Path(tmp.name)
(root/'window').mkdir()
(root/'window/index.html').write_text((args.desktop_root/'window/index.html').read_text())

class Base(BaseHTTPRequestHandler):
    def log_message(self,*a):pass
    def send(self,obj,status=200):
        raw=json.dumps(obj).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(raw)
    def do_GET(self):
        safe={'enhance.js','enhancements.js','selfdev.js','enhance.css','selfdev.css','custom.css','custom.js','assets/tay-command-v1.png'}
        name=self.path.lstrip('/')
        if name not in safe:return self.send({'error':'Not found'},404)
        path=args.desktop_root/'window'/name
        raw=path.read_bytes() if path.exists() else b''
        self.send_response(200);self.send_header('Content-Type','image/png' if name.endswith('.png') else 'text/css' if name.endswith('.css') else 'application/javascript');self.end_headers();self.wfile.write(raw)
    def do_POST(self):
        n=int(self.headers.get('Content-Length',0));self.rfile.read(n)
        if self.path=='/test/release':gate.set();return self.send({'ok':True})
        if self.path=='/state':return self.send({'projects':[str(root)],'project':str(root),'messages':[]})
        if self.path=='/archives':return self.send({'items':[]})
        if self.path=='/selfdev/state':return self.send({'messages':[],'proposals':[]})
        if self.path=='/record-action':return self.send({'ok':True})
        return self.send({'error':'Fixture route unavailable'},404)

def provider(url,payload,*args):
    if not gate.wait(60):raise TimeoutError('Test release not received')
    return {'message':{'content':'[Test provider] '+payload['messages'][-1]['content']}}

env={'ROOT':root,'TOKEN':'fixture-token','PORT':args.port,'LOCK':threading.Lock(),
     'hub':SimpleNamespace(validate_project=lambda p:Path(p)),'api':provider,'thread_instruction':lambda m:m}
server=ThreadingHTTPServer(('127.0.0.1',args.port),install(Base,env))
print('Queue browser fixture ready',flush=True)
try:server.serve_forever()
finally:server.server_close();tmp.cleanup()
