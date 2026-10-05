# OWNER HOLD — 2026-10-04

The owner has not yet practiced guided customer delivery. The $997 guided/DWY tier is closed and must not be sold or booked. The material below remains an internal practice and implementation reference. Current self-serve work is documented in `APEX_CHECKLIST_RELEASE.md`. This decision supersedes earlier launch proposals.

# Apex Flow delivery definition and acceptance record

## Intended paid deliverable

A done-with-you implementation engagement: diagnose the customer's repetitive business task, agree a bounded workflow, build it in the agreed customer-owned environment, test the trigger/conditions/actions/output, and hand over working automation with operating instructions. The brief is intake, not the purchased result. Software, configuration and documentation developed for the agreed workflow are part of the handover, subject to third-party licenses.

Delivery stages: diagnosis and access review; workflow design and acceptance agreement; implementation with incremental tests; customer demonstration and handover. AI generation/classification is implemented only where the agreed workflow calls for it, with representative evaluation and human approval for consequential outputs. No AI integration is currently included in the executable reference.

## Concrete first reference

The repository includes `tools/apex-flow/lead_workflow.py`: CSV intake, field validation, repeat-import protection, SQLite review queue, explicit approve/reject decisions and approved-only .eml export. This establishes a reusable lead-handling core. Customer-specific mailbox/form/CRM connectors, scheduling, sender identity and live delivery must still be implemented for the chosen customer workflow. The reference is not a substitute for those connectors.

## Acceptance gate for each customer

- Written workflow boundaries and expected output agreed before charging.
- Normal input produces the agreed output in the actual delivery environment.
- Invalid input stops safely and is visible to the operator.
- Repeated events do not create unintended duplicate actions.
- A service outage/restart has a documented, tested recovery procedure.
- External actions follow the agreed approval policy.
- Client receives source/configuration where applicable, workflow map, setup requirements, test evidence, operating instructions and known limitations.
- Client demonstrates how to run, pause and recover their workflow.

## Commercial details still requiring owner confirmation

The supplied founder playbook states $997 and describes multiple sessions without an unambiguous total session entitlement. Preserve that price reference; do not silently substitute a $97 or $497 Stripe product. Confirm the included session count, delivery calendar and support capacity before checkout. The playbook's two-hour responses and 24-hour fixes are not verified staffing capacity. Its guarantee/cancellation wording needs an explicit final owner-approved customer version. These are unresolved terms, not reasons to downgrade implementation to an advice call.

## Evidence and limits

Source: owner-supplied Apex Flow — Premium Digital Products.PDF, whose internal title is Done With You Coaching Guide. Implemented on 2026-10-04 UTC (2026-10-03 New York).

Local acceptance tests cover valid/invalid rows, deduplication, pending/rejected export prevention, persisted approval after reconnect, draft contents, repeat export, overwrite protection and malformed CSV schema. Browser rendering, full Next build, actual email-client behavior, live connectors and paid delivery remain separate verification gates. No collected revenue is claimed.
