import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { isAuthenticated } from "@/lib/auth";
import { BLOGS_TAG, blogTag, getBlog } from "@/lib/blogStore";
import { isVisibleToPublic, parsePeriodKey } from "@/lib/blogUtils";

/** Both caches a write touches: the post itself, and every list it appears in. */
function revalidateBlog(id: string) {
  // "max" purges outright rather than letting a stale copy be served on; the
  // author has just made the edit and expects to see it.
  revalidateTag(blogTag(id), "max");
  revalidateTag(BLOGS_TAG, "max");
}

// GET /api/blogs/[id] — get a single blog
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blog = await getBlog(id);

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    // If blog is not visible to the public, only admins can view
    const authed = await isAuthenticated();
    if (!isVisibleToPublic(blog) && !authed) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    return NextResponse.json({ blog });
  } catch (error) {
    console.error("Error fetching blog:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog" },
      { status: 500 }
    );
  }
}

// PUT /api/blogs/[id] — update a blog (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, blocks, status, category, visibility, period } = body;

    const updateData: Record<string, unknown> = { updatedAt: Date.now() };
    if (title !== undefined) updateData.title = title;
    if (blocks !== undefined) updateData.blocks = blocks;
    if (status !== undefined) updateData.status = status;
    if (category !== undefined) updateData.category = category;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (parsePeriodKey(period)) updateData.period = period;

    const docRef = doc(db, "blogs", id);
    await updateDoc(docRef, updateData);

    revalidateBlog(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating blog:", error);
    return NextResponse.json(
      { error: "Failed to update blog" },
      { status: 500 }
    );
  }
}

// DELETE /api/blogs/[id] — delete a blog (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const docRef = doc(db, "blogs", id);
    await deleteDoc(docRef);

    revalidateBlog(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting blog:", error);
    return NextResponse.json(
      { error: "Failed to delete blog" },
      { status: 500 }
    );
  }
}
