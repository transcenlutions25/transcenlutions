# Agency sales snapshot: static design review

Created October 9, 2026 from component source commit `3c9177774b2ed4bcc04f9878fbb4ba32a0babc66`.

- `Sales-dashboard-900px-static-preview.png`: wide design preview, 1350 × 2076 pixels; SHA-256 `59ad36296314ce052cab206a322e5d59333938a7c11a2389df6ebaabe596a178`.
- `Sales-dashboard-390px-static-preview.png`: narrow design preview, 585 × 2790 pixels; SHA-256 `dae73c70c5cd73d03f628f3e57d5e0edc092d471d891739468c7aba765fd1953`.

These are **static design previews, not browser screenshots or a live app**. The markup comes from React's `renderToStaticMarkup` applied to the actual `SalesSnapshot` component. Its CSS was adapted for WeasyPrint 70.0: explicit wide/narrow grid columns, font sizes and padding replace viewport-dependent expressions; print-compatible block/inline layouts replace some flex/grid controls; native file/search widgets are shown as static text boxes. Poppler rasterized the PDFs at 144 DPI. Spacing and form controls therefore approximate browser appearance.

Both images were visually inspected for legibility, clipping and layout. They show the genuine empty state: **No data connected**, dashes instead of monetary figures, and no invented leads or deals. Controls are noninteractive. No customer records, secrets or authentication state appear.

Browser/mobile interaction and pixel QA remain unverified. Shell Chromium was blocked before launch by the environment's socket restriction. The supported cloud browser rejected the local data URL under its HTTP/HTTPS-only URL policy; no bypass was attempted. No hosting, deployment, account connection or production change occurred. These files preserve review deliverables in GitHub; they do not establish a Floot, runtime-data or complete-platform backup.

Alt description: Dark purple Transcenlutions sales dashboard with gold headings, a No data connected badge, empty Collected/Pending/Open pipeline cards, and empty deals and leads sections. The narrow version stacks the financial cards vertically.
