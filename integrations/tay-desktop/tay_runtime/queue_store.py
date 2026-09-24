"""Durable objective state, transactional claims, and local operational events."""
import json
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path

TERMINAL = {'completed', 'cancelled', 'failed'}
AGENTS = {'tay', 'dawn', 'kj'}
MODES = {'local', 'free', 'router', 'openai', 'claude', 'perplexity'}


class QueueStore:
    def __init__(self, path):
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.tx() as db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS sessions (
                  id TEXT PRIMARY KEY, project TEXT NOT NULL, created REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS conversation_context (
                  session_id TEXT PRIMARY KEY, messages TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS objectives (
                  id TEXT PRIMARY KEY, session_id TEXT NOT NULL, request_id TEXT NOT NULL,
                  payload TEXT NOT NULL, status TEXT NOT NULL, position INTEGER NOT NULL,
                  created REAL NOT NULL, updated REAL NOT NULL, revision INTEGER NOT NULL DEFAULT 0,
                  claimed_revision INTEGER, attempts INTEGER NOT NULL DEFAULT 0,
                  pending_operation TEXT, result TEXT, error TEXT,
                  UNIQUE(session_id, request_id));
                CREATE INDEX IF NOT EXISTS objective_schedule ON objectives(status, position, created);
                CREATE INDEX IF NOT EXISTS objective_session ON objectives(session_id, created);
                CREATE TABLE IF NOT EXISTS events (
                  sequence INTEGER PRIMARY KEY AUTOINCREMENT, objective_id TEXT NOT NULL,
                  kind TEXT NOT NULL, detail TEXT NOT NULL, occurred REAL NOT NULL);
            ''')
            for row in db.execute("SELECT id,pending_operation FROM objectives WHERE status='active'").fetchall():
                cancelled = row['pending_operation'] == 'cancel'
                db.execute("UPDATE objectives SET status=?, pending_operation=NULL, error=?, updated=? WHERE id=?",
                           ('cancelled' if cancelled else 'paused', None if cancelled else 'Server restarted during work. Review and resume this objective.', time.time(), row['id']))
                self.event(db, row['id'], 'cancelled' if cancelled else 'interrupted', {})

    @contextmanager
    def tx(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            db.execute('PRAGMA journal_mode=WAL')
            db.execute('BEGIN IMMEDIATE')
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    def event(self, db, ident, kind, detail):
        db.execute('INSERT INTO events(objective_id,kind,detail,occurred) VALUES(?,?,?,?)',
                   (ident, kind, json.dumps(detail), time.time()))

    @staticmethod
    def item(row):
        if row is None:
            raise ValueError('Objective not found.')
        value = dict(row)
        value['payload'] = json.loads(value['payload'])
        value['result'] = json.loads(value['result']) if value['result'] else None
        return value

    def session(self, project, new=False):
        with self.tx() as db:
            row = db.execute('SELECT id FROM sessions WHERE project=? ORDER BY created DESC LIMIT 1', (project,)).fetchone()
            if row and not new:
                return row['id']
            ident = uuid.uuid4().hex
            db.execute('INSERT INTO sessions VALUES(?,?,?)', (ident, project, time.time()))
            return ident

    def sessions(self, project):
        with self.tx() as db:
            return [dict(row) for row in db.execute('SELECT * FROM sessions WHERE project=? ORDER BY created DESC', (project,))]

    def verify_session(self, ident, project=None):
        with self.tx() as db:
            row = db.execute('SELECT * FROM sessions WHERE id=?', (ident,)).fetchone()
            if not row or (project is not None and row['project'] != project):
                raise ValueError('Conversation does not belong to this project.')
            return dict(row)

    def seed_context(self, session_id, messages):
        with self.tx() as db:
            db.execute('INSERT OR IGNORE INTO conversation_context VALUES(?,?)', (session_id, json.dumps(messages)))

    def context(self, session_id):
        with self.tx() as db:
            row = db.execute('SELECT messages FROM conversation_context WHERE session_id=?', (session_id,)).fetchone()
            return json.loads(row['messages']) if row else None

    def validate(self, payload):
        if not isinstance(payload, dict):
            raise ValueError('An objective is required.')
        message = payload.get('message')
        if not isinstance(message, str) or not message.strip() or len(message) > 16000:
            raise ValueError('Use an objective between 1 and 16,000 characters.')
        agent = payload.get('agent_id', 'tay')
        if agent not in AGENTS:
            raise ValueError('Choose Tay, Dawn, or KJ. Rory is awaiting child-safety controls.')
        mode = payload.get('mode', 'local')
        privacy = payload.get('privacy', 'offline')
        if mode not in MODES or privacy not in {'offline', 'online'}:
            raise ValueError('Persistent queue supports Offline or Online. Incognito uses temporary chat.')
        if privacy == 'offline' and mode != 'local':
            raise ValueError('Offline objectives require the local model.')
        thread_mode = payload.get('thread_mode', 'chat')
        if thread_mode not in {'chat', 'plan', 'execute'}:
            raise ValueError('Self-dev remains in its existing preview/apply workflow.')
        files, deps = payload.get('files', []), payload.get('depends_on', [])
        if not isinstance(files, list) or len(files) > 5 or any(not isinstance(x, str) or len(x) > 1000 for x in files):
            raise ValueError('Attach up to five text files.')
        if not isinstance(deps, list) or any(not isinstance(x, str) for x in deps):
            raise ValueError('Dependencies must identify existing objectives.')
        model = payload.get('model', '')
        if not isinstance(model, str) or len(model) > 200:
            raise ValueError('Invalid model selection.')
        return dict(message=message.strip(), agent_id=agent,
                    division='ascended_forge' if agent == 'kj' else 'transcenlutions',
                    mode=mode, model=model, privacy=privacy, thread_mode=thread_mode,
                    files=list(files), depends_on=list(dict.fromkeys(deps)), steering=[])

    def enqueue(self, session_id, payload):
        data = self.validate(payload)
        request_id = payload.get('request_id')
        if not isinstance(request_id, str) or not 1 <= len(request_id) <= 100:
            raise ValueError('A stable request ID is required.')
        with self.tx() as db:
            if not db.execute('SELECT id FROM sessions WHERE id=?', (session_id,)).fetchone():
                raise ValueError('Conversation not found.')
            existing = db.execute('SELECT * FROM objectives WHERE session_id=? AND request_id=?', (session_id, request_id)).fetchone()
            if existing:
                return self.item(existing)
            for dep in data['depends_on']:
                if not db.execute('SELECT id FROM objectives WHERE id=? AND session_id=?', (dep, session_id)).fetchone():
                    raise ValueError('Dependencies must be earlier objectives in this conversation.')
            ident, now = uuid.uuid4().hex, time.time()
            pos = db.execute('SELECT COALESCE(MAX(position),0)+1 FROM objectives').fetchone()[0]
            db.execute('INSERT INTO objectives(id,session_id,request_id,payload,status,position,created,updated) VALUES(?,?,?,?,?,?,?,?)',
                       (ident, session_id, request_id, json.dumps(data), 'queued', pos, now, now))
            self.event(db, ident, 'queued', {'agent_id': data['agent_id'], 'division': data['division']})
            return self.item(db.execute('SELECT * FROM objectives WHERE id=?', (ident,)).fetchone())

    def get(self, ident):
        with self.tx() as db:
            return self.item(db.execute('SELECT * FROM objectives WHERE id=?', (ident,)).fetchone())

    def state(self, session_id):
        self.verify_session(session_id)
        with self.tx() as db:
            items = [self.item(row) for row in db.execute('SELECT * FROM objectives WHERE session_id=? ORDER BY position,created', (session_id,))]
            states = {x['id']: x['status'] for x in items}
            for item in items:
                waits = [dep for dep in item['payload']['depends_on'] if states.get(dep) != 'completed']
                item['blocked_reason'] = 'Waiting for dependencies to finish successfully.' if waits else ''
            return {'session_id': session_id, 'items': items}

    def claim(self):
        # The desktop engine and self-dev share a single provider/file guard.
        # More queued objectives do not imply unsafe parallel tool execution.
        with self.tx() as db:
            if db.execute("SELECT 1 FROM objectives WHERE status='active'").fetchone():
                return None
            for row in db.execute("SELECT * FROM objectives WHERE status='queued' ORDER BY position,created").fetchall():
                item = self.item(row)
                ready = all(db.execute("SELECT 1 FROM objectives WHERE id=? AND status='completed'", (dep,)).fetchone()
                            for dep in item['payload']['depends_on'])
                if not ready:
                    continue
                db.execute("UPDATE objectives SET status='active', claimed_revision=revision, attempts=attempts+1, updated=?,error=NULL WHERE id=?",
                           (time.time(), item['id']))
                self.event(db, item['id'], 'started', {'revision': item['revision']})
                return self.item(db.execute('SELECT * FROM objectives WHERE id=?', (item['id'],)).fetchone())
        return None

    def command(self, session_id, ident, operation, text=None, before_id=None, agent_id=None):
        with self.tx() as db:
            item = self.item(db.execute('SELECT * FROM objectives WHERE id=? AND session_id=?', (ident, session_id)).fetchone())
            state, data = item['status'], item['payload']
            new_status, pending, revision = state, item['pending_operation'], item['revision']
            if operation in {'pause', 'cancel'}:
                if pending == 'cancel' and operation == 'pause':
                    raise ValueError('Cancellation has already been requested.')
                if state in {'completed', 'cancelled'}:
                    raise ValueError('This objective has already ended.')
                if state == 'active':
                    pending = operation
                else:
                    new_status = 'paused' if operation == 'pause' else 'cancelled'
            elif operation in {'resume', 'retry'}:
                if state not in ({'paused'} if operation == 'resume' else {'failed'}):
                    raise ValueError('Only paused work can resume and failed work can retry.')
                new_status, pending = 'queued', None
            elif operation in {'edit', 'steer'}:
                if state in {'completed', 'cancelled'} or (operation == 'edit' and state == 'active'):
                    raise ValueError('Use Steer for active work. Finished objectives cannot be edited.')
                if not isinstance(text, str) or not text.strip() or len(text) > 16000:
                    raise ValueError('Write a direction between 1 and 16,000 characters.')
                if operation == 'steer':
                    data['steering'].append(text.strip())
                else:
                    data['message'] = text.strip()
                revision += 1
            elif operation == 'assign':
                if state not in {'queued', 'paused', 'failed'} or agent_id not in AGENTS:
                    raise ValueError('Assign waiting work to Tay, Dawn, or KJ.')
                data['agent_id'] = agent_id
                data['division'] = 'ascended_forge' if agent_id == 'kj' else 'transcenlutions'
                revision += 1
            elif operation in {'prioritize', 'move'}:
                if state != 'queued':
                    raise ValueError('Only queued work can be reordered.')
                rows = db.execute("SELECT id FROM objectives WHERE session_id=? AND status='queued' ORDER BY position,created", (session_id,)).fetchall()
                order = [r['id'] for r in rows if r['id'] != ident]
                if operation == 'move' and before_id not in order:
                    raise ValueError('Choose another queued objective in this conversation.')
                order.insert(0 if operation == 'prioritize' else order.index(before_id), ident)
                base = db.execute('SELECT COALESCE(MIN(position),0) FROM objectives WHERE session_id=?', (session_id,)).fetchone()[0]
                for offset, target in enumerate(order):
                    db.execute('UPDATE objectives SET position=? WHERE id=?', (base + offset, target))
            else:
                raise ValueError('Unknown queue operation.')
            db.execute('UPDATE objectives SET payload=?,status=?,pending_operation=?,revision=?,updated=?,error=NULL WHERE id=?',
                       (json.dumps(data), new_status, pending, revision, time.time(), ident))
            self.event(db, ident, operation, {'revision': revision})
            return self.item(db.execute('SELECT * FROM objectives WHERE id=?', (ident,)).fetchone())

    def finish(self, ident, claim_version, result=None, error=None):
        with self.tx() as db:
            item = self.item(db.execute('SELECT * FROM objectives WHERE id=?', (ident,)).fetchone())
            if item['status'] != 'active' or item['attempts'] != claim_version:
                return item
            if item['pending_operation']:
                state = 'paused' if item['pending_operation'] == 'pause' else 'cancelled'
                result, error = None, None
            elif item['revision'] != item['claimed_revision']:
                state = 'queued' if item['attempts'] < 8 else 'paused'
                result, error = None, ('Repeated steering paused for review.' if state == 'paused' else None)
            else:
                state = 'failed' if error else 'completed'
            db.execute('UPDATE objectives SET status=?,result=?,error=?,pending_operation=NULL,updated=? WHERE id=?',
                       (state, json.dumps(result) if result is not None else None, error, time.time(), ident))
            self.event(db, ident, state, {'attempt': claim_version, 'claimed_revision': item['claimed_revision'], 'revision': item['revision']})
            if state == 'completed' and isinstance(result, dict):
                self.event(db, ident, 'model_result', {k: result.get(k) for k in ('agent_id', 'provider', 'model', 'latency_ms')})
            return self.item(db.execute('SELECT * FROM objectives WHERE id=?', (ident,)).fetchone())
