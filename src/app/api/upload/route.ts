import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { isAuthenticated } from "@/lib/auth";

function generateSignature(params: Record<string, string>, apiSecret: string): string {
  const sortedKeys = Object.keys(params).sort();
  const toSign = sortedKeys.map((k) => `${k}=${params[k]}`).join("&") + apiSecret;
  return createHash("sha1").update(toSign).digest("hex");
}

function parseCloudinaryUrl(url: string) {
  const match = url.match(/^cloudinary:\/\/(\w+):([^@]+)@(.+)$/);
  if (!match) return null;
  return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
}

export async function POST(req: NextRequest) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Use JPEG, PNG, GIF, WebP, MP4, or WebM." },
        { status: 400 }
      );
    }

    // Max 10MB for images, 100MB for videos
    const maxSize = file.type.startsWith("video/") ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max ${file.type.startsWith("video/") ? "100MB" : "10MB"}.` },
        { status: 400 }
      );
    }

    const cloudUrl = process.env.CLOUDINARY_URL;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (!cloudUrl && (!cloudName || !uploadPreset)) {
      return NextResponse.json(
        { error: "Cloudinary not configured" },
        { status: 500 }
      );
    }

    const resourceType = file.type.startsWith("video/") ? "video" : "image";

    // Try signed upload with CLOUDINARY_URL first
    if (cloudUrl) {
      const parsed = parseCloudinaryUrl(cloudUrl);
      if (!parsed) {
        return NextResponse.json({ error: "Invalid CLOUDINARY_URL" }, { status: 500 });
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const params: Record<string, string> = { timestamp };
      const signature = generateSignature(params, parsed.apiSecret);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${parsed.cloudName}/${resourceType}/upload`;

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("api_key", parsed.apiKey);
      uploadFormData.append("timestamp", timestamp);
      uploadFormData.append("signature", signature);

      const cloudRes = await fetch(cloudinaryUrl, {
        method: "POST",
        body: uploadFormData,
      });

      if (!cloudRes.ok) {
        const errorData = await cloudRes.json();
        console.error("Cloudinary error:", errorData);
        return NextResponse.json(
          { error: "Upload to Cloudinary failed" },
          { status: 500 }
        );
      }

      const cloudData = await cloudRes.json();
      return NextResponse.json({ url: cloudData.secure_url });
    }

    // Fallback to unsigned upload with preset
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("upload_preset", uploadPreset!);

    const cloudRes = await fetch(cloudinaryUrl, {
      method: "POST",
      body: uploadFormData,
    });

    if (!cloudRes.ok) {
      const errorData = await cloudRes.json();
      console.error("Cloudinary error:", errorData);
      return NextResponse.json(
        { error: "Upload to Cloudinary failed" },
        { status: 500 }
      );
    }

    const cloudData = await cloudRes.json();
    return NextResponse.json({ url: cloudData.secure_url });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
