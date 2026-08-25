# VocaPet Companion extension

This Manifest V3 Chrome extension runs a background alarm, checks the signed-in user's FSRS study plan, and places Burumaru directly on normal websites. The pet walks along the bottom of the current tab, can open a quick quiz, and opens the existing daily plan when the user wants a full review.

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
- Every plan request uses the existing bearer-token authentication and user-scoped study-plan endpoint.
- Before publishing, set `APP_CORS_ALLOWED_EXTENSION_ORIGINS` to the exact `chrome-extension://<Chrome Web Store ID>` origin instead of the development wildcard.
