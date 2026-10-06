import { basisPoints, cents, choice, date, ensure, list, nullable, parse, shape, sum, token, unique } from './validation';

const deductionKind = choice('sales_tax', 'payment_fee', 'store_fee');
const deduction = shape({ id: token, sourceItemRef: token, kind: deductionKind, cents });
const allocation = shape({
  id: token, productId: nullable(token), sourceId: nullable(token), grossCents: cents,
  deductions: list(deduction),
});
const collection = shape({
  transactionId: token, sourceReceiptRef: token, tenantId: token, currency: choice('USD'),
  status: choice('collected', 'projected'), collectedAt: date, grossCents: cents,
  allocationPolicyRef: token, allocations: list(allocation, 1),
});
const adjustment = shape({
  eventId: token, sourceEventRef: token, transactionId: token, allocationId: token, recordedAt: date,
  kind: choice('refund', 'chargeback'), principalOffsetCents: cents, principalCents: cents, taxReturnedCents: cents,
  feeReversals: list(shape({ deductionId: token, cents })),
});
const component = shape({ id: token, kind: choice('likeness', 'product_creation', 'combined'), basisPoints });
const schedule = shape({
  id: token, tenantId: token, participantId: token, productId: token, sourceId: token,
  status: choice('draft', 'executed', 'revoked'), revokedAt: nullable(date), agreementEvidenceRefs: list(token, 1),
  participantSignatureRef: token, entitySignatureRef: token,
  contributionEvidenceRefs: list(token), rightsEvidenceRefs: list(token, 1),
  startsAt: date, endsAt: date, currency: choice('USD'),
  deductionPolicyId: token, allowedFeeKinds: list(choice('payment_fee', 'store_fee')),
  compensationPolicyId: token, stacking: choice('combined', 'separate'), components: list(component, 1),
  rounding: choice('floor_per_allocation', 'half_up_per_allocation'),
  adjustmentPolicyRef: token,
});
const ledgerReader = shape({
  schemaVersion: choice('1'), collections: list(collection), adjustments: list(adjustment), schedules: list(schedule),
});
export type RoyaltyLedger = ReturnType<typeof ledgerReader>;
export type RoyaltySchedule = ReturnType<typeof schedule>;
export type Collection = ReturnType<typeof collection>;
export type Adjustment = ReturnType<typeof adjustment>;
export const parseRoyaltyLedger = (json: string): RoyaltyLedger => parse(json, readRoyaltyLedger);

/** Strictly bounded validation of arithmetic and references; not evidence authentication. */
export function readRoyaltyLedger(value: unknown): RoyaltyLedger {
  const ledger = ledgerReader(value);
  unique(ledger.collections.map(c => c.transactionId), 'transaction ID');
  unique(ledger.collections.map(c => c.sourceReceiptRef), 'source receipt');
  unique(ledger.adjustments.map(a => a.eventId), 'adjustment event');
  unique(ledger.adjustments.map(a => a.sourceEventRef), 'source adjustment');
  unique(ledger.schedules.map(s => s.id), 'schedule ID');
  unique(ledger.collections.flatMap(c => c.allocations.flatMap(a => a.deductions.map(d => d.id))), 'deduction ID');
  unique(ledger.collections.flatMap(c => c.allocations.flatMap(a => a.deductions.map(d => d.sourceItemRef))), 'deduction source item');
  for (const c of ledger.collections) {
    unique(c.allocations.map(a => a.id), 'allocation ID');
    ensure(sum(c.allocations.map(a => a.grossCents)) === c.grossCents, 'Allocations must reconcile exactly, including explicit unallocated remainder');
    for (const a of c.allocations) {
      ensure((a.productId === null) === (a.sourceId === null), 'Unallocated scope must be explicit');
      ensure(sum(a.deductions.map(d => d.cents)) <= a.grossCents, 'Deductions exceed allocated collection');
    }
  }
  for (const s of ledger.schedules) {
    ensure(s.startsAt < s.endsAt, 'Invalid royalty term');
    ensure((s.status === 'revoked') === (s.revokedAt !== null), 'Revocation requires an effective timestamp, and only revoked schedules may have one');
    if (s.revokedAt !== null) ensure(s.revokedAt >= s.startsAt, 'Revocation precedes term');
    unique(s.agreementEvidenceRefs, 'agreement evidence'); unique(s.allowedFeeKinds, 'fee category'); unique(s.components.map(c => c.id), 'component ID');
    unique(s.components.map(c => c.kind), 'component kind');
    ensure(sum(s.components.map(c => c.basisPoints)) <= 10000, 'Stacked rates exceed 100%');
    if (s.stacking === 'combined') ensure(s.components.length === 1 && s.components[0].kind === 'combined', 'Combined policy requires one explicit combined rate');
    else ensure(s.components.every(c => c.kind !== 'combined'), 'Separate policy cannot include combined compensation');
    if (s.components.some(c => c.kind !== 'likeness')) ensure(s.contributionEvidenceRefs.length > 0, 'Product contribution evidence required; does not establish ownership');
  }
  // Same participant/product/source cannot silently receive overlapping schedules.
  for (let i = 0; i < ledger.schedules.length; i++) for (let j = i + 1; j < ledger.schedules.length; j++) {
    const a = ledger.schedules[i], b = ledger.schedules[j];
    if (a.status !== 'draft' && b.status !== 'draft' && a.tenantId === b.tenantId && a.participantId === b.participantId && a.productId === b.productId && a.sourceId === b.sourceId)
      ensure((a.revokedAt !== null && a.revokedAt < a.endsAt ? a.revokedAt : a.endsAt) <= b.startsAt || (b.revokedAt !== null && b.revokedAt < b.endsAt ? b.revokedAt : b.endsAt) <= a.startsAt, 'Overlapping executed schedules require reconciliation');
  }
  for (const e of ledger.adjustments) {
    const c = ledger.collections.find(c => c.transactionId === e.transactionId);
    ensure(c && c.status === 'collected', 'Adjustment needs actual original collection');
    const a = c.allocations.find(a => a.id === e.allocationId);
    ensure(a && e.recordedAt >= c.collectedAt, 'Invalid adjustment allocation or date');
    unique(e.feeReversals.map(r => r.deductionId), 'fee reversal');
    for (const r of e.feeReversals) ensure(a.deductions.some(d => d.id === r.deductionId && d.kind !== 'sales_tax'), 'Fee reversal needs original fee');
  }
  for (const c of ledger.collections) for (const a of c.allocations) {
    const adjustments = ledger.adjustments.filter(e => e.transactionId === c.transactionId && e.allocationId === a.id);
    const tax = sum(a.deductions.filter(d => d.kind === 'sales_tax').map(d => d.cents));
    ensure(sum(adjustments.map(e => e.principalCents)) <= a.grossCents - tax, 'Refund/chargeback principal overlap or excess');
    const ranges = adjustments.filter(e => e.principalCents > 0).map(e => ({ start: e.principalOffsetCents, end: sum([e.principalOffsetCents, e.principalCents]) })).sort((x, y) => x.start - y.start);
    for (let i = 0; i < ranges.length; i++) {
      ensure(ranges[i].end <= a.grossCents - tax, 'Principal range exceeds original product value');
      if (i > 0) ensure(ranges[i - 1].end <= ranges[i].start, 'Refund and chargeback principal ranges overlap');
    }
    ensure(sum(adjustments.map(e => e.taxReturnedCents)) <= tax, 'Returned tax exceeds original tax');
    for (const d of a.deductions) ensure(sum(adjustments.flatMap(e => e.feeReversals.filter(r => r.deductionId === d.id).map(r => r.cents))) <= d.cents, 'Fee reversals exceed original fee');
  }
  return ledger;
}

function rounded(amount: number, rate: number, policy: RoyaltySchedule['rounding']): number {
  const numerator = BigInt(amount) * BigInt(rate);
  const result = Number((numerator + (policy === 'half_up_per_allocation' ? 5000n : 0n)) / 10000n);
  ensure(Number.isSafeInteger(result), 'Royalty exceeds safe integer range'); return result;
}
export interface AttributionLine {
  transactionId: string; allocationId: string; scheduleId: string; participantId: string;
  grossCollectedCents: number; taxExcludedCents: number; principalReturnedCents: number; taxReturnedCents: number;
  allowedFeesCents: number; originalEligibleCents: number; remainingEligibleCents: number;
  originalRoyaltyCents: number; calculatedRoyaltyCents: number; adjustmentDeltaCents: number;
  components: { componentId: string; kind: string; calculatedCents: number }[];
  roundingResidualNumerator: string;
}
/** Offline calculation only; caller-provided records never authorize payouts or publication. */
export function calculateAttribution(input: unknown): {
  lines: AttributionLine[]; excludedProjectedTransactionIds: string[]; reviewRequired: true;
  approvedPayableCents: null; verifiedPaidCents: null; authorizesExecution: false;
} {
  const ledger = readRoyaltyLedger(input), lines: AttributionLine[] = [];
  for (const c of ledger.collections.filter(c => c.status === 'collected')) for (const a of c.allocations) {
    if (a.productId === null) continue;
    const adjustments = ledger.adjustments.filter(e => e.transactionId === c.transactionId && e.allocationId === a.id);
    const tax = sum(a.deductions.filter(d => d.kind === 'sales_tax').map(d => d.cents));
    const principal = sum(adjustments.map(e => e.principalCents));
    const schedules = ledger.schedules.filter(s => s.status !== 'draft' && (s.revokedAt === null || c.collectedAt < s.revokedAt) && s.tenantId === c.tenantId && s.currency === c.currency && s.productId === a.productId && s.sourceId === a.sourceId && c.collectedAt >= s.startsAt && c.collectedAt < s.endsAt);
    let allocatedRoyalties = 0, originalAllocatedRoyalties = 0;
    let originalAvailable = a.grossCents - tax, remainingAvailable = a.grossCents - tax - principal;
    for (const s of schedules) {
      const fees = a.deductions.filter(d => d.kind !== 'sales_tax' && s.allowedFeeKinds.includes(d.kind));
      const originalFees = sum(fees.map(d => d.cents));
      const feeReversals = sum(adjustments.flatMap(e => e.feeReversals.filter(r => fees.some(d => d.id === r.deductionId)).map(r => r.cents)));
      const remainingFees = originalFees - feeReversals;
      const originalEligible = Math.max(0, a.grossCents - tax - originalFees);
      const remainingEligible = Math.max(0, a.grossCents - tax - principal - remainingFees);
      originalAvailable = Math.min(originalAvailable, originalEligible);
      remainingAvailable = Math.min(remainingAvailable, remainingEligible);
      const components = s.components.map(component => ({ componentId: component.id, kind: component.kind, calculatedCents: rounded(remainingEligible, component.basisPoints, s.rounding) }));
      const royalty = sum(components.map(component => component.calculatedCents));
      const originalRoyalty = sum(s.components.map(component => rounded(originalEligible, component.basisPoints, s.rounding)));
      // Independent half-up rounding can overallocate a one-cent base: fail for explicit reconciliation.
      ensure(royalty <= remainingEligible && originalRoyalty <= originalEligible, 'Rounding exceeds eligible base; explicit reconciliation required');
      allocatedRoyalties = sum([allocatedRoyalties, royalty]);
      originalAllocatedRoyalties = sum([originalAllocatedRoyalties, originalRoyalty]);
      const exactNumerator = BigInt(remainingEligible) * BigInt(sum(s.components.map(component => component.basisPoints)));
      lines.push({ transactionId: c.transactionId, allocationId: a.id, scheduleId: s.id, participantId: s.participantId,
        grossCollectedCents: a.grossCents, taxExcludedCents: tax, principalReturnedCents: principal,
        taxReturnedCents: sum(adjustments.map(e => e.taxReturnedCents)), allowedFeesCents: remainingFees,
        originalEligibleCents: originalEligible, remainingEligibleCents: remainingEligible,
        originalRoyaltyCents: originalRoyalty, calculatedRoyaltyCents: royalty, adjustmentDeltaCents: royalty - originalRoyalty,
        components, roundingResidualNumerator: (BigInt(royalty) * 10000n - exactNumerator).toString(),
      });
    }
    ensure(originalAllocatedRoyalties <= originalAvailable, 'Original participant allocations exceed eligible base');
    ensure(allocatedRoyalties <= remainingAvailable, 'Participant allocations exceed retained eligible base');
  }
  return { lines, excludedProjectedTransactionIds: ledger.collections.filter(c => c.status === 'projected').map(c => c.transactionId), reviewRequired: true,
    approvedPayableCents: null, verifiedPaidCents: null, authorizesExecution: false };
}

const fixedObligation = shape({
  id: token, tenantId: token, participantId: token, productId: token, obligationSourceRef: token,
  agreementEvidenceRefs: list(token, 1), status: choice('draft', 'executed', 'disputed'),
  currency: choice('USD'), amountCents: cents, dueAt: date,
});
export type FixedCreationObligation = ReturnType<typeof fixedObligation>;
/** Fixed fees remain separate one-time obligations, never repeated on each sale or marked paid. */
export function readFixedCreationObligations(value: unknown): FixedCreationObligation[] {
  const records = list(fixedObligation)(value);
  unique(records.map(r => r.id), 'fixed obligation'); unique(records.map(r => r.obligationSourceRef), 'fixed obligation source'); return records;
}
