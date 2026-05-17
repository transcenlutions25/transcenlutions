"use client";

import { Banknote, ExternalLink, Mail, ShieldCheck, Wrench } from "lucide-react";
import {
  getOfferPaymentState,
  paymentCarePoints,
  revenueOffers,
} from "../lib/revenue";

interface RevenuePanelProps {
  onCommand: (request: string) => void;
}

export function RevenuePanel({ onCommand }: RevenuePanelProps) {
  return (
    <section className="revenue-command" aria-label="Revenue launch">
      <div className="section-header">
        <p className="eyebrow">Revenue Launch</p>
        <h2>Real offers. Real payment care.</h2>
        <p>
          Tay can prepare buyer-ready service offers today. Payments only move
          through approved checkout links or clearly addressed invoice handoff.
        </p>
      </div>

      <div className="revenue-grid">
        {revenueOffers.map((offer) => {
          const paymentState = getOfferPaymentState(offer);

          return (
            <article className="revenue-card" key={offer.id}>
              <div className="revenue-card__top">
                <span className="icon-disc">
                  <Banknote size={18} />
                </span>
                <strong>{offer.price}</strong>
              </div>
              <h3>{offer.name}</h3>
              <p>{offer.promise}</p>
              <div className="offer-meta">
                <span>{offer.delivery}</span>
                <span>{offer.bestFor}</span>
              </div>
              <div className={`payment-status payment-status--${paymentState.mode}`}>
                <strong>{paymentState.title}</strong>
                <p>{paymentState.description}</p>
              </div>
              <div>
                <p className="mini-heading">Buyer receives</p>
                <ul>
                  {offer.includes.map((item) => (
                    <li key={item}>
                      <ShieldCheck size={15} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mini-heading">Intake captures</p>
                <ul>
                  {offer.buyerIntake.map((item) => (
                    <li key={item}>
                      <ShieldCheck size={15} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="revenue-card__actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => onCommand(offer.command)}
                >
                  Prepare in Tay
                </button>
                {paymentState.href ? (
                  <a
                    className="primary-button"
                    href={paymentState.href}
                    target={paymentState.external ? "_blank" : undefined}
                    rel={paymentState.external ? "noreferrer" : undefined}
                  >
                    {paymentState.mode === "checkout" ? (
                      <ExternalLink size={17} />
                    ) : (
                      <Mail size={17} />
                    )}
                    {paymentState.label}
                  </a>
                ) : (
                  <button className="secondary-button button-disabled" disabled type="button">
                    <Wrench size={17} />
                    {paymentState.label}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="revenue-handoff">
        <div>
          <p className="eyebrow">Payment Standard</p>
          <h3>Income is handled as real from the first dollar.</h3>
          <p>
            Live checkout appears only when an approved Stripe Payment Link is
            configured for the specific offer. Otherwise Tay uses invoice
            handoff only when a real contact email is present.
          </p>
        </div>
        <div className="payment-care-grid">
          {paymentCarePoints.map((point) => (
            <span key={point}>
              <ShieldCheck size={15} />
              {point}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
