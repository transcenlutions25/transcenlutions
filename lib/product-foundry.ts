/**
 * Tay Product Foundry: multi-brand physical product discovery and release gates.
 * IMPORTANT: planning data only. Do not interpret catalog ideas as sale-ready SKUs,
 * supplier endorsements, ownership proof, certifications, or actual provider connections.
 */

export type FoundryLineId =
  | "crowne-legacy"
  | "rooted-light"
  | "botanicals"
  | "gaming"
  | "childrens"
  | "transcenlutions"
  | "hallway-cleaning"
  | "one-flesh";

export type FoundryRisk =
  | "original-ip"
  | "organic-claim"
  | "food"
  | "essential-oil"
  | "child-product"
  | "toy"
  | "electronics";

export type FoundryFulfillment = "print-on-demand" | "verified-dropship" | "custom-manufacturing";

export interface FoundryProduct {
  id: string;
  title: string;
  summary: string;
  fulfillment: FoundryFulfillment;
  risk: readonly FoundryRisk[];
}

export interface FoundryLine {
  id: FoundryLineId;
  title: string;
  organization: string;
  introduction: string;
  products: readonly FoundryProduct[];
}

export const foundryLines: readonly FoundryLine[] = [
  {
    id: "crowne-legacy",
    title: "Crowne Legacy",
    organization: "Transcenlutions · Crowne Legacy",
    introduction: "Official merchandise tied to the existing character designs, identities and story canon. Do not invent new canonical characters or sell unlicensed artwork.",
    products: [
      { id: "crowne-adult-tee", title: "Crowne Legacy character apparel", summary: "Official adult tees and hoodies using verified original canon artwork.", fulfillment: "print-on-demand", risk: ["original-ip"] },
      { id: "crowne-desk-mat", title: "Crowne Legacy gaming desk mat", summary: "Large format desktop art with original world and character designs.", fulfillment: "print-on-demand", risk: ["original-ip"] },
      { id: "crowne-collectible", title: "Crowne Legacy collector figurine", summary: "Original character collectible, with age-grading and materials review before an offer.", fulfillment: "custom-manufacturing", risk: ["original-ip", "child-product"] },
      { id: "crowne-plush", title: "Crowne Legacy plush toy", summary: "Character plush only with a certified, tested production pathway.", fulfillment: "custom-manufacturing", risk: ["original-ip", "child-product", "toy"] },
    ],
  },
  {
    id: "rooted-light",
    title: "Rooted Light",
    organization: "Transcenlutions · Rooted Light",
    introduction: "Faith-centered, family-minded original products connected to the existing series without changing its story canon.",
    products: [
      { id: "rooted-legacy-journal", title: "The Light You Leave — Family Legacy Journal", summary: "Guided storytelling, meaningful reflection and family activities; first zero-inventory candidate.", fulfillment: "print-on-demand", risk: ["original-ip"] },
      { id: "rooted-activity-book", title: "Rooted Light children's activity book", summary: "Original age-appropriate learning, moral choices and creative activities.", fulfillment: "print-on-demand", risk: ["original-ip", "child-product"] },
      { id: "rooted-learning-cards", title: "Rooted Light learning cards", summary: "Original educational activity cards; physical product and age-grade require review.", fulfillment: "custom-manufacturing", risk: ["original-ip", "child-product", "toy"] },
    ],
  },
  {
    id: "botanicals",
    title: "Organic Herbs & Essential Oils",
    organization: "Transcenlutions · Botanicals (working collection name)",
    introduction: "A proposed culinary-herb and botanical line. Organic, ingredient, safety, intended-use and supplier claims must be verified product by product.",
    products: [
      { id: "herb-culinary", title: "Certified-organic culinary herb collection", summary: "Dried seasoning herbs in supplier-sealed, traceable food-safe packaging; organic claim unverified.", fulfillment: "verified-dropship", risk: ["organic-claim", "food"] },
      { id: "herb-garden", title: "Kitchen herb growing kit", summary: "A grow-at-home culinary herb gift, with seed, plant-health and package requirements reviewed before listing.", fulfillment: "verified-dropship", risk: ["organic-claim"] },
      { id: "botanical-aroma", title: "Botanical essential-oil fragrance collection", summary: "Non-therapeutic fragrance positioning; ingredient, skin-contact, shipping and hazard requirements depend on intended use.", fulfillment: "verified-dropship", risk: ["organic-claim", "essential-oil"] },
    ],
  },
  {
    id: "gaming",
    title: "Gaming Gear",
    organization: "Transcenlutions · Gaming",
    introduction: "Begin with original non-electronic accessories; hold electronic and wireless gear until regulatory and supplier evidence exists.",
    products: [
      { id: "gaming-mat", title: "Transcenlutions gaming desk mat", summary: "Original branded desk mat for gamers and creators.", fulfillment: "print-on-demand", risk: ["original-ip"] },
      { id: "gaming-controller-stand", title: "Gaming controller stand", summary: "Branded physical accessory, with fit, durability and materials checks.", fulfillment: "verified-dropship", risk: ["original-ip"] },
      { id: "gaming-electronics", title: "Gaming headset or keyboard", summary: "Future electronic hardware; verify applicable FCC, electrical, battery and importer requirements.", fulfillment: "verified-dropship", risk: ["electronics", "original-ip"] },
    ],
  },
  {
    id: "childrens",
    title: "Children's Gear & Toys",
    organization: "Transcenlutions · Children's Media & Learning",
    introduction: "Children-first products that prioritize safety, independent testing, age appropriateness and learning value.",
    products: [
      { id: "kids-learning-book", title: "Children's moral-learning storybook", summary: "Age-appropriate illustrated stories and living, practical lessons.", fulfillment: "print-on-demand", risk: ["original-ip", "child-product"] },
      { id: "kids-backpack", title: "Children's adventure backpack", summary: "Original design; supplier materials, decoration, closures and children's product requirements must be checked.", fulfillment: "verified-dropship", risk: ["child-product", "original-ip"] },
      { id: "kids-toy", title: "Educational puzzle and toy collection", summary: "Age-graded toys manufactured and certified for the selected market.", fulfillment: "custom-manufacturing", risk: ["child-product", "toy", "original-ip"] },
    ],
  },
  {
    id: "transcenlutions",
    title: "Transcenlutions Merch",
    organization: "Transcenlutions · Parent Brand",
    introduction: "Company merchandise that supports the wider Transcenlutions platform and creator community.",
    products: [
      { id: "transcen-apparel", title: "Transcenlutions signature apparel", summary: "Royal-blue, purple, black and gold official branding on adult apparel.", fulfillment: "print-on-demand", risk: ["original-ip"] },
      { id: "transcen-creator-gear", title: "Creator's desk collection", summary: "Mugs, notebooks and workspace accessories with approved logo treatment.", fulfillment: "print-on-demand", risk: ["original-ip"] },
    ],
  },
  {
    id: "hallway-cleaning",
    title: "Hallway Cleaning Business Gear",
    organization: "Hallway Cleaning · Professional Cleaning Services",
    introduction: "Service crew and professional client materials, never messaging that narrows the company to hallway cleaning.",
    products: [
      { id: "cleaning-crew-kit", title: "Professional crew apparel", summary: "Work shirts, hats and nonchemical equipment-organizer accessories for commercial crews.", fulfillment: "print-on-demand", risk: ["original-ip"] },
      { id: "cleaning-client-kit", title: "Commercial client welcome kit", summary: "A branded operations folder, printed maintenance guide and service materials.", fulfillment: "print-on-demand", risk: ["original-ip"] },
    ],
  },
  {
    id: "one-flesh",
    title: "One Flesh Gifts",
    organization: "Transcenlutions · One Flesh",
    introduction: "Thoughtful adult relationship and family-alignment products consistent with the existing One Flesh purpose.",
    products: [
      { id: "one-flesh-journal", title: "Intentional-courtship journal", summary: "Original reflection, accountability and relationship discussion prompts.", fulfillment: "print-on-demand", risk: ["original-ip"] },
      { id: "one-flesh-gift", title: "Family conversation gift set", summary: "Physical cards or print materials designed for adult guidance and discussion.", fulfillment: "custom-manufacturing", risk: ["original-ip"] },
    ],
  },
];

export interface FoundryProvider {
  id: string;
  name: string;
  purpose: string;
  documentation: string;
  status: "not_connected";
}

export const foundryProviders: readonly FoundryProvider[] = [
  { id: "dough", name: "Dough", purpose: "AI product concepts, possible catalog/custom manufacturing, supplier coordination and pre-order storefronts.", documentation: "https://www.dough.do/how-it-works", status: "not_connected" },
  { id: "printful", name: "Printful", purpose: "Print-on-demand apparel, merchandise, product sync and fulfillment via an authenticated API.", documentation: "https://developers.printful.com/docs/", status: "not_connected" },
  { id: "lulu", name: "Lulu Print API", purpose: "Print-on-demand books and journals, print files, quotes and fulfillment.", documentation: "https://developers.lulu.com/", status: "not_connected" },
  { id: "botanical-supplier", name: "Botanical supplier (to verify)", purpose: "Food-grade herbs and intended-use appropriate essential oils with batch, labeling and certification evidence.", documentation: "", status: "not_connected" },
  { id: "toy-supplier", name: "Certified toy supplier (to verify)", purpose: "Age-graded toy production with relevant testing, Children's Product Certificates and tracking labels.", documentation: "https://www.cpsc.gov/Business--Manufacturing/Business-Education/Toy-Safety", status: "not_connected" },
];

const requirementsByRisk: Record<FoundryRisk, readonly string[]> = {
  "original-ip": [
    "Confirm ownership or licensed commercial use of each character, logo, reference image and design.",
    "Use the approved original Crowne Legacy and Rooted Light canon where relevant; no copied characters or generated lookalikes.",
  ],
  "organic-claim": [
    "Verify applicable USDA organic certification and chain-of-custody documents for the exact finished product and supplier.",
    "Review and approve every organic claim, seal, production and packaging statement before advertising.",
  ],
  food: [
    "Verify food-safe supplier, ingredient identity, lot traceability, handling and shelf-life controls.",
    "Review FDA and applicable state food business, import, ingredient, allergen and package-label rules.",
    "Keep culinary herbs separate from dietary supplements and medicinal products; no unsubstantiated health claims.",
  ],
  "essential-oil": [
    "Determine intended use (fragrance, cosmetic, household use, or regulated therapeutic claim) before choosing the legal route.",
    "Verify ingredient identity, purity/quality evidence, package suitability, hazard warnings, safe handling, supplier insurance and shipping restrictions.",
    "No therapeutic claims, ingestion instructions, child-use promises or claims of universal safety without specific authorization and evidence.",
  ],
  "child-product": [
    "Document intended age range, materials, physical hazards, and manufacturer/importer of record.",
    "Obtain and evaluate product-specific applicable safety evidence, labels and traceability; decorations can change a product's classification.",
  ],
  toy: [
    "Determine applicable ASTM F963 and CPSIA requirements; where required, obtain CPSC-accepted lab tests and Children's Product Certificate.",
    "Check small parts, coatings, lead, phthalates, choking warnings, age grading and tracking labels for the exact toy.",
  ],
  electronics: [
    "Verify product-specific FCC obligations, electrical safety, battery, import, labeling and shipping compliance before advertising or sale.",
    "Do not infer certified hardware from generic dropship listings; keep electronic products off the live catalog until verified.",
  ],
};

export const sharedFoundryRequirements: readonly string[] = [
  "Validate customer demand and original product usefulness; do not invent buyers or forecasts.",
  "Compare supplier quotations and minimums, sample quality, delivery locations and lead times.",
  "Document full costs and suitable contribution margin before setting a launch price.",
  "Review customer support, privacy, returns, delivery terms, tax and geographic fulfillment duties.",
  "Verify owner authority and external provider account access; use scoped server-side credentials only.",
  "Release supplier orders only after verified paid events, duplicate-safe order routing and explicit owner authorization.",
];

export function productRequirements(product: FoundryProduct): readonly string[] {
  return [...sharedFoundryRequirements, ...product.risk.flatMap((risk) => requirementsByRisk[risk])];
}

export function findFoundryProduct(id: string): FoundryProduct | undefined {
  return foundryLines.flatMap((line) => line.products).find((product) => product.id === id);
}

export interface FoundryEconomicsInput {
  retail: number | null;
  manufacturing: number | null;
  shipping: number | null;
  packaging: number | null;
  duties: number | null;
  paymentFees: number | null;
  platformPercent: number | null;
  marketing: number | null;
  returnsReserve: number | null;
  monthlyOverhead: number | null;
}

export interface FoundryEconomicsResult {
  complete: boolean;
  missing: string[];
  contribution: number | null;
  contributionMargin: number | null;
  monthlyBreakEvenUnits: number | null;
}

const economicsFields: readonly [keyof FoundryEconomicsInput, string][] = [
  ["retail", "Retail price"], ["manufacturing", "Manufacturing cost"],
  ["shipping", "Shipping cost"], ["packaging", "Packaging cost"],
  ["duties", "Import duties/tariffs"], ["paymentFees", "Payment processing fees"],
  ["platformPercent", "Platform fee percent"], ["marketing", "Marketing cost per order"],
  ["returnsReserve", "Returns/chargeback reserve"], ["monthlyOverhead", "Monthly overhead"],
];

export function calculateFoundryEconomics(input: FoundryEconomicsInput): FoundryEconomicsResult {
  const missing = economicsFields
    .filter(([key]) => typeof input[key] !== "number" || !Number.isFinite(input[key]) || (input[key] as number) < 0)
    .map(([, label]) => label);
  if (input.retail !== null && input.retail <= 0 && !missing.includes("Retail price")) missing.push("Retail price");
  if (input.platformPercent !== null && input.platformPercent > 100 && !missing.includes("Platform fee percent")) missing.push("Platform fee percent");
  if (missing.length) {
    return { complete: false, missing, contribution: null, contributionMargin: null, monthlyBreakEvenUnits: null };
  }
  const retail = input.retail as number;
  const contribution = retail
    - (input.manufacturing as number) - (input.shipping as number)
    - (input.packaging as number) - (input.duties as number)
    - (input.paymentFees as number) - (retail * (input.platformPercent as number) / 100)
    - (input.marketing as number) - (input.returnsReserve as number);
  return {
    complete: true,
    missing: [],
    contribution: Math.round(contribution * 100) / 100,
    contributionMargin: Math.round(contribution / retail * 10000) / 100,
    monthlyBreakEvenUnits: contribution > 0 ? Math.ceil((input.monthlyOverhead as number) / contribution) : null,
  };
}

export function createFoundryPrompt(line: FoundryLine, product: FoundryProduct, note = ""): string {
  const cleanNote = note.trim().slice(0, 600);
  const rules = productRequirements(product).map((item, index) => `${index + 1}. ${item}`).join("\n");
  return [
    "TAY — TRANSCENLUTIONS PRODUCT FOUNDRY / GOVERNED ZERO-INVENTORY PRODUCT BUILD",
    `Business line: ${line.title} (${line.organization}).`,
    `Product concept: ${product.title}.`,
    `Purpose: ${product.summary}`,
    `Preferred fulfillment model to assess: ${product.fulfillment}.`,
    cleanNote ? `My additional idea: ${cleanNote}` : "",
    "Use existing authorized Transcenlutions assets and canon; inspect previous work before starting new artwork.",
    "Research real purchase demand and compare at least two feasible suppliers; verify whether a supplier actually supports this exact product and destination.",
    "Create an original product spec, appropriate visuals or print requirements, estimated supply chain, and a buyer-ready but UNPUBLISHED offer draft.",
    "Include a supplier cost worksheet; leave every unsourced value UNKNOWN, not $0. Prove contribution economics before recommending a sell price.",
    "Follow these product-specific release and customer-safety gates:",
    rules,
    "Start with no-cost reversible research and concept work. Do not create paid accounts, promise shipments, activate checkout, collect preorders, publish health/organic/safety claims, issue purchase orders or spend money without required authority and verified provider readiness.",
    "Record the plan and artifacts for Tay and authorized agents; return exact COMPLETED, UNVERIFIED, BLOCKED and OWNER ACTION REQUIRED items.",
  ].filter(Boolean).join("\n\n");
}

export const productFoundryLiveExecutionEnabled = false as const;
