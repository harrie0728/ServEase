import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "./config";

export async function createNotification({
  userId,
  title,
  body,
  type = "general",
  requestId = "",
  metadata = {}
}) {
  if (!userId || !title || !body) return;

  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      title,
      body,
      type,
      requestId,
      metadata,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.log("Notification write skipped:", error?.message || error);
  }
}

export async function getNotificationsForUser(userId) {
  if (!userId) return [];

  const snapshot = await getDocs(query(collection(db, "notifications"), where("userId", "==", userId)));

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

export async function markNotificationsRead(notificationIds = []) {
  if (!notificationIds.length) return;

  const batch = writeBatch(db);
  notificationIds.forEach((notificationId) => {
    batch.update(doc(db, "notifications", notificationId), {
      read: true
    });
  });

  await batch.commit();
}

export async function markAllNotificationsReadForUser(userId) {
  if (!userId) return;
  const items = await getNotificationsForUser(userId);
  const unreadIds = items.filter((item) => !item.read).map((item) => item.id);
  await markNotificationsRead(unreadIds);
}
