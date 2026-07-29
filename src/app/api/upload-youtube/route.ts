import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { uploadYoutubeVideo } from "@/lib/youtube";

export async function POST(req: NextRequest) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string | null)?.trim() || "Blog video";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Use MP4, WebM, or MOV." },
        { status: 400 }
      );
    }

    // Same ceiling as the existing Cloudinary video upload route.
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Max 100MB." }, { status: 400 });
    }

    const videoId = await uploadYoutubeVideo(file, title);

    return NextResponse.json({ videoId });
  } catch (error) {
    console.error("Error uploading to YouTube:", error);
    const message = error instanceof Error ? error.message : "Failed to upload video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
