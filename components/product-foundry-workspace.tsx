"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, Clipboard, Coins, ExternalLink,
  Factory, Leaf, LockKeyhole, Package, ShieldCheck, Sparkles,
} from "lucide-react";
import {
  calculateFoundryEconomics, createFoundryPrompt, foundryLines,
  foundryProviders, productRequirements, type FoundryEconomicsInput,
  type FoundryLineId,
} from "../lib/product-foundry";
import { foundryWorkflow } from "../lib/product-foundry-adapters";

const emptyEconomics: FoundryEconomicsInput = {
  retail: null, manufacturing: null, shipping: null, packaging: null,
  duties: null, paymentFees: null, platformPercent: null,
  marketing: null, returnsReserve: null, monthlyOverhead: null,
};

const fields: { key: keyof FoundryEconomicsInput; label: string; hint?: string }[] = [
  { key: "retail", label: "Retail price" },
  { key: "manufacturing", label: "Manufacturing cost" },
  { key: "shipping", label: "Shipping to buyer" },
  { key: "packaging", label: "Packaging" },
  { key: "duties", label: "Tariffs / import costs" },
  { key: "paymentFees", label: "Payment processing fee" },
  { key: "platformPercent", label: "Platform percentage", hint: "%" },
  { key: "marketing", label: "Marketing per order" },
  { key: "returnsReserve", label: "Returns / chargebacks reserve" },
  { key: "monthlyOverhead", label: "Monthly overhead", hint: "fixed" },
];

const riskLabels: Record<string, string> = {
  "original-ip": "Artwork & rights",
  "organic-claim": "Organic claims",
  food: "Food safety",
  "essential-oil": "Essential-oil safety",
  "child-product": "Children's product",
  toy: "Toy certification",
  electronics: "Electronic equipment",
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

function asOptionalNumber(value: string) {
  return value.trim() === "" ? null : Number(value);
}

export function ProductFoundryWorkspace() {
  const [lineId, setLineId] = useState<FoundryLineId>("rooted-light");
  const line = foundryLines.find((candidate) => candidate.id === lineId) ?? foundryLines[0];
  const [productId, setProductId] = useState("rooted-legacy-journal");
  const product = line.products.find((item) => item.id === productId) ?? line.products[0];
  const [idea, setIdea] = useState("");
  const [economics, setEconomics] = useState<FoundryEconomicsInput>(emptyEconomics);
  const [copyState, setCopyState] = useState("");
  const [handoffError, setHandoffError] = useState("");
  const requirements = useMemo(() => productRequirements(product), [product]);
  const quote = calculateFoundryEconomics(economics);
  const prompt = useMemo(() => createFoundryPrompt(line, product, idea), [line, product, idea]);

  function selectLine(next: FoundryLineId) {
    const candidate = foundryLines.find((item) => item.id === next);
    if (!candidate) return;
    setLineId(next);
    setProductId(candidate.products[0].id);
    setIdea("");
    setCopyState("");
    setEconomics(emptyEconomics);
  }

  async function copyPrompt() {
    setCopyState("");
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("Tay command copied. Paste it into any authorized Tay conversation.");
    } catch {
      setCopyState("Copy unavailable here. Select and copy the full command from the text box below.");
    }
  }

  function handoffToTay() {
    setHandoffError("");
    try {
      sessionStorage.setItem("tay:foundry:draft:v1", prompt);
      window.location.assign("/");
    } catch {
      setHandoffError("Unable to pass the draft to Tay automatically. Use Copy command instead.");
    }
  }

  return (
    <div className="pf-shell">
      <header className="pf-topbar">
        <a className="pf-back" href="/"><ArrowLeft size={17} aria-hidden="true" /> Tay Command</a>
        <span className="pf-identity">TRANSCENLUTIONS <span>/</span> PRODUCT FOUNDRY</span>
        <span className="pf-state"><LockKeyhole size={14} aria-hidden="true" /> Planning only</span>
      </header>

      <main className="pf-main">
        <section className="pf-hero" aria-labelledby="foundry-title">
          <div className="pf-hero-copy">
            <p className="pf-eyebrow"><Sparkles size={17} aria-hidden="true" /> TAY PRODUCT FOUNDRY</p>
            <h1 id="foundry-title">From idea to <em>real product.</em></h1>
            <p>Build original products for every Transcenlutions business. Tay can prepare demand research, supplier comparisons, product specifications and truthful offers before money is committed.</p>
            <div className="pf-hero-flags">
              <span><Check size={16} aria-hidden="true" /> No inventory required for eligible products</span>
              <span><ShieldCheck size={16} aria-hidden="true" /> Governed costs & safety</span>
              <span><Factory size={16} aria-hidden="true" /> Swappable suppliers</span>
            </div>
          </div>
          <div className="pf-hero-art" aria-hidden="true">
            <span className="pf-hero-ring pf-hero-ring--outer" />
            <span className="pf-hero-ring pf-hero-ring--inner" />
            <div className="pf-hero-crest"><span>T</span><small>FOUNDRY</small></div>
            <span className="pf-orbit pf-orbit--a"><Leaf size={20} /></span>
            <span className="pf-orbit pf-orbit--b"><Package size={20} /></span>
            <span className="pf-orbit pf-orbit--c"><Factory size={20} /></span>
          </div>
        </section>

        <section className="pf-workspace" aria-labelledby="collection-heading">
          <div className="pf-section-head">
            <div><p className="pf-eyebrow">01 / COLLECTIONS</p><h2 id="collection-heading">Choose the business</h2></div>
            <p>One shared system. Separate brands, customers and legal requirements.</p>
          </div>
          <div className="pf-tabs" role="group" aria-label="Product business">
            {foundryLines.map((candidate) => (
              <button key={candidate.id} type="button" aria-pressed={line.id === candidate.id}
                className={`pf-tab ${line.id === candidate.id ? "pf-tab--active" : ""}`}
                onClick={() => selectLine(candidate.id)}>{candidate.title}</button>
            ))}
          </div>

          <div className="pf-work-grid">
            <div className="pf-panel">
              <div className="pf-panel-heading">
                <p className="pf-eyebrow">BRAND / {line.organization.toUpperCase()}</p>
                <h3>{line.title}</h3>
                <p>{line.introduction}</p>
              </div>
              <div className="pf-products" role="group" aria-label="Product concepts">
                {line.products.map((candidate, index) => (
                  <button type="button" key={candidate.id} aria-pressed={product.id === candidate.id}
                    className={`pf-product ${product.id === candidate.id ? "pf-product--selected" : ""}`}
                    onClick={() => { setProductId(candidate.id); setIdea(""); setCopyState(""); setEconomics(emptyEconomics); }}>
                    <span className="pf-product-number">{String(index + 1).padStart(2, "0")}</span>
                    <span><strong>{candidate.title}</strong><small>{candidate.summary}</small></span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pf-panel pf-detail">
              <div className="pf-panel-heading">
                <p className="pf-eyebrow">02 / PRODUCT BRIEF</p>
                <h3>{product.title}</h3>
                <p>{product.summary}</p>
              </div>
              <dl className="pf-facts">
                <div><dt>Fulfillment to assess</dt><dd>{product.fulfillment.replaceAll("-", " ")}</dd></div>
                <div><dt>Release stage</dt><dd>Concept · not for sale</dd></div>
              </dl>
              <div className="pf-risk-labels">
                {product.risk.map((risk) => <span key={risk}>{riskLabels[risk]}</span>)}
              </div>

              <label className="pf-note-label" htmlFor="foundry-idea">Personalize this product idea</label>
              <textarea id="foundry-idea" value={idea} maxLength={600} rows={3}
                onChange={(event) => setIdea(event.target.value)}
                placeholder="Describe your original design, preferred materials, target customer, or product variation." />
              <div className="pf-button-row">
                <button type="button" className="pf-primary" onClick={handoffToTay}>
                  Prepare in Tay <ArrowRight size={17} aria-hidden="true" />
                </button>
                <button type="button" className="pf-secondary" onClick={copyPrompt}>
                  <Clipboard size={17} aria-hidden="true" /> Copy command
                </button>
              </div>
              {copyState ? <p className="pf-response" role="status">{copyState}</p> : null}
              {handoffError ? <p className="pf-error" role="alert">{handoffError}</p> : null}
              <p className="pf-footnote">“Prepare in Tay” loads an editable draft. It does not publish a listing or contact a supplier.</p>
              <details className="pf-details">
                <summary>See the full Tay command</summary>
                <textarea aria-label="Generated Tay Product Foundry command" rows={12} value={prompt} readOnly onFocus={(event) => event.target.select()} />
              </details>
            </div>
          </div>
        </section>

        <section className="pf-compliance" aria-labelledby="safety-heading">
          <div className="pf-section-head">
            <div><p className="pf-eyebrow">03 / RELEASE PROTECTION</p><h2 id="safety-heading">What must be verified</h2></div>
            <p>These are requirements to investigate, not certifications already earned.</p>
          </div>
          <div className="pf-checks">
            {requirements.map((requirement, index) => (
              <div className="pf-check" key={requirement}>
                <span>{String(index + 1).padStart(2, "0")}</span><p>{requirement}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pf-economics" aria-labelledby="cost-heading">
          <div className="pf-section-head">
            <div><p className="pf-eyebrow">04 / MONEY CONTROL</p><h2 id="cost-heading">Real unit economics</h2></div>
            <p>Leave unknown amounts blank. Tay must not quietly treat missing expenses as zero.</p>
          </div>
          <div className="pf-economics-grid">
            <div className="pf-panel">
              <div className="pf-fields">
                {fields.map((field) => (
                  <label key={field.key}>
                    <span>{field.label}</span>
                    <div className="pf-number-wrap">
                      <span>{field.hint === "%" ? "%" : field.hint === "fixed" ? "mo." : "$"}</span>
                      <input type="number" inputMode="decimal" min={0} step="0.01"
                        aria-label={field.label}
                        placeholder="Unknown"
                        value={economics[field.key] ?? ""}
                        onChange={(event) => setEconomics((current) => ({
                          ...current, [field.key]: asOptionalNumber(event.target.value),
                        }))} />
                    </div>
                  </label>
                ))}
              </div>
              <button className="pf-link-button" type="button" onClick={() => setEconomics(emptyEconomics)}>Clear estimates</button>
            </div>
            <div className="pf-panel pf-profit">
              <Coins size={26} aria-hidden="true" />
              <p className="pf-eyebrow">CONTRIBUTION PER ORDER</p>
              <strong className="pf-profit-amount">{quote.complete ? formatMoney(quote.contribution ?? 0) : "Unknown"}</strong>
              <p>{quote.complete ? `${quote.contributionMargin}% contribution margin before income taxes and additional unmodeled costs.` : `${quote.missing.length} required inputs are missing or invalid. No profit claim can be made.`}</p>
              <div className="pf-profit-divider" />
              <div className="pf-profit-metric"><span>Monthly break-even units</span><strong>{quote.complete ? (quote.monthlyBreakEvenUnits ?? "Not attainable") : "Unknown"}</strong></div>
              <p className="pf-footnote">A planning calculator, not a supplier quote or accounting system. Negative contribution is not a viable launch.</p>
            </div>
          </div>
        </section>

        <section className="pf-providers" aria-labelledby="provider-heading">
          <div className="pf-section-head">
            <div><p className="pf-eyebrow">05 / INTEGRATION PIPELINE</p><h2 id="provider-heading">Supplier and fulfillment tools</h2></div>
            <p>Provider-neutral adapters will connect to Tay only after authenticated permissions and tests.</p>
          </div>
          <div className="pf-provider-grid">
            {foundryProviders.map((provider) => (
              <article className="pf-provider" key={provider.id}>
                <div className="pf-provider-top"><Factory size={20} aria-hidden="true" /><span>Not connected</span></div>
                <h3>{provider.name}</h3>
                <p>{provider.purpose}</p>
                {provider.documentation ? (
                  <a href={provider.documentation} target="_blank" rel="noopener noreferrer">
                    Documentation <ExternalLink size={14} aria-hidden="true" />
                  </a>
                ) : <span className="pf-provider-unknown">Supplier shortlist needed</span>}
              </article>
            ))}
          </div>
          <details className="pf-workflow">
            <summary>See the complete idea-to-delivery workflow</summary>
            <ol>
              {foundryWorkflow.map((step, index) => (
                <li key={step.stage}>
                  <span className="pf-workflow-index">{String(index + 1).padStart(2, "0")}</span>
                  <div><strong>{step.stage.replaceAll("-", " ")}</strong><p>{step.reason}</p></div>
                  <small>{step.status.replaceAll("_", " ")}</small>
                </li>
              ))}
            </ol>
          </details>
          <p className="pf-final-note"><LockKeyhole size={18} aria-hidden="true" /> Live product publication, payment collection and supplier ordering remain disabled until server-verified owner authority, provider integrations, compliance evidence, fulfillment tests and approval are in place.</p>
        </section>
      </main>
    </div>
  );
}
