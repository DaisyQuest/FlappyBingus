# Work Order: Trim media data URLs

- [x] Update media normalization to trim dataUrl values and treat whitespace-only values as empty.
- [x] Add/adjust unit tests in services/__tests__/bestRuns.spec.js to cover whitespace-only media data URLs.
- [ ] Run relevant tests (vitest) or document if not run. (Ran `npm run test:headless`; failing in `public/js/__tests__/surfGame.spec.js`.)
