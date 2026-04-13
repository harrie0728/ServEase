# ServEase UI Prototype

This is a first-pass Expo React Native UI prototype for the ServEase Android app.

## Included screens

- Start-up screen
- Sign-in screen
- Sign-up screen
- Dashboard with location access modal
- Dashboard default state
- Dashboard notification muted state

## Run locally

```bash
npm install
npm run start
```

For Expo Go on your phone:

```bash
npm run start:tunnel
```

Then open the **Expo Go** app on Android and scan the QR code from the terminal/browser.

To run on Android:

```bash
npm run android
```

## Notes

- The app currently focuses on UI only.
- Navigation is handled with simple local state so the screen sequence matches the provided reference quickly.
- Remote placeholder images are used for the dashboard hero and featured service banner.
- `npm run android` needs either a physical Android device connected by USB with debugging enabled, or an emulator.
- If your laptop is too slow for Android Studio, use Expo Go instead with `npm run start:tunnel`.
- If Expo Go says the project is incompatible, make sure the project SDK matches the Expo Go version, then reinstall dependencies and restart Expo.
