import json
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tay_runtime.queue_store import QueueStore
from tay_runtime.bridge import DesktopRuntime


class QueueTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Path(self.tmp.name) / 'queue.db'
        self.q = QueueStore(self.db)
        self.s = self.q.session('project')

    def tearDown(self):
        self.tmp.cleanup()

    def put(self, text='Plan work', **kwargs):
        return self.q.enqueue(self.s, {'message': text, 'request_id': text, **kwargs})

    def test_many_persisted_idempotent_objectives(self):
        for i in range(35):
            self.put('task ' + str(i))
        self.put('task 0')
        reopened = QueueStore(self.db)
        self.assertEqual(reopened.session('project'), self.s)
        self.assertEqual(len(reopened.state(self.s)['items']), 35)

    def test_claim_is_serial_and_dependency_order_overrides_priority(self):
        a = self.put('A'); b = self.put('B', depends_on=[a['id']])
        self.q.command(self.s,b['id'],'prioritize')
        claim = self.q.claim()
        self.assertEqual(claim['id'], a['id'])
        self.assertIsNone(self.q.claim())
        self.q.finish(a['id'],claim['attempts'],result={'answer':'A result'})
        self.assertEqual(self.q.claim()['id'], b['id'])

    def test_concurrent_claims_execute_once(self):
        self.put('A');self.put('B')
        results=[]
        threads=[threading.Thread(target=lambda:results.append(self.q.claim())) for _ in range(5)]
        for t in threads:t.start()
        for t in threads:t.join()
        self.assertEqual(sum(x is not None for x in results),1)

    def test_steer_suppresses_stale_result_and_preserves_original(self):
        a=self.put('original'); c=self.q.claim()
        self.q.command(self.s,a['id'],'steer',text='new direction')
        final=self.q.finish(a['id'],c['attempts'],result={'answer':'stale'})
        self.assertEqual(final['status'],'queued');self.assertIsNone(final['result'])
        self.assertEqual(final['payload']['message'],'original')
        self.assertEqual(final['payload']['steering'],['new direction'])
        c2=self.q.claim()
        self.q.finish(a['id'],c['attempts'],result={'answer':'duplicate late result'})
        self.assertEqual(self.q.get(a['id'])['status'],'active')
        self.q.finish(a['id'],c2['attempts'],result={'answer':'revised'})
        self.assertEqual(self.q.get(a['id'])['result']['answer'],'revised')

    def test_cancel_and_pause_checkpoint_discard_response(self):
        for op,expected in [('cancel','cancelled'),('pause','paused')]:
            a=self.put(op); c=self.q.claim()
            self.q.command(self.s,a['id'],op)
            self.assertEqual(self.q.get(a['id'])['status'],'active')
            final=self.q.finish(a['id'],c['attempts'],result={'answer':'discard'})
            self.assertEqual(final['status'],expected);self.assertIsNone(final['result'])

    def test_recovery_pauses_and_requires_explicit_resume(self):
        a=self.put('A');self.q.claim()
        restarted=QueueStore(self.db)
        self.assertEqual(restarted.get(a['id'])['status'],'paused')
        self.assertIsNone(restarted.claim())
        restarted.command(self.s,a['id'],'resume')
        self.assertIsNotNone(restarted.claim())

    def test_retry_does_not_duplicate_or_unblock_failed_dependencies(self):
        a=self.put('A');b=self.put('B',depends_on=[a['id']]);c=self.q.claim()
        self.q.finish(a['id'],c['attempts'],error='model unavailable')
        self.assertIsNone(self.q.claim())
        self.q.command(self.s,a['id'],'retry');c=self.q.claim()
        self.assertEqual(c['id'],a['id']);self.assertEqual(c['attempts'],2)
        self.assertEqual(len(self.q.state(self.s)['items']),2)

    def test_scope_validation_and_credentials_not_persisted(self):
        a=self.put('A',key='DO_NOT_STORE',paid=True)
        foreign=self.q.session('other')
        with self.assertRaises(ValueError):self.q.command(foreign,a['id'],'cancel')
        with self.assertRaises(ValueError):self.q.enqueue(foreign,{'message':'B','request_id':'B','depends_on':[a['id']]})
        with self.assertRaises(ValueError):self.put('Rory',agent_id='rory')
        with self.assertRaises(ValueError):self.put('private',privacy='incognito')
        with self.assertRaises(ValueError):self.put('leak',privacy='offline',mode='openai')
        self.assertNotIn('DO_NOT_STORE', self.db.read_bytes().decode('latin1'))
        self.assertNotIn('key',a['payload'])

    def test_reorder_assignment_and_audit(self):
        a=self.put('A');b=self.put('B');self.put('C')
        self.q.command(self.s,b['id'],'move',before_id=a['id'])
        self.q.command(self.s,b['id'],'assign',agent_id='kj')
        self.assertEqual(self.q.claim()['id'],b['id'])
        with self.q.tx() as db:
            kinds=[r[0] for r in db.execute('SELECT kind FROM events WHERE objective_id=?',(b['id'],))]
        self.assertEqual(kinds,['queued','move','assign','started'])


class RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();root=Path(self.tmp.name)
        self.provider=Mock(return_value={'message':{'content':'A genuine provider result'}})
        self.env={'ROOT':root,'hub':SimpleNamespace(validate_project=lambda p:Path(p)),
                  'LOCK':threading.Lock(),'api':self.provider,'thread_instruction':lambda m:m}
        self.r=DesktopRuntime(self.env,start_worker=False)
        self.s=self.r.store.session(str(root));self.project=str(root)

    def tearDown(self):
        self.r.close();self.tmp.cleanup()

    def put(self, text, **kwargs):
        return self.r.store.enqueue(self.s,{'message':text,'request_id':text,**kwargs})

    def test_model_identity_scoped_persistent_context_and_handoff(self):
        a=self.put('Tay-only detail');c=self.r.store.claim();self.r.run(c,{})
        self.put('Dawn work',agent_id='dawn');c=self.r.store.claim();self.r.run(c,{})
        outgoing=self.provider.call_args.args[1]['messages']
        self.assertIn('You are Dawn',outgoing[0]['content'])
        self.assertNotIn('Tay-only detail',json.dumps(outgoing))
        self.put('KJ handoff',agent_id='kj',depends_on=[a['id']]);c=self.r.store.claim();self.r.run(c,{})
        outgoing=self.provider.call_args.args[1]['messages']
        self.assertIn('You are KJ',outgoing[0]['content'])
        self.assertIn('Explicit dependency result',outgoing[-1]['content'])
        self.r.close();self.r=DesktopRuntime(self.env,start_worker=False)
        self.put('Tay followup');c=self.r.store.claim();self.r.run(c,{})
        self.assertIn('Tay-only detail',json.dumps(self.provider.call_args.args[1]['messages']))

    def test_credentials_and_approval_block_online_execution(self):
        self.put('online',mode='openai',privacy='online',model='configured-model');c=self.r.store.claim();self.r.run(c,{})
        self.provider.assert_not_called()
        self.assertEqual(self.r.store.get(c['id'])['status'],'failed')
        self.r.store.command(self.s,c['id'],'retry');c=self.r.store.claim();self.r.run(c,{'key':'secret','paid':False})
        self.provider.assert_not_called()

    def test_attachment_escape_rejected(self):
        self.put('files',files=['../outside']);c=self.r.store.claim();self.r.run(c,{})
        self.assertEqual(self.r.store.get(c['id'])['status'],'failed');self.provider.assert_not_called()

    def test_project_scope_and_payload_shape(self):
        with self.assertRaises(ValueError): self.r.handle('/runtime/state',{'project':'other','session_id':self.s})
        with self.assertRaises(ValueError): self.r.handle('/runtime/enqueue',None)
        with self.assertRaises(ValueError): DesktopRuntime(self.env,start_worker=False)


if __name__=='__main__': unittest.main()
