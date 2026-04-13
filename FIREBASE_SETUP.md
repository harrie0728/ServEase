# Firebase Setup For ServEase

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Firebase project

1. Go to `https://console.firebase.google.com/`
2. Click `Create a project`
3. Give it a name like `ServEase`
4. Continue with the default options

## 3. Add a Web app to Firebase

1. Inside your Firebase project, click the `</>` web icon
2. Name it something like `ServEase Expo`
3. Click `Register app`
4. Copy the Firebase config values

## 4. Paste your config

Open `src/firebase/config.js` and replace these placeholder values:

- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

## 5. Enable Authentication

1. In Firebase Console, open `Build` -> `Authentication`
2. Click `Get started`
3. Enable `Email/Password`

## 6. Enable Firestore Database

1. In Firebase Console, open `Build` -> `Firestore Database`
2. Click `Create database`
3. Start in test mode for now
4. Choose a region near you

## 7. Run the app

```bash
npm install
npx expo start --tunnel -c
```

## What works after setup

- Sign up creates a Firebase Authentication user
- Sign up also creates a `users/{uid}` document in Firestore
- Sign in checks the email and password using Firebase Auth

## Beginner note

If Firebase gives an error after you paste your config, send me:

- a screenshot of your Firebase Authentication page
- a screenshot of your Firestore page
- the terminal error text
