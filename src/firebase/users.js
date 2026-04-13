import { arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { db } from "./config";

export const SPECIAL_WORKER_UID = "ULSsVXWByMMQXfguxMfH10aMcdS2";
export const SPECIAL_WORKER_EMAIL = "kimvalo28@gmail.com";

export async function ensureUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  const baseProfile = snapshot.exists() ? snapshot.data() : {};
  const isSpecialWorker = user.uid === SPECIAL_WORKER_UID || user.email === SPECIAL_WORKER_EMAIL;

  const nextProfile = {
    email: user.email || baseProfile.email || "",
    role: isSpecialWorker ? "provider" : baseProfile.role || "customer",
    serviceType: isSpecialWorker ? "plumbing" : baseProfile.serviceType || null,
    serviceTypes: isSpecialWorker ? ["plumbing"] : baseProfile.serviceTypes || [],
    displayName: isSpecialWorker ? baseProfile.displayName || "Harrie Abel" : baseProfile.displayName || "",
    bio: baseProfile.bio || "",
    skills: baseProfile.skills || "",
    strengths: baseProfile.strengths || "",
    photoURL: baseProfile.photoURL || "",
    updatedAt: serverTimestamp()
  };

  if (!snapshot.exists()) {
    nextProfile.createdAt = serverTimestamp();
  }

  await setDoc(userRef, nextProfile, { merge: true });

  return {
    ...baseProfile,
    ...nextProfile,
    uid: user.uid
  };
}

export async function getProvidersByService(serviceType) {
  const providersQuery = query(
    collection(db, "users"),
    where("role", "==", "provider"),
    where("serviceTypes", "array-contains", serviceType)
  );

  const snapshot = await getDocs(providersQuery);

  return snapshot.docs.map((item) => {
    const data = item.data();

    return {
      uid: item.id,
      email: data.email || "",
      name: data.displayName || data.fullName || data.email || "Service Provider",
      reviewsName: "M******",
      role: data.role,
      serviceType: data.serviceType,
      serviceTypes: data.serviceTypes || [],
      bio: data.bio || "",
      skills: data.skills || "",
      strengths: data.strengths || "",
      photoURL: data.photoURL || "",
      averageRating: data.averageRating || 0,
      reviewsCount: data.reviewsCount || 0
    };
  });
}

export async function updateUserProfile(userId, payload) {
  await updateDoc(doc(db, "users", userId), {
    ...payload,
    updatedAt: serverTimestamp()
  });
}

export async function addWorkerService(userId, serviceType) {
  await updateDoc(doc(db, "users", userId), {
    role: "provider",
    serviceTypes: arrayUnion(serviceType),
    updatedAt: serverTimestamp()
  });
}

export async function addReviewToProvider(userId, rating) {
  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);
  const data = snapshot.data() || {};
  const currentCount = data.reviewsCount || 0;
  const currentAverage = data.averageRating || 0;
  const nextCount = currentCount + 1;
  const nextAverage = ((currentAverage * currentCount) + rating) / nextCount;

  await updateDoc(userRef, {
    averageRating: Number(nextAverage.toFixed(2)),
    reviewsCount: nextCount,
    updatedAt: serverTimestamp()
  });
}

export async function deleteUserAccount(user) {
  await deleteDoc(doc(db, "users", user.uid));
  await deleteUser(user);
}
