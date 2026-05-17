# Company Email Setup

The Transcenlutions platform should not use a personal inbox for buyer payment
handoff, support, or official company contact. Create real company-domain
mailboxes before sending offers to buyers.

## Recommended Addresses

- `hello@transcenlutions.com` — public company inbox for buyers, partners, and
  general contact.
- `billing@transcenlutions.com` — invoices, receipts, payment questions, and
  paid offer handoff.
- `support@transcenlutions.com` — customer support after a buyer starts working
  with Transcenlutions.

## Setup Checklist

1. Own and control the company domain.
2. Choose an email provider such as Google Workspace, Microsoft 365, Proton Mail,
   Zoho Mail, or another business email host.
3. Create the mailboxes or aliases listed above.
4. Add the provider's MX, SPF, DKIM, and DMARC records in DNS.
5. Send and receive a test email from every address.
6. Add the environment variables below to the app host.
7. Restart or redeploy the app so Tay can show the company email as ready.

## Environment Variables

```bash
NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL="hello@transcenlutions.com"
NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL="billing@transcenlutions.com"
NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL="support@transcenlutions.com"
```

## Care Rules

- Do not publish an inbox until the owner can actually receive replies.
- Use the billing inbox for payment handoff and invoice replies.
- Keep support separate from sales once buyers begin paying.
- Do not put passwords, recovery codes, or private provider credentials in the
  repo.

