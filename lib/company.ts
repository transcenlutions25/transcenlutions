export interface CompanyEmailAddress {
  address: string;
  purpose: string;
}

export type CompanyEmailStatus = "ready" | "setup_required";

export interface CompanyEmailState {
  status: CompanyEmailStatus;
  primaryEmail: string;
  billingEmail: string;
  supportEmail: string;
  title: string;
  description: string;
}

export const recommendedCompanyEmails: CompanyEmailAddress[] = [
  {
    address: "hello@transcenlutions.com",
    purpose: "public company inbox for buyers, partners, and general contact",
  },
  {
    address: "billing@transcenlutions.com",
    purpose: "payments, invoices, receipts, and buyer payment questions",
  },
  {
    address: "support@transcenlutions.com",
    purpose: "customer support after a buyer starts working with Transcenlutions",
  },
];

export const companyEmailCarePoints = [
  "Use a company-domain inbox before sending payment requests.",
  "Keep billing replies separate from general contact when possible.",
  "Never publish a personal inbox as the long-term buyer support address.",
  "Every payment handoff should route to an inbox the owner can actually access.",
];

export const companyEmail =
  process.env.NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL ?? "";

export const billingEmail =
  process.env.NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL ?? "";

export const supportEmail =
  process.env.NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL ?? "";

export function getInvoiceRecipientEmail() {
  return firstConfiguredEmail([billingEmail, companyEmail]);
}

export function getCompanyEmailState(): CompanyEmailState {
  const primaryEmail = companyEmail.trim();
  const invoiceEmail = getInvoiceRecipientEmail();

  if (primaryEmail && invoiceEmail) {
    return {
      status: "ready",
      primaryEmail,
      billingEmail: invoiceEmail,
      supportEmail: supportEmail.trim(),
      title: "Company email ready",
      description:
        "Transcenlutions has a configured company inbox and payment handoff can route to a real address.",
    };
  }

  return {
    status: "setup_required",
    primaryEmail,
    billingEmail: invoiceEmail,
    supportEmail: supportEmail.trim(),
    title: "Company email setup needed",
    description:
      "Create the company-domain inbox, then set the email environment variables before using invoice handoff.",
  };
}

function firstConfiguredEmail(addresses: string[]) {
  return addresses.find((address) => address.trim().length > 0)?.trim() ?? "";
}
