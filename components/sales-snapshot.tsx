"use client";

import { useEffect, useId, useRef, useState } from "react";
import { emptySalesSnapshot, formatSalesMoney, parseSalesSnapshot, SALES_SNAPSHOT_MAX_BYTES, summarizeSalesSnapshot, type SalesSnapshot as Snapshot } from "../lib/sales-snapshot";
import styles from "./sales-snapshot.module.css";

function dateLabel(value: string) { return value.replace("T", " ").replace(/(?:\.\d{3})?Z$/, " UTC"); }
function download(snapshot: Snapshot, filename: string) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename;
  document.body.append(link);
  try { link.click(); } finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

/** Mount within the existing Sales panel. No network, storage, auth or payment capability. */
export function SalesSnapshot() {
  const id = useId();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const importVersion = useRef(0);
  useEffect(() => () => { importVersion.current++; }, []);
  const totals = snapshot ? summarizeSalesSnapshot(snapshot) : null;
  const search = query.trim().toLocaleLowerCase();
  const matches = (values: string[]) => !search || values.join(" ").toLocaleLowerCase().includes(search);
  const deals = totals?.openDeals.filter(deal => matches([deal.name, deal.stage, deal.sourceRef])) ?? [];
  const leads = totals?.recentLeads.filter(lead => matches([lead.name, lead.company, lead.stage, lead.sourceRef])) ?? [];

  async function load(file: File) {
    const version = ++importVersion.current;
    setLoading(true); setError(""); setNotice(""); setConfirmClear(false);
    try {
      if (file.size > SALES_SNAPSHOT_MAX_BYTES) throw new Error("File exceeds the 1 MB limit.");
      const result = parseSalesSnapshot(await file.text());
      if (version !== importVersion.current) return;
      if (!result.ok) throw new Error(result.error);
      setSnapshot(result.snapshot); setLoadedAt(new Date().toISOString()); setQuery("");
      setNotice("Snapshot loaded in this panel only. Its claims have not been independently verified.");
    } catch (cause) {
      if (version === importVersion.current) setError(`${cause instanceof Error ? cause.message : "Unable to read file."} The current view has not changed.`);
    } finally { if (version === importVersion.current) setLoading(false); }
  }
  function save(value: Snapshot, filename: string) {
    try { download(value, filename); setError(""); setNotice("Download requested. Check your browser downloads and keep the file somewhere private."); }
    catch { setError("The download could not start. Your current view is still available."); }
  }
  function clear() {
    importVersion.current++; setLoading(false); setSnapshot(null); setLoadedAt(null); setQuery(""); setError(""); setConfirmClear(false);
    setNotice("This panel has been cleared. Your original file has not changed.");
    inputRef.current?.focus();
  }

  return (
    <section className={styles.root} aria-labelledby={`${id}-title`}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Transcenlutions · Sales</p>
        <h2 id={`${id}-title`}>Agency sales snapshot</h2>
        <p>Money received, active deals and recent leads in one place.</p>
        <span className={styles.badge}>{snapshot ? "Imported snapshot · not independently verified" : "No data connected"}</span>
      </header>
      <p className={styles.privacy}>Local view only. Imports stay in this panel’s memory; nothing is uploaded or automatically saved. Closing this panel or reloading clears it. Export before leaving; keep customer records out of public GitHub repositories.</p>
      <div className={styles.controls}>
        <label htmlFor={`${id}-file`}>Load local JSON (up to 1 MB)</label>
        <input ref={inputRef} id={`${id}-file`} type="file" accept=".json,application/json" aria-describedby={`${id}-import-help`} onChange={event => {
          const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
          if (file) void load(file);
        }} />
        <p id={`${id}-import-help`}>A valid file replaces the current view. Totals cover only the records in that file, in USD. An empty file is not proof of zero business revenue.</p>
        <div className={styles.actions}>
          <button type="button" onClick={() => save(emptySalesSnapshot(), "sales-snapshot-empty-template.json")}>Get empty template</button>
          <button type="button" disabled={!snapshot || loading} onClick={() => snapshot && save(snapshot, "sales-snapshot-export.json")}>Export current snapshot</button>
          <button ref={clearRef} type="button" disabled={!snapshot && !loading} onClick={() => setConfirmClear(true)}>Clear view</button>
        </div>
      </div>
      {confirmClear && <div className={styles.confirm} role="group" aria-label="Confirm clear view">
        <p>Clear the current view? Export first if you need another copy. Your original file stays unchanged.</p>
        <div className={styles.actions}>
          <button type="button" onClick={clear}>Yes, clear view</button>
          <button type="button" onClick={() => { setConfirmClear(false); clearRef.current?.focus(); }}>Keep snapshot</button>
        </div>
      </div>}
      <p className={styles.status} role="status" aria-live="polite">{loading ? "Reading local file…" : notice}</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {snapshot && <dl className={styles.source}>
        <div><dt>Reported source</dt><dd>{snapshot.source.name}</dd></div>
        <div><dt>Source exported</dt><dd><time dateTime={snapshot.source.exportedAt}>{dateLabel(snapshot.source.exportedAt)}</time></dd></div>
        {loadedAt && <div><dt>Loaded here</dt><dd><time dateTime={loadedAt}>{dateLabel(loadedAt)}</time></dd></div>}
        <div><dt>Coverage</dt><dd>{snapshot.payments.length} payments · {snapshot.deals.length} deals · {snapshot.leads.length} leads</dd></div>
      </dl>}
      <div className={styles.metrics} aria-label="Snapshot financial totals">
        {[
          ["Collected", totals?.collectedCents, "Reported receipts less reported refunds. Before fees and taxes; not profit."],
          ["Pending", totals?.pendingCents, "Awaiting payment. Not included in collected."],
          ["Open pipeline", totals?.pipelineCents, "Unweighted qualified, proposal and negotiation deals. Not cash received."],
        ].map(([label, value, detail]) => <article className={styles.metric} key={String(label)}>
          <h3>{label}</h3><strong>{typeof value === "number" ? formatSalesMoney(value) : "—"}</strong>
          <span>{snapshot ? "USD · imported" : "No source loaded"}</span><p>{detail}</p>
        </article>)}
      </div>
      <p className={styles.note}>These categories can refer to the same customer journey. Never add them together as revenue. Imported status labels and source references are assertions, not verified payment evidence.</p>
      <div className={styles.search}>
        <label htmlFor={`${id}-search`}>Find deals or leads</label>
        <input id={`${id}-search`} type="search" maxLength={160} placeholder="Name, company, stage or reference" value={query} disabled={!snapshot} onChange={event => setQuery(event.target.value)} />
        <p>Search filters the lists only; financial totals always cover the full snapshot.</p>
      </div>
      <section className={styles.listSection} aria-labelledby={`${id}-deals`}>
        <h3 id={`${id}-deals`}>Deals in progress {totals && <span>({totals.openDeals.length})</span>}</h3>
        <p className={styles.note}>Newest update first. Won and lost deals are excluded.</p>
        {deals.length ? <ul className={styles.records}>{deals.map(deal => <li key={deal.id}>
          <div className={styles.row}><strong>{deal.name}</strong><span className={styles.stage}>{deal.stage}</span></div>
          <p className={styles.amount}>{formatSalesMoney(deal.valueCents)} USD</p>
          <p>Updated <time dateTime={deal.updatedAt}>{dateLabel(deal.updatedAt)}</time></p>
          <p>Source: {deal.sourceRef}</p>
        </li>)}</ul> : <p className={styles.empty}>{!snapshot ? "Load a snapshot to see active deals." : search ? "No active deals match this search." : "No active deals in this snapshot."}</p>}
      </section>
      <section className={styles.listSection} aria-labelledby={`${id}-leads`}>
        <h3 id={`${id}-leads`}>Recent leads {snapshot && <span>({snapshot.leads.length})</span>}</h3>
        <p className={styles.note}>Newest created first. No contact or follow-up is sent here.</p>
        {leads.length ? <ul className={styles.records}>{leads.map(lead => <li key={lead.id}>
          <div className={styles.row}><strong>{lead.name}</strong><span className={styles.stage}>{lead.stage}</span></div>
          {lead.company && <p>{lead.company}</p>}
          <p>Created <time dateTime={lead.createdAt}>{dateLabel(lead.createdAt)}</time></p>
          <p>Source: {lead.sourceRef}</p>
        </li>)}</ul> : <p className={styles.empty}>{!snapshot ? "Load a snapshot to see recent leads." : search ? "No leads match this search." : "No leads in this snapshot."}</p>}
      </section>
      <details className={styles.help}><summary>Source, backup and connection limits</summary>
        <p>This is a portable, local reporting component. It is not connected to Floot, Stripe, a CRM or the shared financial ledger. Floot integration has not been tested.</p>
        <p>Source code can be restored from its GitHub commit. Imported data lives only in memory and is never included in a code backup. Exports are ordinary, unencrypted JSON files: keep them private and protected.</p>
        <p>Use one complete export per source snapshot, with unique payment IDs and source references. Collection amounts must exclude test payments. Provide refunds explicitly. This view does not reconcile bank settlements, fees, taxes, disputes or duplicated records across systems.</p>
      </details>
    </section>
  );
}
