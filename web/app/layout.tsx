import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://quickimgconvert.com"),
  title: {
    default: "Quick Image Convert — Convert Images, Audio & Video Online, Free",
    template: "%s | Quick Image Convert",
  },
  description:
    "Convert images, audio and video between every supported format pair, free. Server-side conversion, no signup, no watermark. Files deleted after 1 hour.",
  openGraph: {
    type: "website",
    siteName: "Quick Image Convert",
    title: "Quick Image Convert — Convert Images, Audio & Video Online, Free",
    description: "Free online file conversion. Server-side engine. No signup, no watermark.",
  },
};

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Quick Image Convert",
  url: "https://quickimgconvert.com",
};

const SITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Quick Image Convert",
  url: "https://quickimgconvert.com",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-text">
        <ThemeProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <JsonLd data={ORG_JSONLD} />
          <JsonLd data={SITE_JSONLD} />
        </ThemeProvider>
      </body>
    </html>
  );
}
