# Apex Flow: executable reference delivery

This is a working, dependency-free Python 3 workflow, not the complete DWY service or an AI integration. It implements CSV inquiry intake → validation → deduplication → persistent review queue → explicit approval → email draft export. It does not send mail, connect Gmail, watch a mailbox or use a language model.

## Run

Use a private work folder outside the repository for all customer inputs, database files and exports. Example commands from this directory:

```sh
python3 -m unittest -v test_lead_workflow.py
python3 lead_workflow.py --db /tmp/apex-demo.sqlite ingest example.csv
python3 lead_workflow.py --db /tmp/apex-demo.sqlite review
# Replace LEAD_ID with the full id returned by review. Read the draft first.
python3 lead_workflow.py --db /tmp/apex-demo.sqlite approve LEAD_ID
python3 lead_workflow.py --db /tmp/apex-demo.sqlite export /tmp/apex-demo-drafts
```

The temporary paths above are for synthetic demo data only. Production data belongs in a backed-up owner-controlled directory with restricted filesystem access. Each CSV needs email,name,inquiry headers. Re-importing an identical normalized record creates no additional lead. Changed inquiries create new records. Review output includes inquiry text and the proposed reply. Rejected records never export; approved files are draft messages for manual review in a compatible mail client. Mail-client draft opening is not verified here.

## Operate and recover

There is no daemon or scheduled job: run intake explicitly. Stop by stopping the command. Back up the database only when the command has exited; restore a copy to a new private path and use `review` to check pending records. Approval history persists across restarts. Never delete the database to retry an import. Existing differing draft files are protected against overwrite. Exports cannot recall a previously created draft; delete it manually if no longer wanted. Approval is irreversible in this reference CLI, so review before approving.

## Before client deployment

Choose the client's real trigger and output; implement and test those adapters separately. Confirm account ownership, authorized data access, failure reporting, retention and operating environment. Set the sender identity and approved message content. This package has no authentication layer and must not be exposed as a public server. Local OS access controls protect it. Do not store secrets or real customer records in Git.

The tests prove the local workflow boundaries, not AI accuracy, third-party API availability, live email delivery, customer results or the entire DWY engagement.
