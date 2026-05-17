import type { DeliveryKit } from "./delivery";
import type { RevenueOffer } from "./revenue";
import type { SalesKit } from "./sales";
import type { ActionArtifact } from "./types";

export function createOfferDeliveryArtifact(
  offer: RevenueOffer,
  deliveryKit: DeliveryKit,
  salesKit: SalesKit,
): ActionArtifact {
  return {
    title: `${offer.name} Delivery Artifact`,
    subtitle: `${offer.price} offer foundation for careful buyer handoff and fulfillment.`,
    sections: [
      {
        heading: "Buyer outcome",
        items: [offer.outcome],
      },
      {
        heading: "Intake questions",
        items: offer.buyerIntake.map((item) => `Capture ${item}.`),
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
        heading: "Sales boundary",
        items: salesKit.disqualifiers.map((item) => `Do not sell if the buyer ${item}.`),
      },
    ],
    careNote: deliveryKit.qualityStandard,
  };
}
