"use client";

import { ClipboardCheck, Sparkles } from "lucide-react";
import { deliveryKits, fulfillmentCarePoints } from "../lib/delivery";

interface FulfillmentPanelProps {
  onCommand: (request: string) => void;
}

export function FulfillmentPanel({ onCommand }: FulfillmentPanelProps) {
  return (
    <section className="fulfillment-command" aria-label="Client fulfillment">
      <div className="section-header">
        <p className="eyebrow">Client Fulfillment</p>
        <h2>Paid work must turn into useful artifacts.</h2>
        <p>
          Tay now keeps the first offers tied to delivery standards, buyer
          outcomes, and follow-up prompts so revenue stays connected to real
          value.
        </p>
      </div>

      <div className="fulfillment-grid">
        {deliveryKits.map((kit) => (
          <article className="fulfillment-card" key={kit.offerId}>
            <div className="card-title-row">
              <span className="icon-disc">
                <ClipboardCheck size={17} />
              </span>
              <p className="eyebrow">Delivery Kit</p>
            </div>
            <h3>{kit.title}</h3>
            <p>{kit.deliveryPromise}</p>
            <div>
              <p className="mini-heading">Delivery phases</p>
              <ol>
                {kit.phases.map((phase) => (
                  <li key={phase}>{phase}</li>
                ))}
              </ol>
            </div>
            <div>
              <p className="mini-heading">Buyer artifacts</p>
              <ul>
                {kit.artifacts.map((artifact) => (
                  <li key={artifact}>{artifact}</li>
                ))}
              </ul>
            </div>
            <div className="quality-standard">
              <strong>Quality standard</strong>
              <p>{kit.qualityStandard}</p>
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

      <div className="fulfillment-care-grid">
        {fulfillmentCarePoints.map((point) => (
          <span key={point}>
            <ClipboardCheck size={15} />
            {point}
          </span>
        ))}
      </div>
    </section>
  );
}
