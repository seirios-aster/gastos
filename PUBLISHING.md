# Publishing Gastos

Three ways to get the app onto your friends' phones, from fastest to most official.
Policies and screens on Google's side change, so trust the Play Console where it disagrees.

## Before you start (once)

1. Create a free account at https://expo.dev and run `npx eas-cli@latest login`.
2. Check `app.json`: **`android.package` (currently `com.seiriosaster.gastos`) is permanent once you
   upload to Google Play.** Change it now if you want a different one (lowercase, dots, no spaces).
3. `npm install`, then confirm it works in Expo Go.

## Path A: share an APK today (no Google Play needed)

```bash
npx eas-cli@latest build --platform android --profile preview
```

EAS builds in the cloud (no Android Studio needed) and gives you a download link. Send the link to
friends; on Android they open it and allow "install from this source" when asked. Good for a first
look and quick feedback. It isn't listed anywhere and won't auto-update.

## Path B: Google Play internal testing (best for friends)

Internal testing has no review wait, and testers install from the real Play Store with automatic updates (up to 100 people).

1. Build the Play format (an `.aab` file):
   ```bash
   npx eas-cli@latest build --platform android --profile production
   ```
2. In the [Play Console](https://play.google.com/console): **Create app** (name **Gastos**, free,
   app, accept the declarations).
3. Finish the **Dashboard setup tasks** it lists (privacy policy URL, app access, ads: none,
   content rating questionnaire, target audience, Data safety form, store listing).
   - Data safety: Gastos collects and shares **no data**.
   - Privacy policy: host `store-assets/privacy-policy.md` somewhere public (for example GitHub Pages or a public gist) and paste the URL.
   - Store listing images are in `store-assets/` (512x512 icon, 1024x500 feature graphic). You also need at least 2 phone screenshots; take them in Expo Go on your phone.
4. **Testing → Internal testing → Create release**, upload the `.aab` (the first upload must be done by hand in the console), add release notes, roll it out.
5. **Testers** tab: create an email list with your friends' Google accounts, then copy the
   **opt-in link** and send it to them.
6. Later updates: `npx eas-cli@latest submit --platform android --latest` once Google Play access
   is set up for EAS (service account key; EAS walks you through it), or upload the new `.aab` by hand.

## Path C: public on the Play Store

Personal developer accounts created recently must first run a **closed test with at least 12
testers who stay opted in for 14 days**, then apply for production access in the console. Plan for
a couple of weeks. Your Play Console dashboard shows the exact current requirements. You may
also be asked to verify your identity first.

## Updating the app later

- Bump `"version"` in `app.json` for user-visible versions (EAS auto-increments the Android build number for `production` builds).
- If you change the database layout, follow the migration notes in `README.md`.
