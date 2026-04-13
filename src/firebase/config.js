import { getApps, initializeApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCWazpePwbdlbHfRUqm9U75reG9zKq6MFc",
  authDomain: "servease-4cf0f.firebaseapp.com",
  projectId: "servease-4cf0f",
  storageBucket: "servease-4cf0f.firebasestorage.app",
  messagingSenderId: "661263859624",
  appId: "1:661263859624:web:7ce9fb359b07b52ac5279d"
};

const hasExistingApp = getApps().length > 0;
const app = hasExistingApp ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = hasExistingApp
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });

export const db = hasExistingApp
  ? getFirestore(app)
  : initializeFirestore(app, {
      experimentalForceLongPolling: true,
      useFetchStreams: false
    });
export const storage = getStorage(app);
