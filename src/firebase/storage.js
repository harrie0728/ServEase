import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { storage } from "./config";

function getUploadSource(source) {
  if (typeof source === "string") {
    return {
      base64: null,
      mimeType: "image/jpeg"
    };
  }

  return {
    base64: source?.base64 || null,
    mimeType: source?.mimeType || "image/jpeg"
  };
}

async function uploadImageToStorage(path, source) {
  const { base64, mimeType } = getUploadSource(source);
  const fileRef = ref(storage, `${path}-${Date.now()}.jpg`);

  if (!base64) {
    throw new Error("Selected image does not include base64 data.");
  }

  await uploadString(fileRef, base64, "base64", {
    contentType: mimeType
  });
  return await getDownloadURL(fileRef);
}

export async function uploadProfilePhoto(userId, source) {
  return await uploadImageToStorage(`profile-photos/${userId}`, source);
}

export async function uploadProofPhoto(requestId, source) {
  const { base64, mimeType } = getUploadSource(source);
  const fileRef = ref(storage, `proof-of-service/${requestId}-${Date.now()}.jpg`);

  if (!base64) {
    throw new Error("Selected image does not include base64 data.");
  }

  await uploadString(fileRef, base64, "base64", {
    contentType: mimeType
  });
  return await getDownloadURL(fileRef);
}
