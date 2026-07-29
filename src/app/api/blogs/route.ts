import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, orderBy } from "firebase/firestore";
import { isAuthenticated } from "@/lib/auth";
import type { Blog } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

// GET /api/blogs — public: published only; admin: all blogs
export async function GET(req: NextRequest) {
  try {
    const authed = await isAuthenticated();
    const showAll = req.nextUrl.searchParams.get("all") === "true" && authed;

    // Fetch all blogs sorted by createdAt (avoids needing a composite index)
    const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const allBlogs: Blog[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Blog[];

    const blogs = showAll ? allBlogs : allBlogs.filter((b) => b.status === "published");

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
    const { title, blocks, status } = body;

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
    const blogData = {
      title,
      blocks: processedBlocks,
      status: status || "draft",
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, "blogs"), blogData);

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
