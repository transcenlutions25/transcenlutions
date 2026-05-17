"use client";

import { MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import { salesCarePoints, salesKits } from "../lib/sales";

interface SalesPanelProps {
  onCommand: (request: string) => void;
}

export function SalesPanel({ onCommand }: SalesPanelProps) {
  return (
    <section className="sales-command" aria-label="Buyer outreach">
      <div className="section-header">
        <p className="eyebrow">Buyer Outreach</p>
        <h2>Clear offers need careful asks.</h2>
        <p>
          Tay can help prepare honest buyer messages, fit checks, and follow-up
          prompts. Outreach stays human-controlled and never promises automatic
          income.
        </p>
      </div>

      <div className="sales-grid">
        {salesKits.map((kit) => (
          <article className="sales-card" key={kit.offerId}>
            <div className="card-title-row">
              <span className="icon-disc">
                <MessageSquareText size={17} />
              </span>
              <p className="eyebrow">Outreach Kit</p>
            </div>
            <h3>{kit.title}</h3>
            <div className="message-script">
              <strong>First message</strong>
              <p>{kit.firstMessage}</p>
            </div>
            <div>
              <p className="mini-heading">Good buyer fit</p>
              <ul>
                {kit.buyerFit.map((item) => (
                  <li key={item}>
                    <ShieldCheck size={15} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mini-heading">Follow-up prompts</p>
              <ol>
                {kit.followUps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
            <div>
              <p className="mini-heading">Do not sell if</p>
              <ul>
                {kit.disqualifiers.map((item) => (
                  <li key={item}>
                    <ShieldCheck size={15} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onCommand(kit.command)}
            >
              <Sparkles size={16} />
              Prepare with Tay
            </button>
          </article>
        ))}
      </div>

      <div className="sales-care-grid">
        {salesCarePoints.map((point) => (
          <span key={point}>
            <ShieldCheck size={15} />
            {point}
          </span>
        ))}
      </div>
    </section>
  );
}
