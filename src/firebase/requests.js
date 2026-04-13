import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "./config";

export async function createServiceRequest({
  userId,
  userEmail,
  serviceKey,
  serviceLabel,
  provider,
  requestForm
}) {
  const payload = {
    userId,
    userEmail,
    serviceKey,
    serviceLabel,
    providerName: provider.name,
    providerUid: provider.uid || "",
    providerEmail: provider.email || "",
    providerAssignedUid: provider.uid || "",
    providerAssignedEmail: provider.email || "",
    customerName: requestForm.name.trim(),
    phoneNumber: requestForm.number.trim(),
    preferredDate: requestForm.date.trim(),
    preferredTime: requestForm.time.trim(),
    location: requestForm.location.trim(),
    landmark: requestForm.landmark.trim(),
    concern: requestForm.concern.trim(),
    status: "requested",
    statusHistory: {
      requested: serverTimestamp()
    },
    proofPhotos: [],
    reviewSubmitted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, "requests"), payload);
  return docRef.id;
}

export async function getRequestsForCustomer(userId) {
  const requestQuery = query(collection(db, "requests"), where("userId", "==", userId));
  const snapshot = await getDocs(requestQuery);

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
}

export async function getLatestOngoingRequest(userId) {
  const allRequests = await getRequestsForCustomer(userId);
  return allRequests.find((item) => ["requested", "accepted", "on-the-way", "started"].includes(item.status)) || null;
}

export async function updateCustomerRequestSchedule(requestId, payload) {
  await updateDoc(doc(db, "requests", requestId), {
    preferredDate: payload.preferredDate,
    preferredTime: payload.preferredTime,
    status: "requested",
    "statusHistory.requested": serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function cancelCustomerRequest(requestId) {
  await updateDoc(doc(db, "requests", requestId), {
    status: "cancelled",
    updatedAt: serverTimestamp()
  });
}

export async function attachProofToRequest(requestId, proofPhotos) {
  await updateDoc(doc(db, "requests", requestId), {
    proofPhotos,
    updatedAt: serverTimestamp()
  });
}

export async function saveRequestReview(requestId, payload) {
  await updateDoc(doc(db, "requests", requestId), {
    reviewSubmitted: true,
    reviewRating: payload.rating,
    reviewText: payload.reviewText,
    reviewAnonymous: payload.anonymous,
    updatedAt: serverTimestamp()
  });
}

export async function getReviewsForProvider(providerUid) {
  const reviewsQuery = query(collection(db, "requests"), where("providerUid", "==", providerUid));
  const snapshot = await getDocs(reviewsQuery);

  return snapshot.docs
    .map((item) => {
      const data = item.data();
      return {
        id: item.id,
        rating: data.reviewRating || 0,
        text: data.reviewText || "",
        anonymous: !!data.reviewAnonymous,
        reviewerName: data.reviewAnonymous ? "Anonymous" : data.customerName || "Customer",
        updatedAt: data.updatedAt || data.createdAt || null
      };
    })
    .filter((item) => item.text || item.rating > 0)
    .sort((a, b) => {
      const aTime = a.updatedAt?.seconds || 0;
      const bTime = b.updatedAt?.seconds || 0;
      return bTime - aTime;
    });
}
