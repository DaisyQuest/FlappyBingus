# Meeting Notes
- Date: 2025-12-22
- Attendees: ChatGPT (GPT-5.1-Codex-Max)

## Agenda
- Diagnose player icon selection failures (red icon reporting server unavailable)
- Improve API client error handling to distinguish offline vs validation errors
- Preserve icon selection when the server is temporarily unreachable
- Expand automated coverage around API responses and icon save flows

## Discussion
- Request helpers were collapsing all non-2xx responses into a generic offline/null state, which caused UI flows (like icon saves) to report “server unavailable” even for validation/auth errors.
- Icon saves reverted to the previous icon whenever the API call failed, preventing local selection when the backend was down and hiding useful error context.
- A reusable classifier for icon save responses can keep UI hints consistent while making it obvious when the user needs to re-authenticate versus when the server is actually offline.
- Tests needed to cover the new response shapes (status/error) and the icon save classifier to avoid future regressions.

## Decisions
- Return structured objects from API helpers that include status/error metadata instead of nulling on HTTP errors.
- Keep icon selections applied locally when the backend is unreachable, but explicitly revert on locked/unauthorized responses.
- Introduce a dedicated classifier to drive icon save UI states so messages stay accurate across error types.
- Add targeted unit tests for the API helper behavior change and the icon save classifier.

## Action Items
- Land the API response normalization changes and icon save handling improvements with full test coverage.
- Monitor any downstream UI flows that rely on API helpers to ensure they check `res.ok` rather than only null.
- If additional cosmetics flows show similar issues, reuse the classifier pattern to align messaging and recovery paths.
