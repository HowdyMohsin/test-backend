import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuickImgConvert — Admin",
  description: "Backend control panel for QuickImgConvert v2.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
