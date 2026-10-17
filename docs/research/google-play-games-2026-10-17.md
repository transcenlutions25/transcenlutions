# Google Play games research — 17 October 2026

## Scope and evidence

This record supports the original Transcenlutions Arcade module. It identifies a current market sample and 100 original concept directions; it does not record 100 completed or published games.

The primary sample is **100 consecutive ranks, 1–100, from one U.S. Google Play popular/free chart snapshot**, collected on **17 October 2026 at approximately 10:42 UTC**. All 100 package IDs are unique and resolve to public Google Play listings. Official listing categories and displayed cumulative install bands were checked for all 100 games.

| Evidence | Source | What it establishes |
| --- | --- | --- |
| Primary 100-game ranking | [GamerScroll free rankings](https://gamerscroll.com/rankings/free/) | The preserved U.S. Android free-chart order at collection time; the live page can change during the day. |
| Independent chart comparison | [AppBrain U.S. top-free games](https://www.appbrain.com/stats/google-play-rankings/top_free/game/us) | A separate same-day snapshot containing 99 visible records, with rank 83 absent. Differences were retained rather than combined into the primary ranking. |
| Official listing metadata | [Google Play](https://play.google.com/store/games) and each package-specific URL in the companion data | Title, package ID, category and displayed cumulative install threshold. These thresholds are neither U.S.-only nor downloads during this collection period. |
| Separate usage leaders | [Similarweb U.S. games usage rankings](https://www.similarweb.com/top-apps/google/games/top-free/) | Five publicly visible leaders dated 14 October 2026, using a mixture of current installs and active users over a 28-day period. |

**Metric limits:** a free-chart rank is not an exact download count. Similarweb usage rank is not a reported DAU, MAU or hours-played count. A verified public top 100 by actual player activity was not obtained. Do not label this dataset “the 100 most played games” or infer exact recent downloads from cumulative install bands. Girls Echo, primary rank 96, displayed `0+` installs on its official listing; that discrepancy is preserved rather than explained by an unsupported assumption.

## Leading games in the preserved free-chart snapshot

| Rank | Game | Official category |
| --- | --- | --- |
| 1 | Meowdoku: Brain Puzzle Games | Puzzle |
| 2 | Rotate Rings | Puzzle |
| 3 | Roblox | Adventure |
| 4 | Magic Sort! | Puzzle |
| 5 | Amaze GO! | Puzzle |
| 6 | Royal Smash! - Physics Puzzle | Casual |
| 7 | Vita Mahjong | Board |
| 8 | Block Blast! | Puzzle |
| 9 | Bus Fever Party! | Casual |
| 10 | MONOPOLY GO! | Board |

The **separate usage ranking, dated 14 October**, lists **Roblox, MONOPOLY GO!, Pokémon GO, Block Blast!, and NYT Games: Wordle & Crossword**, in that order. It covers five verified public rows, not all 100 games, and is not merged with the free-chart order.

## Category distribution and portfolio decision

Official categories across the 100 listings:

| Category | Games | Category | Games |
| --- | ---: | --- | ---: |
| Puzzle | 43 | Casual | 16 |
| Arcade | 7 | Board | 6 |
| Action | 5 | Strategy | 5 |
| Card | 4 | Simulation | 4 |
| Word | 3 | Adventure | 2 |
| Sports | 1 | Music | 1 |
| Educational | 1 | Casino | 1 |
| Role Playing | 1 | **Total** | **100** |

The concept matrix contains **100 distinct, planned original directions** grouped into 13 analytical design families. Relative S/M/L prototype effort labels describe scope, not delivery dates or release commitments. Multiplayer services, content production, moderation, licensed properties and ongoing operations are identified where relevant. Those concepts remain **PLANNED**; a concept entry is not an implemented game.

Prioritize the four implemented original modes within one Transcenlutions Arcade module:

| Priority | Mode | Actual scope and reason for inclusion |
| --- | --- | --- |
| 1 | Crown Grid | Block placement, rotation and line clearing; tests a repeatable spatial puzzle loop in the largest category. |
| 2 | Prism Sort | Solvable color-and-symbol tube sorting with undo; explores a distinct puzzle interaction. |
| 3 | Orbit Link | Rotating reciprocal pipe connections with fixed tiles and hints; adds a separate spatial reasoning mechanic. |
| 4 | Lumen Run | Three-lane runner with collectibles, barriers, shields and a relaxed pace; broadens the portfolio beyond stationary puzzles. |

These are original genre analogues, with original geometric visuals and implementation. Competitor names identify research subjects; they do not identify affiliated products or supply permission to reuse characters, art, code, music or levels. Validate the four modes before selecting further concepts. The arcade supplements Tay Command and the existing Transcenlutions platform.

## Companion deliverables and release status

The full searchable report and machine-readable data are delivered separately under these filenames:

- `Transcenlutions_Google_Play_Top100_Research.html`
- `google_play_us_top100_2026-10-17.csv`
- `google_play_us_top100_2026-10-17.json`

The exports contain all 100 ranked records, package-specific source links, metadata, separate usage evidence and original concept directions. Their rank sequence, package uniqueness and 100 distinct concept entries were checked; the report's search, filters and exports were exercised. The raw research exports are not duplicated in this repository.

See the [arcade product record](../../products/arcade/README.md) and [release record](../releases/arcade-2026-10-17.md). **Source publication, remote CI, web deployment, Android artifact publication and Google Play submission remain PENDING** until the release coordinator records the corresponding evidence.
