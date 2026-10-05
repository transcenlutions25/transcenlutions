"""Apex Flow reference delivery: CSV inquiry intake -> review -> approved .eml drafts.

Standard library only. No messages are sent. Run --help for commands.
"""
import argparse
import csv
import hashlib
import json
import re
import sqlite3
from email.message import EmailMessage
from pathlib import Path


def connect(path):
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.execute('''CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL,
        inquiry TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)''')
    db.execute('''CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY, lead_id TEXT NOT NULL, action TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)''')
    return db


def ingest(db, source):
    results = {'created': [], 'duplicates': [], 'errors': []}
    with open(source, newline='', encoding='utf-8-sig') as handle:
        reader = csv.DictReader(handle)
        if not {'email', 'name', 'inquiry'}.issubset(reader.fieldnames or []):
            raise ValueError('CSV requires email, name and inquiry columns')
        with db:
            for number, row in enumerate(reader, 2):
                email = (row.get('email') or '').strip().lower()
                name = (row.get('name') or '').strip()
                inquiry = (row.get('inquiry') or '').strip()
                if (not re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+', email)
                        or any(ord(c) < 32 for c in email + name)
                        or not name or not inquiry or len(name) > 200
                        or len(email) > 254 or len(inquiry) > 5000):
                    results['errors'].append({'row': number, 'reason': 'Invalid or missing email, name or inquiry'})
                    continue
                key = hashlib.sha256(json.dumps([email, name, inquiry], ensure_ascii=False).encode()).hexdigest()
                body = f'Hello {name},\n\nThank you for your inquiry. We have received it and will review the details.\n\nBest regards'
                cursor = db.execute('INSERT OR IGNORE INTO leads(id,email,name,inquiry,subject,body,status) VALUES(?,?,?,?,?,?,?)',
                                    (key, email, name, inquiry, 'Your inquiry', body, 'pending'))
                if cursor.rowcount:
                    db.execute('INSERT INTO events(lead_id,action) VALUES(?,?)', (key, 'imported'))
                    results['created'].append(key)
                else:
                    results['duplicates'].append(key)
    return results


def decide(db, key, status):
    if status not in ('approved', 'rejected'):
        raise ValueError('Decision must be approved or rejected')
    with db:
        cursor = db.execute("UPDATE leads SET status=? WHERE id=? AND status='pending'", (status, key))
        if cursor.rowcount != 1:
            raise ValueError('Lead is missing or already reviewed')
        db.execute('INSERT INTO events(lead_id,action) VALUES(?,?)', (key, status))


def export(db, destination):
    folder = Path(destination)
    folder.mkdir(parents=True, exist_ok=True)
    exported = []
    for row in db.execute("SELECT * FROM leads WHERE status='approved' ORDER BY id"):
        message = EmailMessage()
        message['To'] = row['email']
        message['Subject'] = row['subject']
        message['X-Unsent'] = '1'
        message.set_content(row['body'])
        path = folder / (row['id'] + '.eml')
        try:
            with path.open('xb') as output:
                output.write(bytes(message))
            exported.append(path.name)
        except FileExistsError:
            if path.read_bytes() != bytes(message):
                raise ValueError('Existing draft differs; export into a new empty folder')
    return exported


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', required=True, help='Private local SQLite database path; never commit it')
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('ingest').add_argument('csv')
    sub.add_parser('review')
    for action in ('approve', 'reject'):
        sub.add_parser(action).add_argument('id')
    sub.add_parser('export').add_argument('folder')
    args = parser.parse_args()
    with connect(args.db) as db:
        if args.command == 'ingest':
            output = ingest(db, args.csv)
        elif args.command == 'review':
            output = [dict(row) for row in db.execute("SELECT * FROM leads WHERE status='pending'")]
        elif args.command in ('approve', 'reject'):
            decide(db, args.id, 'approved' if args.command == 'approve' else 'rejected')
            output = {'id': args.id, 'status': args.command}
        else:
            output = {'draft_files': export(db, args.folder), 'messages_sent': 0}
    print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()
