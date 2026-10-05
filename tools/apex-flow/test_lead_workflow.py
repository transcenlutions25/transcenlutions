import tempfile
import unittest
from pathlib import Path
from email import policy
from email.parser import BytesParser
from lead_workflow import connect, ingest, decide, export


class DeliveryAcceptance(unittest.TestCase):
    def test_intake_review_restart_and_draft_export(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / 'input.csv'
            source.write_text('email,name,inquiry\nclient@example.com,Client,Please help with onboarding\ninvalid,Bad,Missing valid email\nother@example.com,Other,Second request\n')
            db = connect(root / 'private.sqlite')
            first = ingest(db, source)
            self.assertEqual(len(first['created']), 2)
            self.assertEqual(len(first['errors']), 1)
            self.assertEqual(len(ingest(db, source)['duplicates']), 2)
            self.assertEqual(export(db, root / 'out'), [])
            approved, rejected = first['created']
            decide(db, approved, 'approved')
            decide(db, rejected, 'rejected')
            with self.assertRaises(ValueError):
                decide(db, rejected, 'approved')
            db.close()
            db = connect(root / 'private.sqlite')
            self.assertEqual(len(export(db, root / 'out')), 1)
            self.assertEqual(export(db, root / 'out'), [])
            draft = BytesParser(policy=policy.default).parsebytes((root / 'out' / (approved + '.eml')).read_bytes())
            self.assertEqual(draft['To'], 'client@example.com')
            self.assertIn('Hello Client', draft.get_body().get_content())
            self.assertEqual(draft['X-Unsent'], '1')
            self.assertEqual(db.execute('SELECT count(*) FROM events').fetchone()[0], 4)
            (root / 'out' / (approved + '.eml')).write_text('manually edited')
            with self.assertRaises(ValueError):
                export(db, root / 'out')
            db.close()

    def test_invalid_schema_changes_nothing(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / 'bad.csv'
            source.write_text('email\nclient@example.com\n')
            db = connect(':memory:')
            with self.assertRaises(ValueError):
                ingest(db, source)
            self.assertEqual(db.execute('SELECT count(*) FROM leads').fetchone()[0], 0)
            db.close()


if __name__ == '__main__':
    unittest.main()
