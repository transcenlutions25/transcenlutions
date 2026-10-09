import { choice, date, ensure, list, nullable, parse, shape, token, unique } from './validation';

const decision = choice('approved', 'denied', 'unknown');
const digest = (value: unknown): string => { ensure(typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value), 'Expected SHA-256 asset digest'); return value; };
const scope = shape({
  assetId: token, assetVersion: token, assetDigest: digest, productId: token, use: token, territory: token, channel: token,
  contextId: token, audienceId: token, providerId: token, sublicensing: decision,
  startsAt: date, endsAt: date,
  aiGeneration: decision, voiceCloning: decision, training: decision,
});
const grantReader = shape({
  id: token, participantId: token, tenantId: token,
  status: choice('unknown', 'draft', 'executed', 'revoked', 'expired'),
  agreementEvidenceRefs: list(token), participantSignatureRef: nullable(token), entitySignatureRef: nullable(token),
  materialApprovalRef: nullable(token), rightsReviewRef: nullable(token),
  participantClass: choice('adult', 'minor', 'unknown'), minorLinked: choice('yes', 'no', 'unknown'), thirdPartyRights: choice('cleared', 'unresolved', 'unknown'),
  scope,
  existingCustomerContinuation: nullable(shape({
    scope, agreementEvidenceRefs: list(token, 1), customerCohortRef: token,
    status: choice('approved', 'denied', 'unknown'),
  })),
});
export type ConsentRecord = ReturnType<typeof grantReader>;
export const readConsent = (value: unknown): ConsentRecord => {
  const result = grantReader(value);
  ensure(result.scope.startsAt < result.scope.endsAt, 'Invalid consent term');
  unique(result.agreementEvidenceRefs, 'agreement evidence');
  const continuation = result.existingCustomerContinuation;
  if (continuation) ensure(continuation.scope.startsAt < continuation.scope.endsAt, 'Invalid continuation term');
  return result;
};
export const parseConsent = (json: string): ConsentRecord => parse(json, readConsent);
const requestReader = shape({
  tenantId: token, participantId: token, assetId: token, assetVersion: token, assetDigest: digest, productId: token,
  contextId: token, audienceId: token, providerId: token, sublicensing: choice('requested', 'not_requested'),
  use: token, territory: token, channel: token, at: date,
  aiGeneration: choice('requested', 'not_requested'), voiceCloning: choice('requested', 'not_requested'), training: choice('requested', 'not_requested'),
  customerCohortRef: nullable(token),
});
export type ConsentRequest = ReturnType<typeof requestReader>;
/** Advisory matching only. Cannot authenticate, approve publication, or verify legal validity. */
export function evaluateConsent(record: unknown, request: unknown): { matchesRecordedScope: boolean; reason: string; authorizesExecution: false } {
  try {
    const r = readConsent(record), q = requestReader(request);
    const deny = (reason: string) => ({ matchesRecordedScope: false, reason, authorizesExecution: false as const });
    if (r.status !== 'executed') return deny('Consent is not recorded as executed');
    if (!r.agreementEvidenceRefs.length || !r.participantSignatureRef || !r.entitySignatureRef || !r.materialApprovalRef || !r.rightsReviewRef) return deny('Required evidence references are missing');
    if (r.participantClass !== 'adult' || r.minorLinked !== 'no' || r.thirdPartyRights !== 'cleared') return deny('Separate rights review is required');
    if (r.tenantId !== q.tenantId || r.participantId !== q.participantId) return deny('Identity scope mismatch');
    let s = r.scope;
    if (q.customerCohortRef !== null) {
      const c = r.existingCustomerContinuation;
      if (!c || c.status !== 'approved' || c.customerCohortRef !== q.customerCohortRef) return deny('No matching continuation grant');
      s = c.scope;
    }
    for (const key of ['assetId', 'assetVersion', 'assetDigest', 'productId', 'use', 'territory', 'channel', 'contextId', 'audienceId', 'providerId'] as const) if (s[key] !== q[key]) return deny('Use scope mismatch');
    if (q.at < s.startsAt || q.at >= s.endsAt) return deny('Outside recorded term');
    for (const key of ['aiGeneration', 'voiceCloning', 'training', 'sublicensing'] as const) if (q[key] === 'requested' && s[key] !== 'approved') return deny('Express AI permission missing');
    return { matchesRecordedScope: true, reason: 'Recorded scope matches; authenticated authorization and legal review still required', authorizesExecution: false };
  } catch { return { matchesRecordedScope: false, reason: 'Invalid record or request', authorizesExecution: false }; }
}
const reconciliationReader = shape({
  id: token, participantId: token, tenantId: token, recordedAt: date,
  kind: choice('existing_promise', 'signed_terms', 'affected_release', 'remediation', 'review', 'superseding_agreement'),
  sourceEvidenceRefs: list(token, 1), relatedRecordIds: list(token),
  resolution: choice('unreviewed', 'conflict', 'confirmed', 'resolved'),
});
export type ReconciliationEntry = ReturnType<typeof reconciliationReader>;
/** Returns a new history; existing promises and conflicting evidence are never overwritten. */
export function appendReconciliation(history: unknown, entry: unknown): ReconciliationEntry[] {
  const prior = list(reconciliationReader)(history), next = reconciliationReader(entry);
  unique([...prior.map(item => item.id), next.id], 'reconciliation ID');
  for (const item of prior) ensure(item.tenantId === next.tenantId && item.participantId === next.participantId, 'Reconciliation scope mismatch');
  const entries = [...prior, next];
  for (let i = 0; i < entries.length; i++) for (const id of entries[i].relatedRecordIds) ensure(entries.slice(0, i).some(item => item.id === id), 'Unknown or forward prior record');
  return [...prior, next];
}
