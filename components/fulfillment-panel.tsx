"use client";

import { useRef } from "react";
import { ClipboardCheck, Sparkles } from "lucide-react";
import { deliveryKits, fulfillmentCarePoints } from "../lib/delivery";
import { WritingBlock } from "./writing-block";

interface FulfillmentPanelProps {
  onCommand: (request: string) => void;
}

export function FulfillmentPanel({ onCommand }: FulfillmentPanelProps) {
  const drafts = useRef<Record<string, string>>({});
  function deliveryBrief(kit: typeof deliveryKits[number]) {
    return [kit.deliveryPromise, `Delivery phases\n${kit.phases.map((phase, slot) => `${slot + 1}. ${phase}`).join("\n")}`,
      `Buyer artifacts\n${kit.artifacts.map((artifact) => `• ${artifact}`).join("\n")}`, `Quality standard\n${kit.qualityStandard}`].join("\n\n");
  }
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
            <WritingBlock id={`fulfillment:${kit.offerId}:delivery-brief`} title="Delivery brief" kind="document" content={deliveryBrief(kit)}
              onContentChange={(value) => { drafts.current[`${kit.offerId}:delivery-brief`] = value; }} />
            <WritingBlock id={`fulfillment:${kit.offerId}:followup`} title="Buyer follow-up" content={kit.followUpPrompt}
              onContentChange={(value) => { drafts.current[`${kit.offerId}:followup`] = value; }} />
            <button
              className="secondary-button"
              type="button"
              onClick={() => onCommand(`${kit.command}\n\nCurrent delivery brief:\n${drafts.current[`${kit.offerId}:delivery-brief`] ?? deliveryBrief(kit)}\n\nBuyer follow-up draft:\n${drafts.current[`${kit.offerId}:followup`] ?? kit.followUpPrompt}`)}
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
