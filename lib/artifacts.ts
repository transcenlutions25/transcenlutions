import type { DeliveryKit } from "./delivery";
import type { OfferPaymentState, RevenueOffer } from "./revenue";
import type { SalesKit } from "./sales";
import type { ActionArtifact } from "./types";

export function createOfferDeliveryArtifact(
  offer: RevenueOffer,
  deliveryKit: DeliveryKit,
  salesKit: SalesKit,
  paymentState: OfferPaymentState,
): ActionArtifact {
  return {
    title: `${offer.name} Delivery Artifact`,
    subtitle: `${offer.price} offer foundation for careful buyer handoff and fulfillment.`,
    sections: [
      {
        heading: "Offer title",
        items: [offer.name],
      },
      {
        heading: "Buyer problem",
        items: [offer.buyerProblem],
      },
      {
        heading: "Promised outcome",
        items: [offer.outcome],
      },
      {
        heading: "Scope",
        items: offer.scope,
      },
      {
        heading: "Price",
        items: [
          paymentState.setupRequired
            ? `${offer.price} listed, but payment setup is required before collection.`
            : `${offer.price} through ${paymentState.title.toLowerCase()}.`,
        ],
      },
      {
        heading: "Delivery format",
        items: [offer.delivery],
      },
      {
        heading: "Timeline",
        items: [offer.timeline],
      },
      {
        heading: "Delivery flow",
        items: deliveryKit.phases,
      },
      {
        heading: "Buyer artifacts",
        items: deliveryKit.artifacts,
      },
      {
        heading: "Refund/support note",
        items: [offer.refundSupportNote],
      },
      {
        heading: "Next step",
        items: [
          paymentState.mode === "test_simulated"
            ? "Run the simulated test flow only; configure live payment before buyer collection."
            : "Qualify buyer fit, request approval for payment handoff, then deliver the first artifact.",
        ],
      },
      {
        heading: "Sales boundary",
        items: salesKit.disqualifiers.map(
          (item) => `Do not sell if the buyer ${item}.`,
        ),
      },
    ],
    careNote: deliveryKit.qualityStandard,
  };
}
