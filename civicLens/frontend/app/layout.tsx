import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import { ToastProvider } from "@/lib/toast";

import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-body",
});

const headingFont = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Voxify",
  description: "Civic feedback platform for councils and students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${headingFont.variable} bg-white text-zinc-900 antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
