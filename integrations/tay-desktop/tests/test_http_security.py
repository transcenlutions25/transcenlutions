import http.client
import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tay_runtime.bridge import install


class HTTPBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.received = []
        received = self.received
        class Base(BaseHTTPRequestHandler):
            def log_message(self, *args): pass
            def send(self, obj, status=200):
                body = json.dumps(obj).encode()
                self.send_response(status)
                self.send_header('Content-Type', 'application/json')
                self.end_headers(); self.wfile.write(body)
            def do_POST(self):
                received.append(json.loads(self.rfile.read(int(self.headers['Content-Length']))))
                self.send({'ok': True})
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Base)
        self.port = self.server.server_address[1]
        self.server.RequestHandlerClass = install(Base, {'PORT': self.port, 'TOKEN': 'fixture-only'})
        self.worker = threading.Thread(target=self.server.serve_forever, daemon=True); self.worker.start()

    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.worker.join()

    def call(self, body=None, headers=None, method='POST', path='/chat'):
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=2)
        try:
            conn.request(method, path, body=body, headers={'Content-Type': 'application/json', 'X-Tay-Token': 'fixture-only', **(headers or {})})
            response = conn.getresponse(); response.read(); return response.status
        finally: conn.close()

    def test_legacy_boundary_and_environment_credentials(self):
        self.assertEqual(self.call('null'), 400)
        self.assertEqual(self.call('{"constructor":{}}'), 400)
        self.assertEqual(self.call('{}', {'Content-Type': 'text/plain'}), 415)
        self.assertEqual(self.call('{}', {'Origin': 'https://evil.example'}), 403)
        self.assertEqual(self.call('{}', {'X-Tay-Token': 'wrong'}), 403)
        self.assertEqual(self.call('{"key":"browser-secret"}'), 400)
        self.assertEqual(self.received, [])
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'server-fixture'}):
            self.assertEqual(self.call('{"mode":"openai"}'), 200)
        self.assertEqual(self.received[0]['key'], 'server-fixture')

    def test_rate_limit_covers_read_and_write(self):
        for _ in range(600):
            self.assertEqual(self.call(method='GET', path='/runtime/health'), 200)
        self.assertEqual(self.call(method='GET', path='/runtime/health'), 429)
        self.assertEqual(self.call('{}'), 429)
