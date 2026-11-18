import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AdminProvider } from "@/lib/auth";
import { ToastProvider } from "@/hooks/useToast";

export const metadata: Metadata = { title: "QuickImgConvert Admin", robots: { index: false, follow: false } };
const themeScript = `try{var t=localStorage.getItem('qic.theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body><AdminProvider><ToastProvider>{children}</ToastProvider></AdminProvider></body>
    </html>
  );
}
