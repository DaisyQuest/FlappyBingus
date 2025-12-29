# Logout on Selection Bug

## Cause
The session system relied exclusively on the `bingus_session` HttpOnly cookie. When a player changed trail/icon/pipe texture, the client issued an authenticated POST request. If the browser did not send the cookie (for example: `SameSite=None` + `Secure` on an HTTP dev host, or embedded webviews where cookies are blocked) and localStorage was unavailable, the request was unauthenticated, the server returned `401 unauthorized`, and the client cleared `net.user`. That cleared the username input and looked like a logout.

In short: **cosmetic updates were the first authenticated requests to fail when cookies were unavailable**, and the client correctly interpreted that as a logout.

## Fix
1. **Accept Authorization headers** (`Bearer <token>`) in addition to cookies.
2. **Return a session token** in `/api/register` and `/api/me` responses so the client can persist it.
3. **Store and send the token client-side** for all API calls, so authentication works even when cookies are blocked.
4. **Cache the session token in memory** so the app can keep authenticating even when localStorage is blocked.

This keeps JWT cookies as the primary mechanism, while providing a robust fallback that prevents logout on selection changes.
