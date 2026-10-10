"""Bounded offline checklist builder. Content is data, never executable code.

The caller owns authorization and supplies an existing isolated output workspace.
No network, shell, installation, publishing, payment, or model calls occur here.
"""
import argparse
import hashlib
import io
import json
import os
import re
import shutil
import stat
import sys
import tempfile
from pathlib import Path

BUILDER_VERSION = '1.0.0'
SCHEMA_VERSION = 1
MAX_BRIEF_BYTES = 32000
MAX_PAGES = 12
NOTICE = 'DRAFT / SAMPLE - Review before use. Not a customer offer or evidence of revenue.'
FILES = {'checklist.pdf': 'application/pdf', 'editable.md': 'text/markdown',
         'checklist.txt': 'text/plain', 'brief.json': 'application/json'}


class ProductBuildError(ValueError):
    """A bounded, user-readable failure without provider or private-path details."""


def _exact(value, keys, label):
    if not isinstance(value, dict) or set(value) != set(keys):
        raise ProductBuildError(label + ' has missing or unsupported fields.')


def _text(value, limit, label):
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ProductBuildError(label + ' must be nonempty text within its length limit.')
    # V1 deliberately limits glyphs rather than silently losing Unicode in PDF fonts.
    if any(ord(c) < 32 or ord(c) > 126 for c in value):
        raise ProductBuildError(label + ' supports printable ASCII text only in version 1.')
    if any(x in value.lower() for x in ('<', '>', '```', 'javascript:', 'vbscript:', 'data:')):
        raise ProductBuildError(label + ' must be plain text, without HTML or script markup.')
    return ' '.join(value.split())


def validate_brief(brief):
    """Validate shape before serialization; unknown fields cannot select tools/paths."""
    _exact(brief, ('schema_version', 'product_id', 'title', 'subtitle', 'audience',
                   'purpose', 'sections'), 'Brief')
    if type(brief['schema_version']) is not int or brief['schema_version'] != SCHEMA_VERSION:
        raise ProductBuildError('Unsupported brief schema version.')
    ident = brief['product_id']
    if not isinstance(ident, str) or not re.fullmatch(r'[a-z][a-z0-9-]{2,47}', ident):
        raise ProductBuildError('product_id must be a 3-48 character lowercase identifier, not a path.')
    clean = {'schema_version': SCHEMA_VERSION, 'product_id': ident}
    for field, limit in (('title', 90), ('subtitle', 160), ('audience', 200), ('purpose', 500)):
        clean[field] = _text(brief[field], limit, field)
    sections = brief['sections']
    if not isinstance(sections, list) or not 1 <= len(sections) <= 6:
        raise ProductBuildError('Use 1-6 sections.')
    clean['sections'] = []
    for section in sections:
        _exact(section, ('heading', 'summary', 'items'), 'Section')
        items = section['items']
        if not isinstance(items, list) or not 1 <= len(items) <= 8:
            raise ProductBuildError('Use 1-8 checklist items per section.')
        out = {'heading': _text(section['heading'], 90, 'Section heading'),
               'summary': _text(section['summary'], 400, 'Section summary'), 'items': []}
        for item in items:
            _exact(item, ('label', 'detail'), 'Checklist item')
            out['items'].append({'label': _text(item['label'], 160, 'Item label'),
                                 'detail': _text(item['detail'], 500, 'Item detail')})
        clean['sections'].append(out)
    if len(_json(clean)) > MAX_BRIEF_BYTES:
        raise ProductBuildError('Brief exceeds the 32 KB total limit.')
    return clean


def _json(value):
    return (json.dumps(value, ensure_ascii=True, sort_keys=True, indent=2) + '\n').encode('utf-8')


def _sha(data):
    return hashlib.sha256(data).hexdigest()


def _workspace(root):
    root = Path(root).absolute()
    # Refuse symlink components, including links that still resolve inside workspace.
    if any(p.is_symlink() for p in (root, *root.parents)):
        raise ProductBuildError('Workspace must not contain symlink path components.')
    if not root.is_dir() or root == Path(root.anchor):
        raise ProductBuildError('An existing isolated workspace directory is required.')
    return root


def _mkdir(path):
    try:
        path.mkdir(mode=0o700)
    except FileExistsError:
        if path.is_symlink() or not path.is_dir():
            raise ProductBuildError('Output location must be a real directory.') from None
    return path


def read_brief(workspace, relative_path):
    """Bounded CLI input read, confined to workspace; rejects symlinks and devices."""
    root = _workspace(workspace)
    if not isinstance(relative_path, str) or not relative_path or '\\' in relative_path:
        raise ProductBuildError('Brief path must be relative to the workspace.')
    parts = Path(relative_path).parts
    if Path(relative_path).is_absolute() or any(p in {'.', '..'} or p.startswith('.') for p in parts):
        raise ProductBuildError('Brief path must stay inside the workspace, outside hidden directories.')
    path = root.joinpath(*parts)
    if root not in path.parents or any(p.is_symlink() for p in (path, *path.parents)):
        raise ProductBuildError('Brief path cannot contain symlinks.')
    if not path.is_file() or path.stat().st_size > MAX_BRIEF_BYTES:
        raise ProductBuildError('Brief must be a regular JSON file no larger than 32 KB.')
    def unique_pairs(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ProductBuildError('Duplicate JSON fields are not supported.')
            result[key] = value
        return result
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, 'rb') as stream:
        if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
            raise ProductBuildError('Brief must be a regular JSON file.')
        data = stream.read(MAX_BRIEF_BYTES + 1)
    if len(data) > MAX_BRIEF_BYTES:
        raise ProductBuildError('Brief exceeds the 32 KB total limit.')
    try:
        value = json.loads(data, object_pairs_hook=unique_pairs)
    except (ValueError, UnicodeError, RecursionError):
        raise ProductBuildError('Brief must be valid, bounded JSON without duplicate fields.') from None
    return validate_brief(value)


def _markdown(brief):
    # Markdown is a portable editable companion, not an HTML execution surface.
    def escape(text):
        return re.sub(r'([\\`*_{}\[\]()#+.!|~-])', r'\\\1', text)
    lines = ['# ' + escape(brief['title']), '', NOTICE, '', escape(brief['subtitle']), '',
             'Audience: ' + escape(brief['audience']), '', 'Purpose: ' + escape(brief['purpose']), '']
    for i, section in enumerate(brief['sections'], 1):
        lines += ['## ' + str(i) + '. ' + escape(section['heading']), '', escape(section['summary']), '']
        for item in section['items']:
            lines += ['- [ ] **' + escape(item['label']) + '**', '  ' + escape(item['detail'])]
        lines += ['']
    lines += ['## Review and revision', '',
              'Copy brief.json to a working file, edit that copy, then rebuild. Earlier versions stay intact.',
              'editable.md can be edited separately; PDF regeneration reads brief.json only.',
              'PDF is a static printable checklist. It is not a fillable form or a tagged PDF/UA file.', '']
    return '\n'.join(lines).encode('utf-8')


def _plain(brief):
    lines = [brief['title'], NOTICE, '', brief['subtitle'], '', 'Audience: ' + brief['audience'],
             'Purpose: ' + brief['purpose'], '']
    for i, section in enumerate(brief['sections'], 1):
        lines += [str(i) + '. ' + section['heading'], section['summary'], '']
        for item in section['items']:
            lines += ['[ ] ' + item['label'], '    ' + item['detail'], '']
    return ('\n'.join(lines) + '\n').encode('utf-8')


def _pdf(brief):
    try:
        import reportlab
        from reportlab.lib import colors
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether, Table, TableStyle
    except ImportError:
        raise ProductBuildError('PDF building requires the optional ReportLab package in this Python environment. No package was installed.') from None
    from xml.sax.saxutils import escape
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    fonts = Path(reportlab.__file__).resolve().parent / 'fonts'
    try:
        pdfmetrics.registerFont(TTFont('TayVera', str(fonts / 'Vera.ttf')))
        pdfmetrics.registerFont(TTFont('TayVeraBold', str(fonts / 'VeraBd.ttf')))
    except Exception:
        raise ProductBuildError('ReportLab bundled Vera fonts are required for portable PDF rendering.') from None
    buffer = io.BytesIO()
    purple = colors.HexColor('#4c2373')
    ink = colors.HexColor('#201c26')
    styles = {
        'title': ParagraphStyle('title', fontName='TayVeraBold', fontSize=25, leading=29, textColor=ink, spaceAfter=10),
        'subtitle': ParagraphStyle('subtitle', fontName='TayVera', fontSize=12, leading=17, textColor=ink, spaceAfter=14),
        'body': ParagraphStyle('body', fontName='TayVera', fontSize=10.5, leading=15, textColor=ink, spaceAfter=6),
        'section': ParagraphStyle('section', fontName='TayVeraBold', fontSize=15, leading=19, textColor=purple, spaceAfter=7),
        'label': ParagraphStyle('label', fontName='TayVeraBold', fontSize=11, leading=15, textColor=ink, spaceAfter=3),
        'small': ParagraphStyle('small', fontName='TayVera', fontSize=9, leading=13, textColor=ink),
    }
    def para(text, style='body'):
        return Paragraph(escape(text), styles[style])
    story = [para('TRANSCENLUTIONS / LOCAL PRODUCT STUDIO', 'small'), Spacer(1, 18),
             para(brief['title'], 'title'), para(brief['subtitle'], 'subtitle'),
             para('Audience: ' + brief['audience']), para('Purpose: ' + brief['purpose']),
             Spacer(1, 6), para('HOW TO USE', 'label'),
             para('Work through each section. Check an item only when you have the stated evidence. Write decisions beside the steps or in your own notes.'),
             Spacer(1, 12)]
    for number, section in enumerate(brief['sections'], 1):
        story.append(KeepTogether([para(str(number) + '. ' + section['heading'], 'section'),
                                  para(section['summary']), Spacer(1, 3)]))
        for item in section['items']:
            box = Table([['', [para(item['label'], 'label'), para(item['detail'])]]], colWidths=[20, 472])
            box.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                                    ('TOPPADDING', (0, 0), (-1, -1), 2),
                                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
            # Static drawn box avoids missing-font checkbox glyphs.
            original_draw = box.draw
            def draw_checkbox(table=box, draw=original_draw):
                draw()
                table.canv.setStrokeColor(purple)
                table.canv.setLineWidth(0.8)
                table.canv.rect(1, table._height - 13, 9, 9, stroke=1, fill=0)
            box.draw = draw_checkbox
            story.append(box)
        story.append(Spacer(1, 12))
    story += [KeepTogether([para('Review and revision', 'section'),
                           para('Copy brief.json to a working file, edit the copy and rebuild to save a new version. The Markdown and plain-text exports are portable companions. This PDF is a static checklist, not a fillable form.'),
                           para('Local draft only. Verify content and accessibility for your audience before any customer release.')])]
    pages = []
    def page(canvas, doc):
        if doc.page > MAX_PAGES:
            raise ProductBuildError('PDF exceeds the 12-page output limit. Shorten the brief.')
        pages.append(doc.page)
        canvas.setTitle(brief['title'])
        canvas.setAuthor('Transcenlutions local product builder')
        canvas.setSubject('Draft sample checklist. No commercial release or revenue claim.')
        canvas.setStrokeColor(colors.HexColor('#b58934'))
        canvas.setLineWidth(1)
        canvas.line(60, 746, 552, 746)
        canvas.setFillColor(ink)
        canvas.setFont('TayVera', 7)
        canvas.drawString(60, 35, 'DRAFT / SAMPLE - Review before use. No offer or revenue claim.')
        canvas.drawRightString(552, 35, 'Page ' + str(doc.page))
    doc = SimpleDocTemplate(buffer, pagesize=(612, 792), rightMargin=60, leftMargin=60,
                            topMargin=64, bottomMargin=58, pageCompression=1,
                            title=brief['title'], author='Transcenlutions local product builder')
    # invariant produces reproducible bytes without timestamps or random document IDs.
    from reportlab.pdfgen.canvas import Canvas
    def canvasmaker(*args, **kwargs):
        kwargs['invariant'] = 1
        return Canvas(*args, **kwargs)
    doc.build(story, onFirstPage=page, onLaterPages=page, canvasmaker=canvasmaker)
    return buffer.getvalue(), len(pages), reportlab.Version


def _verify_existing(folder, expected):
    if folder.is_symlink() or not folder.is_dir():
        raise ProductBuildError('Existing product version is not a real directory.')
    if set(p.name for p in folder.iterdir()) != set(expected):
        raise ProductBuildError('Existing version has unexpected files; no files were overwritten.')
    for name, data in expected.items():
        path = folder / name
        if path.is_symlink() or not path.is_file() or path.stat().st_size != len(data):
            raise ProductBuildError('Existing version was modified; no files were overwritten.')
        with path.open('rb') as stream:
            if _sha(stream.read(len(data) + 1)) != _sha(data):
                raise ProductBuildError('Existing version was modified; no files were overwritten.')


def build_product(brief, output_root):
    """Return manifest with workspace-relative files; caller must authorize workspace.

    Identical normalized source + builder + dependency yields the same immutable
    version. Edits yield a new directory without overwriting any earlier output.
    """
    clean = validate_brief(brief)
    root = _workspace(output_root)
    source = _json(clean)
    pdf, pages, dependency_version = _pdf(clean)
    code_sha = _sha(Path(__file__).read_bytes())
    version = _sha(source + code_sha.encode() + dependency_version.encode())
    relative = Path('products') / clean['product_id'] / version
    outputs = {'checklist.pdf': pdf, 'editable.md': _markdown(clean),
               'checklist.txt': _plain(clean), 'brief.json': source}
    manifest = {
        'schema_version': 1, 'artifact_id': clean['product_id'], 'version': version,
        'title': clean['title'], 'kind': 'checklist', 'status': 'draft_sample',
        'scope': 'local-owner-workspace', 'owning_account': None, 'entitlement': 'local-only-unverified',
        'entrypoint': (relative / 'checklist.pdf').as_posix(),
        'editable_source': (relative / 'brief.json').as_posix(),
        'manifest_path': (relative / 'manifest.json').as_posix(),
        'actions': ['open-local', 'export-files', 'edit-brief', 'regenerate-new-version'],
        'instructions': 'Copy brief.json to a working file, edit that copy and rebuild with the same product_id. Keep saved version files intact. Markdown edits are independent and are not imported into the PDF.',
        'files': [{'path': (relative / name).as_posix(), 'media_type': FILES[name],
                   'bytes': len(data), 'sha256': _sha(data)} for name, data in outputs.items()],
        'validation': {'brief_schema': 'passed', 'bounded_plain_text': 'passed',
                       'page_count': pages, 'max_pages': MAX_PAGES, 'pdf_generated': 'passed',
                       'visual_review': 'not_run', 'text_extraction': 'not_run',
                       'accessibility': 'untagged-pdf-with-markdown-and-text-companions'},
        'provenance': {'builder': 'tay-local-product-builder', 'builder_version': BUILDER_VERSION,
                       'builder_source_sha256': code_sha, 'brief_sha256': _sha(source),
                       'provider': 'local-deterministic', 'model': None,
                       'dependencies': {'reportlab': dependency_version},
                       'external_requests': 0, 'paid_services': False},
        'limits': ['Draft/sample, not a customer offer or verified revenue.',
                   'English printable ASCII only; PDF is static and not PDF/UA tagged.',
                   'No account entitlements, hosted sync, publishing, payments, model calls or network access.',
                   'Caller must separately review factual content, visual layout and intended audience.']}
    outputs['manifest.json'] = _json(manifest)
    products = _mkdir(root / 'products')
    product = _mkdir(products / clean['product_id'])
    target = product / version
    if target.exists() or target.is_symlink():
        _verify_existing(target, outputs)
        return manifest
    staging = Path(tempfile.mkdtemp(prefix='.building-', dir=product))
    try:
        for name, data in outputs.items():
            fd = os.open(staging / name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
            with os.fdopen(fd, 'wb') as stream:
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
        try:
            staging.rename(target)
        except OSError:
            if target.exists():
                _verify_existing(target, outputs)
            else:
                raise
    finally:
        if staging.exists():
            shutil.rmtree(staging)
    return manifest


def main(argv=None):
    parser = argparse.ArgumentParser(description='Build an offline draft checklist from bounded JSON. No installs or network calls.')
    parser.add_argument('--workspace', type=Path, required=True, help='Existing isolated local output/input workspace')
    parser.add_argument('--brief', required=True, help='JSON path relative to the workspace')
    args = parser.parse_args(argv)
    try:
        result = build_product(read_brief(args.workspace, args.brief), args.workspace)
    except (ProductBuildError, OSError) as exc:
        print(str(exc) if isinstance(exc, ProductBuildError) else 'Local file operation failed; no external action was taken.', file=sys.stderr)
        return 2
    print(json.dumps(result, sort_keys=True, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
