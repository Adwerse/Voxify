import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { ensureDemoResponsesSeeded } from "@/lib/demoSeed";

import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import styles from "./layout.module.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voxify | Youth Voice Aggregator",
  description:
    "Turn student feedback into structured, equitable, and actionable intelligence — across four stages: Collect, Analyse, Act, and Close the Loop.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  ensureDemoResponsesSeeded();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <nav className={styles.nav}>
          <Link className={styles.navBrand} href="/">
            Voxify
          </Link>
          <div className={styles.navLinks}>
            <Link className={styles.navLink} href="/">
              Student View
            </Link>
            <Link className={styles.navLink} href="/organiser">
              Organiser Dashboard
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
