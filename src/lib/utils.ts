import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { GPT_RESP_STYLE_NAME, HashmindAIResponseAction } from "@/types";
import { GPT_RESP_STYLE } from "@/data/gpt";

dayjs.extend(relativeTime);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getGptStyle = (name: GPT_RESP_STYLE_NAME) => {
  const styles = GPT_RESP_STYLE.find((style) => style.name === name);
  return styles;
};

export const logout = () => {
  localStorage.clear();
  window.location.href = "/";
};

export function handleBlobToBase64(blob: Blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64String = reader.result;
      resolve(base64String);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read the Blob as base64."));
    };

    reader.readAsDataURL(blob);
  });
}

export function audioBase64ToBlob(audioContent: string) {
  const binaryAudioData = atob(audioContent);
  const arrayBuffer = new Uint8Array(binaryAudioData.length);
  for (let i = 0; i < binaryAudioData.length; i++) {
    arrayBuffer[i] = binaryAudioData.charCodeAt(i);
  }
  const audioBlob = new Blob([arrayBuffer], { type: "audio/mpeg" });
  const audioUrl = URL.createObjectURL(audioBlob);
  return audioUrl;
}

export function retrieveAudioByAction(action: HashmindAIResponseAction) {
  if (["ARTICLE_DELETION_QUEUED", "ARTICLE_CREATION_QUEUED"].includes(action)) {
    return `/audio/response/api-resp/art-queued.mp3`;
  }
  if (action === "ARTICLE_TITLE_NOT_PROVIDED") {
    return `/audio/response/api-resp/title-missing.mp3`;
  }
  if (action === "DELETE_ARTICLE_REQUESTED") {
    return `/audio/response/api-resp/delete-art.mp3`;
  }
  if (action === "ARTICLE_DELETING_TITLE_NOTFOUND") {
    return `/audio/response/api-resp/art-title-notfound.mp3`;
  }
  return null;
}


export function removeLeadingTrailingBackticks(inputString: string) {
    // Remove leading backticks
    let result = inputString.replace(/^`+/g, '');

    // Remove trailing backticks
    result = result.replace(/`+$/g, '').replace(/markdown+/g, '');

    return result;
}