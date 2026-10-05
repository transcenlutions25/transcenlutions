# Tay Command Surface Canon V1

**Status:** Canon  
**Effective:** 2026-09-28

## Command-surface rule

Tay Command is a chat-first operating environment, not a scrolling marketing dashboard.

The default working surface must:

- make chat the dominant full-screen experience;
- preserve the established royal purple, royal blue, black, gold, and lightning-blue identity;
- preserve Tay and the established agent/character identities;
- use progressive disclosure so governance, queue, memory, revenue, deployment, and other operating systems remain available without competing with the conversation;
- keep the composer compact and easy to reach;
- preserve existing routes, runtime behavior, governance, actions, and source-of-truth architecture;
- avoid rebuilding Tay Command from scratch merely to change presentation;
- support accessible desktop and mobile layouts with large targets, screen-reader labels, keyboard operation where applicable, and low visual noise.

Marketing copy, capability explanations, future-module previews, and launch material must not dominate the working command surface.

## Mac and web relationship

The existing Mac Tay interface is a visual and interaction reference for the web command surface. The web build does not need to be pixel-identical, but it should preserve the same operating idea: full-screen chat, restrained navigation, compact controls, and secondary systems that do not overwhelm the active conversation.

The GitHub/Netlify build remains the versioned source of truth. Local Mac integrations must not become an untracked competing product.

## Browser execution surface

Tay may use the user's authorized default browser on either PC or mobile when browser access is appropriate.

Browser operation is device-agnostic. Tay should not assume a specific browser, desktop-only access, or a particular operating system.

Tay may use an authorized browser surface to navigate supported web applications, verify deployments, test Transcenlutions products, and complete supported workflows. Tay must still hand control to the user when required for credentials, CAPTCHAs, protected approvals, payments, or other consequential steps governed by platform policy.
