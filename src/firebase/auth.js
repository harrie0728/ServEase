import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./config";

export async function signUpWithFirebase({ email, password }) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);

  await setDoc(doc(db, "users", credential.user.uid), {
    email: credential.user.email,
    role: "customer",
    serviceTypes: [],
    displayName: "",
    bio: "",
    skills: "",
    strengths: "",
    photoURL: "",
    createdAt: serverTimestamp()
  });

  return credential.user;
}

export async function signInWithFirebase({ email, password }) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function signOutFromFirebase() {
  await signOut(auth);
}
