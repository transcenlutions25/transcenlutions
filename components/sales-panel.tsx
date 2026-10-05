"use client";

import { useRef } from "react";
import {
  CornerDownRight,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  buyerReplyCarePoints,
  buyerReplyExamples,
} from "../lib/buyer-replies";
import { salesCarePoints, salesKits } from "../lib/sales";
import { WritingBlock } from "./writing-block";

interface SalesPanelProps {
  onCommand: (request: string) => void;
}

export function SalesPanel({ onCommand }: SalesPanelProps) {
  const drafts = useRef<Record<string, string>>({});
  const followUpIds = ["fit-question", "value-note", "next-step"];
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
            <WritingBlock id={`sales:${kit.offerId}:first-message`} title="First message" content={kit.firstMessage}
              onContentChange={(value) => { drafts.current[`${kit.offerId}:first-message`] = value; }} />
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
              {kit.followUps.map((item, slot) => (
                <WritingBlock key={followUpIds[slot]} id={`sales:${kit.offerId}:followup:${followUpIds[slot]}`}
                  title={`Follow-up ${slot + 1}`} content={item}
                  onContentChange={(value) => { drafts.current[`${kit.offerId}:followup:${followUpIds[slot]}`] = value; }} />
              ))}
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
              onClick={() => onCommand(`${kit.command}\n\nCurrent outreach draft:\n${drafts.current[`${kit.offerId}:first-message`] ?? kit.firstMessage}\n\nCurrent follow-up drafts:\n${kit.followUps.map((item, slot) => drafts.current[`${kit.offerId}:followup:${followUpIds[slot]}`] ?? item).join("\n\n")}`)}
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

      <div className="reply-routing">
        <div className="card-title-row">
          <span className="icon-disc">
            <CornerDownRight size={16} />
          </span>
          <div>
            <p className="eyebrow">Reply Routing</p>
            <h3>Paste the buyer&apos;s answer back into Tay.</h3>
          </div>
        </div>
        <div className="reply-command-grid">
          {buyerReplyExamples.map((example) => (
            <div className="reply-command" key={example.label}>
              <WritingBlock id={`sales:buyer-reply:${example.label}`} title={example.label} content={example.prompt}
                onContentChange={(value) => { drafts.current[`buyer-reply:${example.label}`] = value; }} />
              <button className="secondary-button" type="button"
                onClick={() => onCommand(drafts.current[`buyer-reply:${example.label}`] ?? example.prompt)}>Use reply with Tay</button>
            </div>
          ))}
        </div>
        <div className="sales-care-grid">
          {buyerReplyCarePoints.map((point) => (
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
