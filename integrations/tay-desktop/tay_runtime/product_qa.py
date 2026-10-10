"""Optional offline PDF QA. Only fixed Poppler command, never source-selected tools.

Requires locally available pypdf, pdfplumber and pdftoppm. Does not install them.
Human inspection of every emitted page remains required for visual review.
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from pathlib import Path

from .product_builder import MAX_PAGES, ProductBuildError, _workspace, read_brief


def _read(path, limit):
    if any(p.is_symlink() for p in (path, *path.parents)):
        raise ProductBuildError('QA input must not contain symlinks.')
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, 'rb') as stream:
        if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
            raise ProductBuildError('QA input must be a regular file.')
        result = stream.read(limit + 1)
    if len(result) > limit:
        raise ProductBuildError('QA input exceeds its size limit.')
    return result


def verify_product(workspace, product_id, version):
    root = _workspace(workspace)
    if not isinstance(product_id, str) or not re.fullmatch('[a-z][a-z0-9-]{2,47}', product_id):
        raise ProductBuildError('Invalid product identifier.')
    if not isinstance(version, str) or not re.fullmatch('[0-9a-f]{64}', version):
        raise ProductBuildError('Invalid product version.')
    prefix = Path('products') / product_id / version
    folder = root / prefix
    try:
        manifest = json.loads(_read(folder / 'manifest.json', 32000))
        brief = read_brief(root, (prefix / 'brief.json').as_posix())
    except (ValueError, UnicodeError, RecursionError, OSError):
        raise ProductBuildError('QA needs a valid saved product manifest and brief.') from None
    if not isinstance(manifest, dict) or manifest.get('artifact_id') != product_id or manifest.get('version') != version:
        raise ProductBuildError('Manifest identity does not match this product version.')
    entries = manifest.get('files')
    expected = {(prefix / name).as_posix() for name in ('checklist.pdf', 'editable.md', 'checklist.txt', 'brief.json')}
    if not isinstance(entries, list) or len(entries) != 4 or any(not isinstance(e, dict) for e in entries):
        raise ProductBuildError('Manifest has invalid artifact entries.')
    if any(not isinstance(e.get('path'), str) for e in entries) or {e['path'] for e in entries} != expected:
        raise ProductBuildError('Manifest artifact paths are not the fixed product paths.')
    for entry in entries:
        content = _read(root / entry['path'], 5000000)
        if type(entry.get('bytes')) is not int or len(content) != entry['bytes'] or hashlib.sha256(content).hexdigest() != entry.get('sha256'):
            raise ProductBuildError('Saved artifact integrity check failed.')
    try:
        from pypdf import PdfReader
        import pdfplumber
    except ImportError:
        raise ProductBuildError('QA requires optional local pypdf and pdfplumber packages. Nothing was installed.') from None
    renderer = shutil.which('pdftoppm')
    if not renderer:
        raise ProductBuildError('QA requires local Poppler pdftoppm. Nothing was installed.')
    pdf_path = folder / 'checklist.pdf'
    reader = PdfReader(pdf_path)
    count = len(reader.pages)
    if not 1 <= count <= MAX_PAGES:
        raise ProductBuildError('PDF page count is outside its bounded limit.')
    if any(k in reader.trailer['/Root'] for k in ('/OpenAction', '/AA', '/Names', '/AcroForm')):
        raise ProductBuildError('PDF contains unsupported interactive features.')
    if any(page.get('/Annots') or page.get('/AA') for page in reader.pages):
        raise ProductBuildError('PDF contains unsupported annotations or actions.')
    text = ' '.join(' '.join(page.extract_text().split()) for page in reader.pages)
    expected_text = [brief[k] for k in ('title', 'subtitle', 'audience', 'purpose')]
    for section in brief['sections']:
        expected_text += [section['heading'], section['summary']]
        for item in section['items']:
            expected_text += [item['label'], item['detail']]
    # PDF line breaks may split a long URL/token; compare the same ordered
    # non-whitespace characters as a fallback, without case/punctuation folding.
    compact_text = ''.join(text.split())
    if any(value not in text and ''.join(value.split()) not in compact_text for value in expected_text):
        raise ProductBuildError('PDF text extraction is missing source content.')
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            if abs(page.width - 612) > 1 or abs(page.height - 792) > 1:
                raise ProductBuildError('Unexpected PDF page size.')
            if any(c['x0'] < 58 or c['x1'] > 554 or c['top'] < 45 or c['bottom'] > 760 for c in page.chars):
                raise ProductBuildError('PDF text escapes the layout bounds.')
    qa_folder = Path(tempfile.mkdtemp(prefix='product-qa-', dir=root))
    try:
        subprocess.run([renderer, '-f', '1', '-l', str(count), '-r', '96', '-png',
                        str(pdf_path), str(qa_folder / 'page')], check=True, timeout=30,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        images = sorted(qa_folder.glob('page-*.png'))
        if len(images) != count or any(p.stat().st_size < 100 for p in images):
            raise ProductBuildError('Renderer did not produce every expected page.')
    except (subprocess.SubprocessError, OSError):
        raise ProductBuildError('Local PDF rendering failed or timed out.') from None
    report = {'schema_version': 1, 'artifact_id': product_id, 'version': version,
              'checks': {'artifact_hashes': 'passed', 'text_extraction': 'passed',
                         'text_bounds': 'passed', 'inactive_pdf': 'passed',
                         'all_pages_rendered': 'passed', 'visual_review': 'not_run'},
              'page_count': count, 'rendered_pages': [p.relative_to(root).as_posix() for p in images],
              'accessibility': 'Readable text companions included; tagged PDF/UA and assistive-technology testing not performed.',
              'next_step': 'Open every rendered page and inspect readability, spacing and clipping. Automated checks do not establish visual approval.'}
    report_path = qa_folder / 'qa-report.json'
    report['report_path'] = report_path.relative_to(root).as_posix()
    report_path.write_text(json.dumps(report, indent=2) + '\n')
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description='Verify and render an existing local checklist, offline.')
    parser.add_argument('--workspace', type=Path, required=True)
    parser.add_argument('--product-id', required=True)
    parser.add_argument('--version', required=True)
    args = parser.parse_args(argv)
    try:
        print(json.dumps(verify_product(args.workspace, args.product_id, args.version), indent=2))
    except (ProductBuildError, OSError, ValueError) as exc:
        print(str(exc) if isinstance(exc, ProductBuildError) else 'Local product QA failed.', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
