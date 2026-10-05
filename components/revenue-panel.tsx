"use client";

import { useRef } from "react";
import {
  Banknote,
  FlaskConical,
  Lock,
  Mail,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import {
  companyEmailCarePoints,
  getCompanyEmailState,
  recommendedCompanyEmails,
} from "../lib/company";
import {
  getOfferPaymentState,
  paymentCarePoints,
  revenueOffers,
} from "../lib/revenue";
import type { RevenueSetupState } from "../lib/revenue-setup";
import { WritingBlock } from "./writing-block";

interface RevenuePanelProps {
  onCommand: (request: string) => void;
  revenueSetup: RevenueSetupState;
}

export function RevenuePanel({ onCommand, revenueSetup }: RevenuePanelProps) {
  const companyEmailState = getCompanyEmailState();
  const drafts = useRef<Record<string, string>>({});
  function offerBrief(offer: typeof revenueOffers[number]) {
    return [offer.promise, `Best for\n${offer.bestFor}`, `Delivery\n${offer.delivery}`,
      `Buyer receives\n${offer.includes.map((item) => `• ${item}`).join("\n")}`,
      `Intake questions\n${offer.buyerIntake.map((item) => `• ${item}`).join("\n")}`].join("\n\n");
  }

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

      <div className={`revenue-setup revenue-setup--${revenueSetup.mode}`}>
        <div>
          <p className="eyebrow">Revenue Setup</p>
          <h3>{revenueSetup.title}</h3>
          <p>{revenueSetup.description}</p>
          <div className="setup-summary">
            <span>{revenueSetup.configuredCount} configured</span>
            <span>{revenueSetup.missingCount} required missing</span>
            <span>
              {revenueSetup.isTestMode ? "test mode simulated" : "live mode"}
            </span>
          </div>
        </div>
        <div className="setup-item-grid">
          {revenueSetup.items.map((item) => (
            <article className={`setup-item setup-item--${item.status}`} key={item.id}>
              <div>
                {item.status === "simulated" ? (
                  <FlaskConical size={15} />
                ) : item.status === "configured" ||
                  item.status === "server_only" ||
                  item.status === "not_required" ? (
                  <ShieldCheck size={15} />
                ) : (
                  <Wrench size={15} />
                )}
                <strong>{item.label}</strong>
              </div>
              <p>{item.detail}</p>
              <span>{item.envKeys.join(" / ")}</span>
            </article>
          ))}
        </div>
      </div>

      <article className="revenue-card">
        <p className="eyebrow">Apex Flow · Self-serve checklist</p>
        <h3>Funnel Leak Emergency Checklist</h3>
        <p>20 checks across five funnel stages, a named fix for every point and a downloadable plan. Existing $27 price; checkout stays closed until paid delivery is verified. Guided services are unavailable.</p>
        <div className="revenue-card__actions">
          <a className="primary-button" href="/apex-flow/offer.html">Review Apex Flow</a>
          <button className="secondary-button" type="button" onClick={() => onCommand("Prepare the Apex Flow $27 checklist launch from docs/APEX_CHECKLIST_RELEASE.md. Keep the $997 guided tier locked. Verify the complete digital deliverable and payment-to-download flow before enabling checkout. Do not claim collected revenue from tests.")}>Plan launch in Tay</button>
        </div>
      </article>

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
              <WritingBlock id={`revenue:${offer.id}:offer-brief`} title="Offer brief draft" kind="document" content={offerBrief(offer)}
                onContentChange={(value) => { drafts.current[offer.id] = value; }} />
              <div className={`payment-status payment-status--${paymentState.mode}`}>
                <strong>{paymentState.title}</strong>
                <p>{paymentState.description}</p>
              </div>
              <p className="writing-block__scope-note">Editing the draft updates your writing. Checkout price and payment settings stay in the offer controls.</p>
              <div className="revenue-card__actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => onCommand(`${offer.command}\n\nCurrent offer brief draft:\n${drafts.current[offer.id] ?? offerBrief(offer)}`)}
                >
                  Prepare in Tay
                </button>
                {paymentState.href ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() =>
                      onCommand(
                        `Send ${paymentState.mode === "checkout" ? "checkout" : "invoice"} details for ${offer.name}`,
                      )
                    }
                  >
                    <Lock size={17} />
                    Request handoff
                  </button>
                ) : paymentState.mode === "test_simulated" ? (
                  <button className="secondary-button button-disabled" disabled type="button">
                    <FlaskConical size={17} />
                    Simulated only
                  </button>
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
            handoff only when a real company or billing inbox is present.
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

      <div className="revenue-handoff">
        <div>
          <p className="eyebrow">Company Email</p>
          <h3>{companyEmailState.title}</h3>
          <p>{companyEmailState.description}</p>
          <div className="email-status-grid">
            <span>
              Main: {companyEmailState.primaryEmail || "setup needed"}
            </span>
            <span>
              Billing: {companyEmailState.billingEmail || "setup needed"}
            </span>
            <span>
              Support: {companyEmailState.supportEmail || "setup optional"}
            </span>
          </div>
        </div>
        <div className="payment-care-grid">
          {companyEmailCarePoints.map((point) => (
            <span key={point}>
              <Mail size={15} />
              {point}
            </span>
          ))}
        </div>
      </div>

      <div className="email-route-grid">
        {recommendedCompanyEmails.map((item) => (
          <article className="email-route-card" key={item.address}>
            <strong>{item.address}</strong>
            <p>{item.purpose}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

