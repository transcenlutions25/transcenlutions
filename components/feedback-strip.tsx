"use client";

import { Meh, ThumbsDown, ThumbsUp } from "lucide-react";
import type {
  FeedbackCategory,
  FeedbackDraft,
  FeedbackRating,
} from "../lib/feedback";
import {
  feedbackRatingChoices,
  frictionReasonChoices,
} from "../lib/feedback";

interface FeedbackStripProps {
  draft: FeedbackDraft | null;
  onRate: (rating: FeedbackRating) => void;
  onChooseCategory: (category: FeedbackCategory) => void;
  onNoteChange: (note: string) => void;
}

const ratingIcons = {
  helped: ThumbsUp,
  kinda: Meh,
  didnt_help: ThumbsDown,
};

export function FeedbackStrip({
  draft,
  onRate,
  onChooseCategory,
  onNoteChange,
}: FeedbackStripProps) {
  const shouldAskWhy =
    draft?.rating === "kinda" || draft?.rating === "didnt_help";

  return (
    <section className="feedback-strip" aria-label="Tay feedback">
      <div className="feedback-strip__top">
        <div>
          <p className="eyebrow">Quick Feedback</p>
          <h3>Was this helpful?</h3>
        </div>
        <div className="feedback-rating-row">
          {feedbackRatingChoices.map((choice) => {
            const Icon = ratingIcons[choice.rating];
            const isActive = draft?.rating === choice.rating;

            return (
              <button
                className={`feedback-chip ${isActive ? "feedback-chip--active" : ""}`}
                key={choice.rating}
                type="button"
                onClick={() => onRate(choice.rating)}
                title={choice.detail}
              >
                <Icon size={15} />
                {choice.label}
              </button>
            );
          })}
        </div>
      </div>

      {shouldAskWhy ? (
        <div className="feedback-followup">
          <p>What felt off?</p>
          <div className="feedback-reason-grid">
            {frictionReasonChoices.map((choice) => (
              <button
                className={`feedback-reason ${
                  draft?.category === choice.category
                    ? "feedback-reason--active"
                    : ""
                }`}
                key={choice.category}
                type="button"
                onClick={() => onChooseCategory(choice.category)}
              >
                {choice.label}
              </button>
            ))}
          </div>
          <textarea
            aria-label="Optional feedback note"
            placeholder="Optional note"
            value={draft?.note ?? ""}
            onChange={(event) => onNoteChange(event.target.value)}
          />
        </div>
      ) : null}

      {draft?.rating ? (
        <p className="feedback-captured">
          Feedback captured. Tay can improve clarity and usefulness, while the
          mission and governance stay protected.
        </p>
      ) : null}
    </section>
  );
}
