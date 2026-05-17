"use client";

import { Banknote, ExternalLink, Mail, ShieldCheck } from "lucide-react";
import {
  buildInvoiceMailto,
  checkoutUrl,
  revenueOffers,
} from "../lib/revenue";

interface RevenuePanelProps {
  onCommand: (request: string) => void;
}

export function RevenuePanel({ onCommand }: RevenuePanelProps) {
  const primaryOffer = revenueOffers[0];
  const paymentReady = checkoutUrl.length > 0;
  const paymentHref = paymentReady
    ? checkoutUrl
    : buildInvoiceMailto(primaryOffer);

  return (
    <section className="revenue-command" aria-label="Revenue launch">
      <div className="section-header">
        <p className="eyebrow">Revenue Launch</p>
        <h2>Sell the first command-room offer.</h2>
        <p>
          Tay can prepare a buyer-ready offer today. Direct payment processing
          stays outside the app until an approved payment link is connected.
        </p>
      </div>

      <div className="revenue-grid">
        {revenueOffers.map((offer) => (
          <article className="revenue-card" key={offer.id}>
            <div className="revenue-card__top">
              <span className="icon-disc">
                <Banknote size={18} />
              </span>
              <strong>{offer.price}</strong>
            </div>
            <h3>{offer.name}</h3>
            <p>{offer.promise}</p>
            <ul>
              {offer.includes.map((item) => (
                <li key={item}>
                  <ShieldCheck size={15} />
                  {item}
                </li>
              ))}
            </ul>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onCommand(offer.command)}
            >
              Prepare in Tay
            </button>
          </article>
        ))}
      </div>

      <div className="revenue-handoff">
        <div>
          <p className="eyebrow">Payment Handoff</p>
          <h3>{paymentReady ? "Checkout link connected" : "Manual invoice mode"}</h3>
          <p>
            {paymentReady
              ? "The primary revenue button opens the approved checkout link."
              : "No payment URL is configured yet. The button drafts an invoice email so a real buyer can be sent payment instructions manually."}
          </p>
        </div>
        <a
          className="primary-button"
          href={paymentHref}
          target={paymentReady ? "_blank" : undefined}
          rel={paymentReady ? "noreferrer" : undefined}
        >
          {paymentReady ? <ExternalLink size={17} /> : <Mail size={17} />}
          {paymentReady ? "Open checkout" : "Draft invoice email"}
        </a>
      </div>
    </section>
  );
}
