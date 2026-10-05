import importlib.util, unittest, tempfile, json
from pathlib import Path
from unittest.mock import patch
s=importlib.util.spec_from_file_location('tayserver',Path(__file__).with_name('server.py'))
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class Tests(unittest.TestCase):
    def job(self,d):
        m.LOCK.acquire();m.work('test',d);return m.JOBS['test']
    def test_paid_requires_opt_in(self):
        with patch.object(m,'api') as request:
            r=self.job({'project':str(Path.home()/'crowne-legacy'),'mode':'openai','key':'placeholder'})
            self.assertIn('Enable paid API use',r['error']);request.assert_not_called()
    def test_free_fixed_route_and_history(self):
        with tempfile.TemporaryDirectory() as temp:
            with patch.object(m,'history',return_value=Path(temp)/'chat.json'),patch.object(m,'api',return_value={'choices':[{'message':{'content':'Hello'}}]}) as request:
                r=self.job({'project':str(Path.home()/'crowne-legacy'),'mode':'free','key':'placeholder','model':'paid-model','message':'Hi'})
                self.assertEqual(r['answer'],'Hello')
                self.assertEqual(request.call_args.args[1]['model'],'openrouter/free')
                self.assertTrue((Path(temp)/'chat.json').exists())

    def test_user_turn_is_auto_saved_once(self):
        with tempfile.TemporaryDirectory() as temp:
            with patch.object(m,'history',return_value=Path(temp)/'chat.json'),patch.object(m,'api',return_value={'choices':[{'message':{'content':'Hello'}}]}):
                r=self.job({'project':str(Path.home()/'crowne-legacy'),'mode':'free','key':'placeholder','message':'Hi'})
                self.assertEqual(r['answer'],'Hello')
                self.assertEqual(json.loads((Path(temp)/'chat.json').read_text()),[{'role':'user','content':'Hi'},{'role':'assistant','content':'Hello'}])
    def test_attachment_escape_blocked(self):
        with patch.object(m,'api') as request:
            r=self.job({'project':str(Path.home()/'crowne-legacy'),'mode':'local','message':'Hi','files':['../Tay/GENERAL.md']})
            self.assertIn('inside the selected project',r['error']);request.assert_not_called()
    def test_privacy_rejects_online_provider(self):
        for privacy in ('offline','incognito'):
            with self.subTest(privacy=privacy),patch.object(m,'api') as request:
                r=self.job({'project':str(Path.home()/'crowne-legacy'),'privacy':privacy,'mode':'free','key':'placeholder','message':'Hi'})
                self.assertIn('require the local model',r['error']);request.assert_not_called()
    def test_plan_instruction_reaches_provider_without_writing_incognito(self):
        with tempfile.TemporaryDirectory() as temp:
            hp=Path(temp)/'chat.json'
            with patch.object(m,'history',return_value=hp),patch.object(m,'api',return_value={'message':{'content':'Plan'}}) as request:
                r=self.job({'project':str(Path.home()/'crowne-legacy'),'privacy':'incognito','mode':'local','thread_mode':'plan','message':'Plan this'})
                self.assertEqual(r['answer'],'Plan')
                self.assertIn('Create an actionable plan',request.call_args.args[1]['messages'][0]['content'])
                self.assertFalse(hp.exists())
if __name__=='__main__':unittest.main()
