# Tay Product Foundry — Multi-Brand Dropship and Manufacturing Foundation

**Status (2026-10-24):** Feature branch, not released. Catalog, guided prompt builder, estimated-cost calculator and a provider-neutral connector contract are implemented. **No external suppliers are connected. No product is approved, published, sold, manufactured or shipped.** Existing Tay and Transcenlutions canon, business priorities and authority boundaries remain in force.

## Goal

Build one Transcenlutions-owned, vendor-independent physical commerce workflow with branded collections for each authorized existing business. Treat Dough's product-design → supplier → storefront → orders → fulfillment concept as a *workflow reference*, not proof that the provider has an accessible API, no fees, acceptable legal terms, or an appropriate factory for every product.

The existing Tay Command remains the orchestrator. The Product Foundry is a business module at `/product-foundry`, not a second agent, new payment account, or separate business organization.

## Product collections (concepts only)

- **Crowne Legacy:** original canon-respecting adult apparel, gaming desk mats, collectibles and plush. Use only owned/licensed assets. Preserve named character identities and preexisting visual continuity; invent no substitute official characters.
- **Rooted Light:** first draft `The Light You Leave — A Family Legacy Journal`, original illustrated storybooks, learning cards and gifts.
- **Transcenlutions Botanicals (working name):** organic culinary herb collection, kitchen herb-growing kit, essential-oil fragrances. "Organic" is a category goal; no finished product is claimed certified.
- **Transcenlutions Gaming:** custom adult gaming mats and stands first, with wireless/audio hardware withheld for regulatory diligence.
- **Children's media & learning:** books and age-appropriate toys, puzzles, plush, backpacks and activity kits with separate design-and-testing gates.
- **Parent Transcenlutions:** company merchandise and creator accessories.
- **Hallway Cleaning:** professional cleaning crew apparel and enterprise client materials. Do not reposition the company as primarily hallway cleaning.
- **One Flesh:** thoughtful guided adult courtship and family-alignment journals and gifts. Preserve existing platform scope and values.

Add other existing registered Transcenlutions divisions using the same branded-collection contract; no duplicated payment systems or customer-data silos.

## Current repository implementation

- `lib/product-foundry.ts` — product/line catalog, per-risk launch requirements, prompt builder and margin calculations.
- `lib/product-foundry-adapters.ts` — server-side supplier provider contract and safe always-unconnected scaffold.
- `components/product-foundry-workspace.tsx` — accessible product selection, no-cost concept handoff, editable product idea, exact caveat and margin inputs.
- `app/product-foundry/page.tsx` with `foundry.css` — branded responsive Tay-compatible interface.
- Tay sidebar link — route from the existing workspace.
- Session-only draft handoff to Tay — does not run instructions, call APIs or publish anything.
- `scripts/test-product-foundry.cjs` — regression tests for completeness, safety, prompt guardrails, connector disabled state and costs.

## Supplier gateway architecture

The provider-neutral `FoundrySupplierAdapter` defines capabilities for catalog/quotes, sample preparation, unpublished listing drafts, owner-authorized and paid-event-verified fulfillment, and tracking. It must be implemented in the existing server-side Integration Gateway and Operating Graph, **not** in the client UI.

Proposed adapters to evaluate:

1. **Printful:** apparel, print-on-demand merchandise, some accessories. Verify exact product supports intended age, artwork, material, shipping destination, fees, insurance and returns. Docs: https://developers.printful.com/docs/
2. **Lulu Print API:** books/journals. Request print quality, page-count, trim, proof and delivery quotes. Docs: https://developers.lulu.com/
3. **Dough:** AI-assisted product concept and manufacturer/storefront workflows. Independently verify current public API/MCP toolset, usage terms, data ownership, licensing, commission, subscriptions and who owns customer/order records. Website: https://www.dough.do/
4. **Certified botanical supplier:** not selected. Require organic certificate scope and validity (where claimed), food or cosmetic manufacturing credentials applicable to the product, batch identity, labeling, recall/return process, shelf life, insurance, and shipping restrictions.
5. **Toy manufacturer or distributor:** not selected. Require product-specific safety test reports, CPC or applicable exemption, age grading, material and design compliance, import responsibility, shipping and injury/recall escalation.
6. **Electronic gaming supplier:** not selected. Require documented equipment authorization, battery/electrical and radio compliance, imports, warranties, manufacturer support and truthful specification matching.

Start with provider-free research, product concepts and a non-paid interest list. Provider connection, subscription, upfront sample payment, public offers, price commitments, paid pre-orders, supplier orders, advertising and returns require the appropriate authenticated approval and economic checks.

## Product-specific launch gates

### Organic herbs

Use the intended-use classification first: culinary food, seed/growing supply, cosmetic ingredient, or dietary supplement. Do not apply one rule to all herbs. For U.S. culinary food, review FDA food packaging, sanitation, traceability, allergens, import and labeling duties as applicable. Any "organic" promise or seal requires **exact-product and handler** evidence under USDA NOP terms; a generic supplier assertion is insufficient. Seek no medical or preventive-health claim.

References:
- https://www.ams.usda.gov/rules-regulations/organic/labeling
- https://www.ams.usda.gov/services/organic-certification/international-trade/labeling-requirements-US-organic-market
- https://www.fda.gov/food/food-labeling-nutrition

### Essential oils

Determine intended use from packaging and all marketing copy, not just the ingredient list. For fragrances, cosmetics, food flavors or drug-like therapeutic claims, different FDA and other regulations may apply. Research actual purity/identity and safety documentation, SDS when appropriate, child/pet exposure risks and carrier/skin warnings, hazardous-material or flammable shipping restrictions, packaging, product liability and quality controls. **Do not** create claims that the oils cure illness, improve sleep, treat pain/anxiety, can be ingested, are safe for all people or suitable for children.

Reference: https://www.fda.gov/cosmetics/cosmetic-products/aromatherapy

### Children's products and toys

Determine intended age and which specific standards apply. U.S. children's toys intended primarily for ages 12 and under generally need CPSC-accepted third-party testing and a Children's Product Certificate (CPC), plus relevant ASTM F963-23, small-parts, lead, phthalate, labeling and tracking obligations. Specific exemptions must be verified, not assumed. On and after July 8, 2026, many imported regulated products also have CPSC certificate eFiling obligations. Do not publish until document ownership, certifications and importer responsibility are verified.

References:
- https://www.cpsc.gov/Business--Manufacturing/Business-Education/Toy-Safety
- https://www.cpsc.gov/Business--Manufacturing/Testing-Certification/Childrens-Product-Certificate

### Gaming electronics

Start with non-electronic accessories. For wireless headsets, keyboards and controllers, investigate applicable FCC equipment authorization and evidence before offering a U.S. product; check electrical/battery regulations and shipping separately.

Reference: https://docs.fcc.gov/public/attachments/DA-19-91A1.pdf

### IP and character merchandise

Before supplier artwork upload, verify that the source assets are legitimate originals or commercially licensed, with approved character names, logos, appearance and export rights. This includes generative model output rights and third-party supplier print rights. Do not use unrelated logos or copy screenshots of other brands' hats, toys or storefronts.

## Commerce and data ownership requirements

- Use the existing company Stripe business account only where authorized. Store payment metadata server-side; never accept payment-card details in the Tay or Foundry client.
- Suppliers receive only the customer fulfillment data required for accepted orders, after suitable customer consent and a privacy review.
- A **signed, confirmed paid event** and durable, duplicate-safe ledger record must precede supplier submission. Authorization via a browser boolean, AI text, an email or a user-entered order ID is not sufficient.
- Record quote version/expiry, source URL, supplier, SKU, required quantity, geographic availability, price/currency, shipping, duties, taxes, platform fees, manufacturing lead time, packaging, refunds and customer-support responsibility.
- Treat unknown cost as unknown, **not $0**. Distinguish contribution margin, monthly overhead, gross sales, cash collected, refund liability and payout.
- Retain editable asset masters and exportable product files in company-controlled storage. Verify domain, code, artwork, account, data and payment-provider ownership before linking a third party.
- Follow existing Transcenlutions role and budget authority, protected approval flow and existing queue, rather than creating a second unrestricted agent.

## Revenue-first execution order

1. Preserve and advance existing qualified revenue and live purchase-to-delivery projects first; do not displace them for new product excitement.
2. Create original on-demand merch concepts and demand tests with no upfront inventory. A Crowne Legacy desk mat is promising **only once the actual character art and rights are available**; a Transcenlutions-branded gaming desk mat can be a lower-dependency first test.
3. Investigate certified herb suppliers and finished-label verification in parallel as research, but do not make organic claims until demonstrated.
4. Assess adult essential-oil fragrance suppliers under a correct intended-use classification before advertising.
5. Move toys and electronics after documented compliance and supplier traceability.

## Acceptance criteria for a future production release

- [ ] Existing Tay server authentication and founding-owner permissions are verified.
- [ ] Supplier credentials stored on server only; no `NEXT_PUBLIC_` secret variables.
- [ ] Current product-compatible catalog, quote, lead time and shipping are retrieved from a real authenticated vendor.
- [ ] Mockup/proof and product-specific safety, label and rights evidence reviewed.
- [ ] Confirmed margin after all variable costs, tax considerations and reserve assumptions; no invented cost entries.
- [ ] Draft-only product page is clearly separate from approved public sale.
- [ ] Signed test payment → unique order → supplier fulfillment → shipment notification → delivery → reconciliation is validated in a provider sandbox without live charges.
- [ ] Retry/idempotency, cancellations, refunds, errors and out-of-stock conditions are tested.
- [ ] Required owner launch/spend/legal approvals are recorded server-side.
- [ ] Preview, security/CI checks and deployment QA pass before any controlled main merge.
- [ ] Post-merge deployed build commit, order status and revenue event evidence are recorded.

**Never report an imagined merchant connection, a successful transaction, a certified product or a completed supplier shipment without provider evidence.**
