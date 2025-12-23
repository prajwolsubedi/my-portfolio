import type { Metadata } from "next";
import { Inter, Playfair_Display, Poppins } from "next/font/google";
import Footer from "@/components/Footer";
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
    "Portfolio of Prajwol Subedi, AI Engineer building AI products, automation, and clean user experiences.",
  openGraph: {
    title: "Prajwol Subedi - AI Engineer",
    description:
      "Portfolio of Prajwol Subedi, AI Engineer building AI products, automation, and clean user experiences.",
    url: "https://www.prajwolsubedi.com.np/",
    siteName: "Prajwol Subedi",
    images: [
      {
        url: "/myavatar.png",
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
    title: "Prajwol Subedi - AI Engineer",
    description:
      "Portfolio of Prajwol Subedi, AI Engineer building AI products, automation, and clean user experiences.",
    images: ["/myavatar.png"],
  },
  icons: {
    icon: [
      // { url: "/favicon.ico", sizes: "any" },
      { url: "/myavatar.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/myavatar.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable} ${poppins.variable} antialiased font-sans bg-[var(--bg-color)] text-[var(--text-main)]`}
      >
        {children}
        <Footer />
      </body>
    </html>
  );
}
