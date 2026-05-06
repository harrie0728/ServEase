import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { storage } from "./config";

const MAX_INLINE_PROOF_WIDTH = 300;
const MAX_INLINE_PROOF_QUALITY = 0.12;
const MAX_INLINE_PROFILE_WIDTH = 320;
const MAX_INLINE_PROFILE_QUALITY = 0.18;

function stripDataUrlPrefix(value) {
  if (typeof value !== "string") return null;
  const parts = value.split(",");
  return parts.length > 1 ? parts[1] : value;
}

async function getBase64FromUri(uri) {
  if (!uri) return null;
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64
  });
}

async function getUploadSource(source) {
  if (typeof source === "string") {
    return {
      base64: stripDataUrlPrefix(source),
      mimeType: "image/jpeg"
    };
  }

  const inlineBase64 = stripDataUrlPrefix(source?.base64);
  if (inlineBase64) {
    return {
      base64: inlineBase64,
      mimeType: source?.mimeType || "image/jpeg"
    };
  }

  return {
    base64: await getBase64FromUri(source?.uri),
    mimeType: source?.mimeType || "image/jpeg"
  };
}

export async function getInlineImageData(source) {
  const sourceUri = typeof source === "string" ? source : source?.uri;
  let normalizedSource = source;

  if (sourceUri) {
    const manipulated = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: MAX_INLINE_PROOF_WIDTH } }],
      {
        compress: MAX_INLINE_PROOF_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true
      }
    );

    normalizedSource = {
      uri: manipulated.uri,
      base64: manipulated.base64,
      mimeType: "image/jpeg"
    };
  }

  const { base64, mimeType } = await getUploadSource(normalizedSource);

  if (!base64) {
    throw new Error("Selected image does not include base64 data.");
  }

  return `data:${mimeType};base64,${base64}`;
}

export async function getInlineProfileImageData(source) {
  const sourceUri = typeof source === "string" ? source : source?.uri;
  let normalizedSource = source;

  if (sourceUri) {
    const manipulated = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: MAX_INLINE_PROFILE_WIDTH } }],
      {
        compress: MAX_INLINE_PROFILE_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true
      }
    );

    normalizedSource = {
      uri: manipulated.uri,
      base64: manipulated.base64,
      mimeType: "image/jpeg"
    };
  }

  const { base64, mimeType } = await getUploadSource(normalizedSource);

  if (!base64) {
    throw new Error("Selected image does not include base64 data.");
  }

  return `data:${mimeType};base64,${base64}`;
}

async function uploadImageToStorage(path, source) {
  const { base64, mimeType } = await getUploadSource(source);
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
  const { base64, mimeType } = await getUploadSource(source);
  const fileRef = ref(storage, `proof-of-service/${requestId}-${Date.now()}.jpg`);

  if (!base64) {
    throw new Error("Selected image does not include base64 data.");
  }

  await uploadString(fileRef, base64, "base64", {
    contentType: mimeType
  });
  return await getDownloadURL(fileRef);
}
