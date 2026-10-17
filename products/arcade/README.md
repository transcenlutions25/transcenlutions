# Transcenlutions Arcade

Four original games built from common gameplay ideas, with original code and geometric visuals. This collection is a Transcenlutions module, not a replacement for Tay Command or the Crowne Legacy film/game canon.

## Start playing

Open `/arcade` or `/arcade/index.html` on the deployed Transcenlutions app. Choose a game and select **How to play** for its complete controls. No account is required. Browser and Android progress is local to the device; it is not a shared account library or online leaderboard.

| Game | Complete play loop |
| --- | --- |
| Crown Grid | Place and rotate block pieces on an 8×8 board; clear rows/columns; score and combo; continue until no piece fits; replay. A daily seeded starting board is available. |
| Prism Sort | Pour matching colors/symbols between six tubes; sort four full color groups; complete generated solvable levels; undo/restart/advance. |
| Orbit Link | Rotate reciprocal pipe connectors to carry light from START to END; fixed tiles add constraints; undo/hint/restart/advance. |
| Lumen Run | Move between three lanes, collect sparks, avoid barriers, lose shields on collisions, finish and replay; relaxed pace and explicit pause/resume. |

Keyboard and touch controls are supported. Settings includes larger text, stronger contrast, reduced motion, and optional locally synthesized sound. Color is paired with symbols in the sorting puzzle. All essential action buttons have visible text and keyboard focus.

## Validate and export

```sh
npm ci
npm run test:arcade
npm run build:arcade
```

The offline build produces `dist/arcade/Transcenlutions-Arcade.html`. The export embeds the same game engine and UI; it does not depend on internet-hosted scripts or assets. Open it in a modern browser. File-origin storage and downloads vary by browser. The Android wrapper is documented at `android/arcade/README.md` and bundles the exact source assets.

Tests cover engine invariants and real DOM event journeys. They do not substitute for visual inspection, actual Android device runs, content-rating review, Play closed testing, or Google review.

## Product use and limits

`PRODUCT.json` provides a stable ID, version, entry point, actions and portability contract for Tay and other authorized agents. It does not implement or claim automatic account entitlement registration. The existing site prevents framing with `X-Frame-Options: DENY`, so this release uses a direct module link.

There are four game modes, not 100 released games. The separate 100-game market study is a dated research inventory and original concept backlog. No current-download-count or top-100-active-player claim is made. There are no ads, purchases, multiplayer services or cloud accounts in this edition.

Competitor names belong only in the research, not this product's presentation or store keywords. No third-party game assets were copied. Existing repository dependencies and AndroidX retain their own licenses. Source ownership remains with Transcenlutions; this release adds no open-source license to the owner's code.
