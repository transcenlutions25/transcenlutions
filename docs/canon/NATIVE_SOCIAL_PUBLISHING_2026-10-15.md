# Native social publishing directive

Status: CANON — direct founder instruction, October 15, 2026.
Implementation status is separate from the decision.

## Decision

Tay should create and publish marketing content through native provider integrations wherever practical. Metricool may remain available as a fallback scheduler/distribution option, but it is not the canonical publishing engine.

The native publishing architecture should support Facebook, Instagram, Threads, TikTok, YouTube/Shorts, Pinterest and LinkedIn. Every publication must retain its Transcenlutions product/funnel campaign identity so traffic and eventual revenue can be attributed back to the offer.

Each current digital product requires its own professional direct-response funnel and campaign identity. The social publisher is a shared service consumed by those funnels rather than five duplicated publisher implementations.

## Authority and safeguards

This decision authorizes building the native publishing capability. It does not place secrets in Git, bypass provider consent/scopes, remove platform disclosure requirements or create another system owner.

Consequential live publication remains owner-authorized and auditable. The first implementation therefore keeps a server-side live kill switch, requires founding-owner identity, requires an explicit approval field and limits a live request to one network so a single accidental request cannot blast every connected channel. Provider account connection/OAuth and live test publication remain separate verified setup steps.

## Revenue priority

The purpose is to eliminate unnecessary distribution bottlenecks and let Tay move a product campaign from content creation to native distribution and measurable funnel traffic. The system should ultimately connect:

`product -> funnel -> campaign -> content -> media -> approved native post -> post URL -> clicks -> checkout -> order -> net revenue`

Traffic, scheduled posts, generated media and provider acceptance are not revenue. Keep those measurements separate from paid orders and net proceeds.
