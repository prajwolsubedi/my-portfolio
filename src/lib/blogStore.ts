import type { Blog, BlogBlock } from "./types";

/**
 * Server-side reads of the `blogs` collection.
 *
 * These go over the Firestore REST API rather than the `firebase/firestore`
 * client SDK, for two reasons:
 *
 *  1. The SDK opens a WebChannel/gRPC connection and carries a large amount of
 *     realtime-listener machinery none of the read paths use. On a serverless
 *     platform that cost is paid on every cold start.
 *  2. REST goes through `fetch`, so results land in the Next Data Cache. The
 *     list is read once and then served from cache until a write invalidates
 *     it — most visitors never wait on Firestore at all.
 *
 * Reads are unauthenticated, exactly as the client SDK calls were, so the
 * Firestore security rules that already govern this collection still apply.
 * Writes stay on the SDK (see the API routes) — they're rare and authenticated.
 *
 * Server-only: importing this from a client component would leak the requests
 * into the browser bundle.
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const DOCUMENTS_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** Every cached blog read carries this, so one write can drop all of them. */
export const BLOGS_TAG = "blogs";

/** Per-post tag, so editing one post doesn't re-fetch the others. */
export function blogTag(id: string): string {
  return `blog:${id}`;
}

/**
 * Backstop only. Writes call `revalidateTag`, so cached data is already fresh
 * the moment a post changes; this just bounds staleness if the collection is
 * ever edited outside the app (straight from the Firebase console, say).
 */
const REVALIDATE_SECONDS = 3600;

/** Fields the list views actually render — notably *not* `blocks`. */
const SUMMARY_FIELDS = [
  "title",
  "status",
  "category",
  "visibility",
  "period",
  "createdAt",
  "updatedAt",
] as const;

/** Firestore caps `pageSize` at 300; loop rather than silently truncating. */
const PAGE_SIZE = 300;
const MAX_PAGES = 20;

export type BlogSummary = Omit<Blog, "blocks">;

/* ── Firestore REST wire format ──────────────────────────────────────────── */

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

type FirestoreValue = Record<string, unknown>;

function decodeValue(value: FirestoreValue): unknown {
  if ("stringValue" in value) return value.stringValue;
  // Firestore sends 64-bit ints as strings to survive JSON.
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return new Date(value.timestampValue as string).getTime();
  if ("arrayValue" in value) {
    const values = (value.arrayValue as { values?: FirestoreValue[] })?.values ?? [];
    return values.map(decodeValue);
  }
  if ("mapValue" in value) {
    const fields = (value.mapValue as { fields?: Record<string, FirestoreValue> })?.fields ?? {};
    return decodeFields(fields);
  }
  return undefined;
}

function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    const decoded = decodeValue(value);
    if (decoded !== undefined) out[key] = decoded;
  }
  return out;
}

function decodeDocument(doc: FirestoreDocument): Record<string, unknown> {
  return {
    id: doc.name.split("/").pop(),
    ...decodeFields(doc.fields ?? {}),
  };
}

/* ── Reads ───────────────────────────────────────────────────────────────── */

/** Every blog, newest first. `fields` restricts what Firestore sends back. */
async function listBlogDocuments(
  fields?: readonly string[]
): Promise<Record<string, unknown>[]> {
  if (!PROJECT_ID) {
    console.error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set; cannot read blogs");
    return [];
  }

  const documents: Record<string, unknown>[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      pageSize: String(PAGE_SIZE),
      orderBy: "createdAt desc",
    });
    for (const field of fields ?? []) params.append("mask.fieldPaths", field);
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${DOCUMENTS_URL}/blogs?${params}`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: [BLOGS_TAG] },
    });

    if (!res.ok) {
      console.error(`Firestore list failed: ${res.status} ${await res.text()}`);
      // Partial beats blank: earlier pages hold the newest posts.
      return documents;
    }

    const body = (await res.json()) as {
      documents?: FirestoreDocument[];
      nextPageToken?: string;
    };

    for (const doc of body.documents ?? []) documents.push(decodeDocument(doc));

    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }

  return documents;
}

/**
 * Every blog, newest first, without block content.
 *
 * The list pages render a title and a date; pulling `blocks` too would mean
 * shipping every post's full text — and every habit grid, which is the largest
 * field in the collection — to render a page that shows none of it.
 */
export async function listBlogSummaries(): Promise<BlogSummary[]> {
  return (await listBlogDocuments(SUMMARY_FIELDS)) as unknown as BlogSummary[];
}

/** Every blog with its blocks. Only the admin dashboard needs this much. */
export async function listBlogs(): Promise<Blog[]> {
  const documents = (await listBlogDocuments()) as unknown as Blog[];
  for (const blog of documents) {
    if (!Array.isArray(blog.blocks)) blog.blocks = [] as BlogBlock[];
  }
  return documents;
}

/** One post with its blocks, or null if it doesn't exist. */
export async function getBlog(id: string): Promise<Blog | null> {
  if (!PROJECT_ID) {
    console.error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set; cannot read blog");
    return null;
  }

  // `id` lands in a path segment, so anything with a slash would reach for
  // another collection entirely.
  if (!id || id.includes("/")) return null;

  const res = await fetch(`${DOCUMENTS_URL}/blogs/${encodeURIComponent(id)}`, {
    next: { revalidate: REVALIDATE_SECONDS, tags: [BLOGS_TAG, blogTag(id)] },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    console.error(`Firestore get failed: ${res.status} ${await res.text()}`);
    return null;
  }

  const doc = (await res.json()) as FirestoreDocument;
  const blog = decodeDocument(doc) as unknown as Blog;

  // A post saved before a schema change, or one whose blocks field was cleared,
  // shouldn't take the render down.
  if (!Array.isArray(blog.blocks)) blog.blocks = [] as BlogBlock[];

  return blog;
}
