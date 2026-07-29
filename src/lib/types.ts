export interface BlogBlock {
  id: string;
  type: "text" | "image" | "video" | "youtube";
  content: string; // text content, URL for image/video, or video ID for youtube
  caption?: string; // optional caption for images/videos/youtube
}

export interface Blog {
  id: string;
  title: string;
  blocks: BlogBlock[];
  status: "published" | "archived" | "draft";
  category?: "daily" | "monthly";
  visibility?: "public" | "private";
  createdAt: number;
  updatedAt: number;
}
