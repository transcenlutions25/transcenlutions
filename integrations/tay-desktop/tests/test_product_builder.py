"""Local builder safety, portability, reproducibility and edit/regenerate tests."""
import importlib.util
import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tay_runtime.product_builder import build_product, read_brief, validate_brief, ProductBuildError

FIXTURE = Path(__file__).resolve().parents[1] / 'examples' / 'sample-product-brief.json'


def sample():
    return json.loads(FIXTURE.read_text())


class BriefSafetyTests(unittest.TestCase):
    def test_valid_brief(self):
        self.assertEqual(validate_brief(sample()), sample())

    def test_unknown_fields_cannot_request_execution_or_output_paths(self):
        for key in ('output_path', 'command', 'script', 'url', 'approved', '__proto__'):
            brief = sample()
            brief[key] = '../../escape'
            with self.subTest(key=key), self.assertRaises(ProductBuildError):
                validate_brief(brief)

    def test_unsafe_ids_and_markup(self):
        for ident in ('../escape', '/tmp/escape', '..', 'a/b', 'x\\y', '.hidden', 'a' * 49):
            brief = sample()
            brief['product_id'] = ident
            with self.subTest(ident=ident), self.assertRaises(ProductBuildError):
                validate_brief(brief)
        for value in ('<script>alert(1)</script>', '<img src="file:///etc/passwd">',
                      'javascript:alert(1)', '```python', 'data:text/html,hi', 'hello\x00world', 'Smart \u201cquotes\u201d'):
            brief = sample()
            brief['title'] = value
            with self.subTest(value=value), self.assertRaises(ProductBuildError):
                validate_brief(brief)

    def test_shape_bounds(self):
        mutations = [lambda b: b.update(schema_version=True), lambda b: b.update(sections=[]),
                     lambda b: b.update(sections=b['sections'] * 2), lambda b: b.update(title='x' * 91),
                     lambda b: b['sections'][0].update(items=[]),
                     lambda b: b['sections'][0].update(items=b['sections'][0]['items'] * 3),
                     lambda b: b['sections'][0]['items'][0].update(detail={'execute': True}),
                     lambda b: b['sections'][0].update(unknown='hidden')]
        for mutate in mutations:
            brief = sample()
            mutate(brief)
            with self.assertRaises(ProductBuildError):
                validate_brief(brief)

    def test_no_import_side_effect_or_required_reportlab_for_validation(self):
        # Optional PDF dependency must not prevent existing runtime from importing.
        with mock.patch.dict(sys.modules, {'reportlab': None}):
            validate_brief(sample())
            with tempfile.TemporaryDirectory() as root:
                with self.assertRaisesRegex(ProductBuildError, 'optional ReportLab'):
                    build_product(sample(), root)
                self.assertFalse((Path(root) / 'products').exists())

    def test_safe_bounded_input_read(self):
        with tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as other:
            root = Path(root)
            (root / 'brief.json').write_text(FIXTURE.read_text())
            self.assertEqual(read_brief(root, 'brief.json'), sample())
            (root / 'link.json').symlink_to(root / 'brief.json')
            (root / 'nested').symlink_to(other, target_is_directory=True)
            (root / 'huge.json').write_text(' ' * 32001)
            (root / 'duplicate.json').write_text('{"title": "one", "title": "two"}')
            (root / 'deep.json').write_text('[' * 5000 + ']' * 5000)
            os.mkfifo(root / 'pipe.json')
            for path in ('../brief.json', str(root / 'brief.json'), 'link.json',
                         'nested/brief.json', '.env', 'huge.json', 'duplicate.json', 'deep.json', 'pipe.json'):
                with self.subTest(path=path), self.assertRaises(ProductBuildError):
                    read_brief(root, path)


@unittest.skipUnless(importlib.util.find_spec('reportlab'), 'optional ReportLab not installed')
class ProductBuildTests(unittest.TestCase):
    def test_real_artifacts_idempotence_and_hashes(self):
        import hashlib
        with tempfile.TemporaryDirectory() as root:
            manifest = build_product(sample(), root)
            self.assertEqual(manifest, build_product(sample(), root))
            self.assertEqual(manifest['status'], 'draft_sample')
            self.assertEqual(manifest['provenance']['external_requests'], 0)
            self.assertGreater(manifest['validation']['page_count'], 0)
            self.assertEqual(manifest['validation']['visual_review'], 'not_run')
            for entry in manifest['files']:
                self.assertFalse(Path(entry['path']).is_absolute())
                raw = (Path(root) / entry['path']).read_bytes()
                self.assertEqual(len(raw), entry['bytes'])
                self.assertEqual(hashlib.sha256(raw).hexdigest(), entry['sha256'])
            pdf = (Path(root) / manifest['entrypoint']).read_bytes()
            self.assertTrue(pdf.startswith(b'%PDF-'))
            self.assertNotIn(b'/JavaScript', pdf)
            self.assertNotIn(b'/OpenAction', pdf)

    def test_edit_and_regenerate_preserves_saved_original(self):
        with tempfile.TemporaryDirectory() as root:
            first = build_product(sample(), root)
            first_pdf = (Path(root) / first['entrypoint']).read_bytes()
            edited = sample()
            edited['title'] = 'The revised workspace reset'
            second = build_product(edited, root)
            self.assertEqual(first['artifact_id'], second['artifact_id'])
            self.assertNotEqual(first['version'], second['version'])
            self.assertEqual((Path(root) / first['entrypoint']).read_bytes(), first_pdf)
            self.assertEqual(json.loads((Path(root) / second['editable_source']).read_text())['title'], edited['title'])

    def test_actual_cli_working_copy_edit_preserves_both_versions(self):
        import contextlib
        import io
        from tay_runtime.product_builder import main
        with tempfile.TemporaryDirectory() as root:
            working = Path(root) / 'working-brief.json'
            working.write_text(FIXTURE.read_text())
            first_out = io.StringIO()
            with contextlib.redirect_stdout(first_out):
                self.assertEqual(main(['--workspace', root, '--brief', 'working-brief.json']), 0)
            first = json.loads(first_out.getvalue())
            # Follow the delivered instructions: edit a copy, not saved version bytes.
            shutil.copy2(Path(root) / first['editable_source'], working)
            edited = json.loads(working.read_text())
            edited['title'] = 'Revised local checklist'
            working.write_text(json.dumps(edited))
            second_out = io.StringIO()
            with contextlib.redirect_stdout(second_out):
                self.assertEqual(main(['--workspace', root, '--brief', 'working-brief.json']), 0)
            second = json.loads(second_out.getvalue())
            self.assertNotEqual(first['version'], second['version'])
            self.assertEqual(read_brief(root, first['editable_source']), sample())
            self.assertEqual(first, build_product(sample(), root))

    def test_rebuild_refuses_tampered_or_linked_versions(self):
        for tamper in ('modify', 'symlink', 'extra'):
            with tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as other:
                result = build_product(sample(), root)
                file = Path(root) / result['entrypoint']
                if tamper == 'modify':
                    file.write_text('changed')
                elif tamper == 'symlink':
                    file.unlink()
                    file.symlink_to(Path(other) / 'outside.pdf')
                else:
                    (file.parent / 'extra.txt').write_text('extra')
                with self.subTest(tamper=tamper), self.assertRaises(ProductBuildError):
                    build_product(sample(), root)

    def test_symlinked_output_components_rejected(self):
        for part in ('root', 'products', 'product'):
            with tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as other:
                root = Path(root)
                workspace = root
                if part == 'root':
                    (root / 'linked').symlink_to(other, target_is_directory=True)
                    workspace = root / 'linked'
                elif part == 'products':
                    (root / 'products').symlink_to(other, target_is_directory=True)
                else:
                    (root / 'products').mkdir()
                    (root / 'products' / sample()['product_id']).symlink_to(other, target_is_directory=True)
                with self.subTest(part=part), self.assertRaises(ProductBuildError):
                    build_product(sample(), workspace)
                self.assertEqual(list(Path(other).iterdir()), [])

    def test_pdf_text_and_page_bounds_if_qa_dependencies_available(self):
        try:
            from pypdf import PdfReader
        except ImportError:
            self.skipTest('optional pypdf QA dependency not installed')
        with tempfile.TemporaryDirectory() as root:
            result = build_product(sample(), root)
            reader = PdfReader(Path(root) / result['entrypoint'])
            self.assertEqual(len(reader.pages), result['validation']['page_count'])
            text = ' '.join(' '.join(page.extract_text().split()) for page in reader.pages)
            for section in sample()['sections']:
                self.assertIn(section['heading'], text)
                for item in section['items']:
                    self.assertIn(item['label'], text)
                    self.assertIn(item['detail'], text)
            self.assertNotIn('/OpenAction', reader.trailer['/Root'])
            self.assertNotIn('/AcroForm', reader.trailer['/Root'])
            self.assertTrue(all(not p.get('/Annots') for p in reader.pages))


@unittest.skipUnless(importlib.util.find_spec('reportlab') and importlib.util.find_spec('pypdf')
                     and importlib.util.find_spec('pdfplumber') and shutil.which('pdftoppm'),
                     'optional PDF QA dependencies not installed')
class ProductQATests(unittest.TestCase):
    def test_full_offline_render_and_extraction(self):
        from tay_runtime.product_qa import verify_product
        with tempfile.TemporaryDirectory() as root:
            result = build_product(sample(), root)
            qa = verify_product(root, result['artifact_id'], result['version'])
            self.assertEqual(qa['checks']['all_pages_rendered'], 'passed')
            self.assertEqual(qa['checks']['visual_review'], 'not_run')
            self.assertEqual(len(qa['rendered_pages']), result['validation']['page_count'])
            self.assertTrue(all((Path(root) / path).is_file() for path in qa['rendered_pages']))
            self.assertEqual(result, build_product(sample(), root))

    def test_wrapped_long_tokens_remain_verifiable(self):
        from tay_runtime.product_qa import verify_product
        with tempfile.TemporaryDirectory() as root:
            brief = sample()
            brief['title'] = 'W' * 90
            brief['sections'][0]['items'][0]['detail'] = 'https://example.org/' + 'a' * 200
            result = build_product(brief, root)
            qa = verify_product(root, result['artifact_id'], result['version'])
            self.assertEqual(qa['checks']['text_extraction'], 'passed')

    def test_qa_rejects_traversal_manifest_paths_and_tampering_before_render(self):
        from tay_runtime.product_qa import verify_product
        for case in ('traversal', 'manifest', 'tamper', 'symlink'):
            with tempfile.TemporaryDirectory() as root:
                result = build_product(sample(), root)
                ident, version = result['artifact_id'], result['version']
                path = Path(root) / result['manifest_path']
                if case == 'traversal':
                    ident = '../escape'
                elif case == 'manifest':
                    saved = json.loads(path.read_text())
                    saved['files'][0]['path'] = '../../etc/passwd'
                    path.write_text(json.dumps(saved))
                elif case == 'symlink':
                    path.unlink()
                    path.symlink_to('/etc/passwd')
                else:
                    (Path(root) / result['entrypoint']).write_bytes(b'%PDF-bad')
                with self.subTest(case=case), mock.patch('subprocess.run') as run:
                    with self.assertRaises(ProductBuildError):
                        verify_product(root, ident, version)
                    run.assert_not_called()


if __name__ == '__main__':
    unittest.main()
