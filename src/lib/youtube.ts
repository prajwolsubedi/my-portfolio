const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_INIT_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("YouTube is not configured. See YOUTUBE_SETUP.md.");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error_description || "Failed to refresh YouTube access token");
  }

  const data = await res.json();
  return data.access_token as string;
}

// Uploads a video to YouTube as unlisted via the resumable upload protocol
// (initiate session, then PUT the bytes) and returns the resulting video ID.
export async function uploadYoutubeVideo(file: File, title: string): Promise<string> {
  const accessToken = await getAccessToken();

  const metadata = {
    snippet: { title, categoryId: "22" },
    status: { privacyStatus: "unlisted" },
  };

  const initRes = await fetch(UPLOAD_INIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": file.type || "video/*",
      "X-Upload-Content-Length": String(file.size),
    },
    body: JSON.stringify(metadata),
  });

  if (!initRes.ok) {
    const data = await initRes.json().catch(() => ({}));
    throw new Error(data.error?.message || "Failed to start YouTube upload session");
  }

  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) {
    throw new Error("YouTube did not return an upload URL");
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "video/*" },
    body: file,
  });

  if (!uploadRes.ok) {
    const data = await uploadRes.json().catch(() => ({}));
    throw new Error(data.error?.message || "Failed to upload video to YouTube");
  }

  const data = await uploadRes.json();
  return data.id as string;
}
