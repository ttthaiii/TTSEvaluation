// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link"; // อย่าลืม import Link
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบประเมินพนักงาน 2025",
  description: "Employee Evaluation System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f5f5f5]`}
      >
        {/* --- ส่วน Navbar (เพิ่มใหม่) --- */}
        <nav className="bg-[#5d4037] text-white p-4 shadow-md">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <Link href="/" className="font-bold text-xl hover:text-gray-200">
              🏠 ระบบประเมิน
            </Link>
            <div className="space-x-4">
              <Link href="/employees" className="hover:text-[#ffccbc] transition">
                รายชื่อพนักงาน
              </Link>
              <Link href="/admin/scoring" className="hover:text-[#ffccbc] transition">
                  ตั้งค่าเกณฑ์
              </Link>              
              <Link href="/evaluations" className="bg-[#ff5722] px-4 py-2 rounded hover:bg-[#f4511e] transition">
                ทำแบบประเมิน
              </Link>
            </div>
          </div>
        </nav>
        {/* ----------------------------- */}

        {children}
      </body>
    </html>
  );
}