# VocaPet Companion extension

This Manifest V3 Chrome extension runs a background alarm, checks the signed-in user's FSRS study plan, and places Burumaru directly on normal websites. The pet walks along the bottom of the current tab, gently approaches before a due reminder, opens a timed 10-second quiz, and sends the answer through the same API used by the web app. XP, FSRS scheduling, streaks and the next plan therefore remain user-scoped and in sync with VocaPet.

## Load it locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the `vocapet-companion-extension` folder.
5. Open the VocaPet icon, sign in, and choose a reminder interval.

Burumaru appears after you refresh a normal website. Chrome does not permit extensions to draw over `chrome://` pages, the Chrome Web Store, or the browser toolbar.

For local development, enter `http://localhost:8080` as the API URL and the local frontend URL as Website URL. For production, the defaults point to the deployed services.

## Security model

- The extension signs in through the existing API and stores its JWT only in `chrome.storage.local`.
- It never reads the website's local storage or cookies.
- Every plan request and quiz answer uses the existing bearer-token authentication and user-scoped endpoints.
- The background worker refreshes an expired access token once with the stored refresh token before asking the user to sign in again.
- The content script never receives the JWT. It receives only whether a companion is signed in.
- Before publishing, set `APP_CORS_ALLOWED_EXTENSION_ORIGINS` to the exact `chrome-extension://<Chrome Web Store ID>` origin instead of the development wildcard.
