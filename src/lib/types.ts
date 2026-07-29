export interface BlogBlock {
  id: string;
  type: "text" | "image" | "video";
  content: string; // text content, or URL for image/video
  caption?: string; // optional caption for images/videos
}

export interface Blog {
  id: string;
  title: string;
  blocks: BlogBlock[];
  status: "published" | "archived" | "draft";
  createdAt: number;
  updatedAt: number;
}
