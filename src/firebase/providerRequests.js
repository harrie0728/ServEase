import { collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./config";
import { createNotification } from "./notifications";

export async function getRequestsForProvider({ userId, userEmail = "", serviceTypes = [] }) {
  const snapshot = await getDocs(query(collection(db, "requests")));
  const normalizedEmail = (userEmail || "").trim().toLowerCase();

  const requests = snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .filter((item) => {
      const assignedUid = item.providerAssignedUid || item.providerUid || "";
      const assignedEmail = (item.providerAssignedEmail || item.providerEmail || "").trim().toLowerCase();
      const serviceMatch = !serviceTypes.length || serviceTypes.includes(item.serviceKey);

      return (
        (assignedUid && assignedUid === userId) ||
        (normalizedEmail && assignedEmail === normalizedEmail) ||
        (!assignedUid && !assignedEmail && serviceMatch)
      );
    });

  const unique = new Map();
  requests.forEach((item) => {
    unique.set(item.id, item);
  });
  return Array.from(unique.values()).sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });
}

export async function updateProviderRequestStatus(requestId, status, providerInfo, extraPayload = {}) {
  const requestRef = doc(db, "requests", requestId);
  const existingRequest = (await getDoc(requestRef)).data() || {};

  await updateDoc(requestRef, {
    status,
    [`statusHistory.${status}`]: serverTimestamp(),
    providerAssignedUid: providerInfo.uid,
    providerAssignedEmail: providerInfo.email || "",
    ...extraPayload,
    updatedAt: serverTimestamp()
  });

  const notificationBodies = {
    accepted: `${existingRequest.providerName || "Your worker"} accepted your ${existingRequest.serviceLabel || "service"} request.`,
    "on-the-way": `${existingRequest.providerName || "Your worker"} is on the way for your ${existingRequest.serviceLabel || "service"} request.`,
    started: `${existingRequest.providerName || "Your worker"} has started working on your ${existingRequest.serviceLabel || "service"} request.`,
    completed: `${existingRequest.providerName || "Your worker"} marked your ${existingRequest.serviceLabel || "service"} request as completed.`,
    cancelled: `${existingRequest.providerName || "Your worker"} marked your ${existingRequest.serviceLabel || "service"} request as cancelled.`
  };

  if (existingRequest.userId && notificationBodies[status]) {
    await createNotification({
      userId: existingRequest.userId,
      title: "Request Update",
      body: notificationBodies[status],
      type: `request-${status}`,
      requestId
    });
  }
}
// ... existing updateProviderRequestStatus code ...
//   }
// }

export async function updateWorkerLocation(requestId, latitude, longitude) {
  const requestRef = doc(db, "requests", requestId);
  await updateDoc(requestRef, {
    workerLocation: {
      latitude,
      longitude,
      timestamp: serverTimestamp()
    }
  });
}
