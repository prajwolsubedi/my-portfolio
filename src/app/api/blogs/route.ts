import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { isAuthenticated } from "@/lib/auth";
import { BLOGS_TAG, listBlogs } from "@/lib/blogStore";
import { currentPeriodKey, isVisibleToPublic, parsePeriodKey } from "@/lib/blogUtils";
import { v4 as uuidv4 } from "uuid";

// GET /api/blogs — public: published only; admin: all blogs
export async function GET(req: NextRequest) {
  try {
    const authed = await isAuthenticated();
    const showAll = req.nextUrl.searchParams.get("all") === "true" && authed;

    // The blog pages read Firestore directly now; this endpoint is left for the
    // admin dashboard, which needs drafts and full block content to edit.
    const allBlogs = await listBlogs();
    const blogs = showAll ? allBlogs : allBlogs.filter((b) => isVisibleToPublic(b));

    return NextResponse.json({ blogs });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return NextResponse.json(
      { error: "Failed to fetch blogs" },
      { status: 500 }
    );
  }
}

// POST /api/blogs — create a new blog (admin only)
export async function POST(req: NextRequest) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, blocks, status, category, visibility, period } = body;

    if (!title || !blocks) {
      return NextResponse.json(
        { error: "Title and blocks are required" },
        { status: 400 }
      );
    }

    // Ensure each block has an ID
    const processedBlocks = blocks.map(
      (block: { id?: string; type: string; content: string; caption?: string }) => ({
        ...block,
        id: block.id || uuidv4(),
      })
    );

    const now = Date.now();
    const normalizedCategory = category === "monthly" ? "monthly" : "daily";
    const blogData = {
      title,
      blocks: processedBlocks,
      status: status || "draft",
      category: normalizedCategory,
      visibility: visibility === "private" ? "private" : "public",
      // Only monthly updates belong to a month; default to the current one.
      ...(normalizedCategory === "monthly"
        ? { period: parsePeriodKey(period) ? period : currentPeriodKey() }
        : {}),
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, "blogs"), blogData);

    // The blog pages are cached; without this a new post wouldn't appear until
    // the hourly backstop expired.
    revalidateTag(BLOGS_TAG, "max");

    return NextResponse.json({
      success: true,
      blog: { id: docRef.id, ...blogData },
    });
  } catch (error) {
    console.error("Error creating blog:", error);
    return NextResponse.json(
      { error: "Failed to create blog" },
      { status: 500 }
    );
  }
}
