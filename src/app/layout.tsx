import type { Metadata } from "next";
import { Inter, Playfair_Display, Poppins } from "next/font/google";
import Footer from "@/components/Footer";
import { themeInitScript } from "@/components/blog/ThemeToggle";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Prajwol Subedi - AI Engineer",
  description:
    "Portfolio of Prajwol Subedi, Software Engineer building AI products, automation, and clean user experiences.",
  openGraph: {
    title: "Prajwol Subedi - Software Engineer",
    description:
      "Portfolio of Prajwol Subedi, Software Engineer building AI products, automation, and clean user experiences.",
    url: "https://www.prajwolsubedi.com.np/",
    siteName: "Prajwol Subedi",
    images: [
      {
        url: "/avatar-christmas.png",
        width: 512,
        height: 512,
        alt: "Prajwol Subedi avatar",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prajwol Subedi - Software Engineer",
    description:
      "Portfolio of Prajwol Subedi, Software Engineer building AI products, automation, and clean user experiences.",
    images: ["/avatar-christmas.png"],
  },
  icons: {
    icon: [
      // { url: "/favicon.ico", sizes: "any" },
      { url: "/avatar-christmas.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/avatar-christmas.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // The blocking theme-init script (below) sets data-blog-theme on this
      // element before React hydrates, so the DOM has an attribute the SSR
      // HTML never had. That mismatch is expected and intentional here — the
      // whole point of the script is to avoid a flash of the wrong theme — so
      // it's suppressed rather than "fixed" by rendering the attribute
      // server-side, which would require knowing the visitor's stored
      // preference during SSR.
      suppressHydrationWarning
    >
      <body
        className={`${inter.variable} ${playfair.variable} ${poppins.variable} antialiased font-sans bg-[var(--bg-color)] text-[var(--text-main)]`}
      >
        {/* Must be parser-blocking and ahead of any content: the blog pages are
            server-rendered, so their theme has to be settled before first paint.
            Lives in the root layout rather than the blog one so it has also run
            by the time a client-side navigation reaches /blogs. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
