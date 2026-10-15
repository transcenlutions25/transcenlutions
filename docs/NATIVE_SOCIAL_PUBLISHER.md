# Tay Native Social Publisher

Status: implementation foundation on `feat/native-social-publisher`; live provider execution remains disabled by default.
Owner direction: October 15, 2026 — native provider publishing is the primary architecture; Metricool is a fallback/scheduler, not the core publishing engine.

## Purpose

Tay owns a provider-neutral social publishing gateway. Content creation can happen in Tay or an authorized media tool, then Tay sends one explicitly approved publication to the selected provider through that provider's native API. Product/funnel IDs travel with every command so later audit and attribution can connect a post to the offer that produced it.

Supported adapters in this foundation:

- Facebook Page photo/video publishing through Meta Graph API.
- Instagram image/Reels container creation and publish through Instagram Graph API.
- Threads image/video container creation and publish through Threads API.
- TikTok Direct Post using Content Posting API `PULL_FROM_URL`, with creator-info privacy validation and AI/brand disclosure fields.
- YouTube resumable video upload through YouTube Data API.
- Pinterest image Pins and registered video Pins through Pinterest API v5.
- LinkedIn Videos API upload/finalize plus Posts API publication.

## Safety and authority

The endpoint is `/api/social/publish` and uses the existing platform identity boundary. It requires the founding-owner role. Production identity currently fails closed, so this endpoint is not a production backdoor.

Live publication additionally requires all of the following:

1. `mode` is `publish`.
2. `approved` is `true` in the bounded server request.
3. Exactly one network is selected per live request. This prevents an accidental one-click blast and gives the audit layer a clear provider action per approval.
4. `TAY_SOCIAL_PUBLISH_LIVE_ENABLED=true` is configured server-side.
5. The selected provider's server-side credentials and account identifiers are configured.

`mode=validate` performs readiness checks without publishing. No retries are performed after a provider failure; a failed/uncertain provider action must be inspected before a new owner-approved attempt.

## Request shape

```json
{
  "mode": "validate",
  "approved": false,
  "requestId": "stable-request-id",
  "campaignId": "apartment-make-ready-launch",
  "productId": "apartment-make-ready",
  "mediaUrl": "https://approved-media-host.example/video.mp4",
  "mediaType": "video",
  "caption": "Caption and funnel CTA",
  "title": "Required for YouTube",
  "linkUrl": "https://example.com/funnel",
  "coverImageUrl": "https://approved-media-host.example/cover.jpg",
  "aiGenerated": true,
  "targets": [{ "network": "youtube", "privacy": "private" }]
}
```

For live publication, change `mode` to `publish`, set `approved` to true only after owner review, and include only one target.

## Media boundary

Providers that pull a public URL themselves receive only validated HTTPS URLs. Providers that require Tay to fetch/upload binary media (YouTube, Pinterest video, LinkedIn video) use `SOCIAL_MEDIA_ALLOWED_HOSTS`. Server-side download is denied unless the media hostname is explicitly allowlisted. `SOCIAL_MEDIA_MAX_BYTES` caps in-memory transfer; the default example is 50 MiB. Large production assets should later move to a durable streaming/upload worker rather than raising this limit casually.

## Provider setup still requiring owner/account action

No credentials are committed. The owner must create/approve provider apps, scopes and account connections in the provider dashboards and place secrets in the protected deployment environment.

- Meta: Graph API version, Facebook Page ID, Instagram professional account ID and an access token with the required publishing permissions.
- Threads: current API version, Threads user ID and authorized access token.
- TikTok: Content Posting API app, `video.publish` approval/authorization and verified media URL prefix/domain for `PULL_FROM_URL`. TikTok currently restricts unaudited Direct Post clients to private visibility.
- YouTube: OAuth token with upload permission for the intended channel.
- Pinterest: OAuth token and target board. Video Pins also require a cover image.
- LinkedIn: OAuth token, owner person/organization URN, current `YYYYMM` API version and the appropriate member/organization posting permission.

Do not turn on the live flag until each selected provider has completed a private/test publication and the returned provider ID has been verified.

## Next implementation layer

1. Durable social action ledger keyed by `requestId`, provider and account for true idempotency and post URL/status history.
2. Provider OAuth/connect UI tied to authenticated tenant ownership rather than manual environment setup.
3. Media library with durable signed URLs on an approved domain.
4. Tay campaign console: script -> video -> approval -> native publish -> post URL -> funnel clicks -> orders.
5. Per-product funnels and campaign attribution for the five current Transcenlutions digital products.
6. Scheduling worker. Until that exists, Metricool can remain a fallback scheduler without becoming the core publisher.

This file describes code and required setup. It does not claim the provider accounts are connected or that any live post has been sent.
