// src/app/layout.tsx
import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
  variable: "--font-ibm-thai",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "ระบบประเมินพนักงาน 2025",
  description: "Employee Evaluation System",
};

import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ibmPlexSansThai.variable} font-sans antialiased bg-[#fafafa] text-slate-900`}
      >
        <Providers>
          <Navbar />

          {/* Spacer for Fixed Navbar */}
          <div className="h-16"></div>

          <main className="min-h-[calc(100vh-4rem)]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}