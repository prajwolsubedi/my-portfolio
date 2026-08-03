/**
 * Image delivery helpers.
 *
 * Blog images are uploaded straight to Cloudinary, which means they're served
 * back at whatever size and format they were uploaded in — frequently a 3–4 MB
 * phone photo for a column that is at most ~1600px wide. Cloudinary can resize
 * and re-encode on the fly from the URL alone, so rewriting the URL at render
 * time is enough: no re-upload, no stored dimensions, no build step.
 *
 *   f_auto  negotiate AVIF/WebP from the request's Accept header
 *   q_auto  pick a quality level from the image's own content
 *   w_<n>   cap the delivered width
 */

/** Widths offered to the browser, matched to the blog column's breakpoints. */
const SRCSET_WIDTHS = [640, 960, 1280, 1600, 2000];

/** Layout width of the blog column, for browsers picking from the srcset. */
export const BLOG_IMAGE_SIZES = "(max-width: 900px) 92vw, 1600px";

const CLOUDINARY_IMAGE_UPLOAD = "/image/upload/";

function isCloudinaryImage(url: string): boolean {
  return url.startsWith("https://res.cloudinary.com/") && url.includes(CLOUDINARY_IMAGE_UPLOAD);
}

function withTransform(url: string, width: number): string {
  return url.replace(
    CLOUDINARY_IMAGE_UPLOAD,
    `${CLOUDINARY_IMAGE_UPLOAD}f_auto,q_auto,w_${width}/`
  );
}

/** A sensible single URL, for `src`. Non-Cloudinary URLs pass through. */
export function optimizedImageUrl(url: string): string {
  return isCloudinaryImage(url) ? withTransform(url, 1600) : url;
}

/**
 * A `srcset` so phones fetch a phone-sized image. Returns undefined for URLs
 * we can't transform, which leaves `src` to do the work on its own.
 */
export function imageSrcSet(url: string): string | undefined {
  if (!isCloudinaryImage(url)) return undefined;
  return SRCSET_WIDTHS.map((w) => `${withTransform(url, w)} ${w}w`).join(", ");
}
